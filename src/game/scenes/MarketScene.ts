import Phaser from 'phaser';
import { MarketManager, type MarketItem, type ShelfProduct } from '../../systems/economy/MarketManager';
import { AStarGrid, type Point2D } from '../../systems/navigation/AStarGrid';

const MAP_ORIGIN = 64;
// 5,5x deixa o expediente mais legível: 4 minutos simulados duram cerca de 44 s reais.
// O mesmo multiplicador é aplicado ao relógio, deslocamento e atendimento.
const SIMULATION_SPEED = 5.5;
const NPC_SCALE = 0.12;
const NPC_SPAWN = {
  minPerDay: 20,
  maxPerDay: 28,
  firstDelayMin: 2.5,
  firstDelayMax: 4.5,
  scheduleRatio: 0.78,
  retryDelay: 1.0,
} as const;
const NPC_KEYS = [
  'cliente_avental', 'cliente_executivo', 'cliente_capacete', 'cliente_azul', 'cliente_mochila',
  'entregador', 'cliente_idoso', 'cliente_bone', 'cliente_jaleco', 'cliente_oculos',
];
const ENTRANCE: Point2D = { x: 256, y: 480 };
// Três posições distintas evitam que clientes recém-criados nasçam sobrepostos.
const ENTRANCE_SPAWNS: Point2D[] = [
  { x: 224, y: 480 },
  { x: 256, y: 480 },
  { x: 288, y: 480 },
];
const CHECKOUTS = [
  // Estações alinhadas em uma área própria, com o ponto de pagamento logo à frente do balcão.
  { cashierX: 348, cashierY: 142, service: { x: 348, y: 178 } },
  { cashierX: 420, cashierY: 142, service: { x: 420, y: 178 } },
];

interface Customer {
  id: number;
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  path: Point2D[];
  pathIndex: number;
  speed: number;
  state: 'shopping' | 'queue' | 'leaving';
  interests: string[];
  interestIndex: number;
  budget: number;
  threshold: number;
  basketTotal: number;
  basketCount: number;
  laneIndex: number;
  waitTimer: number;
  serviceTimer: number;
  serviceStarted: boolean;
  arrived: boolean;
  queueSlotIndex: number;
  destination: Point2D;
  walkPhase: number;
  stuckTimer: number;
}

export class MarketScene extends Phaser.Scene {
  private readonly market: MarketManager;
  private readonly navigation = new AStarGrid();
  private readonly customers: Customer[] = [];
  private laneQueues: Customer[][] = [[]];
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private shelfGraphics!: Phaser.GameObjects.Graphics;
  private readonly shelfLockLabels: Phaser.GameObjects.Text[] = [];
  private selectedShelfId = 'arroz';
  private nextCustomerId = 1;
  private nextNpcIndex = 0;
  private spawnTimer = 0;
  private daySpawnTarget = 0;
  private daySpawned = 0;
  private uiTimer = 0;
  private readonly queueToleranceSeconds = 65;
  private readonly cashierVisuals: Phaser.GameObjects.Container[] = [];

  constructor(market: MarketManager) {
    super({ key: 'MarketScene' });
    this.market = market;
  }

  preload(): void {
    for (const key of NPC_KEYS) this.load.image(key, `/assets/npcs/${key}.png`);
    this.load.image('checkout_station', '/assets/checkout/cashier_station.png');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#24362f');
    this.drawStoreEnvironment();
    this.shelfGraphics = this.add.graphics().setDepth(2);
    this.refreshShelfGraphics();
    this.createShelfZones();
    this.selectionGraphics = this.add.graphics().setDepth(5);
    this.drawSelection();
    this.syncLanes();

    this.game.events.on('market-opened', this.onMarketOpened, this);
    this.game.events.on('restart-simulation', this.resetSimulation, this);
    this.game.events.on('shelf-upgrades-changed', () => {
      this.refreshShelfGraphics();
      this.drawSelection();
      this.game.events.emit('refresh-ui');
    });
    this.game.events.on('shelf-selected', (id: string) => {
      this.selectedShelfId = id;
      this.drawSelection();
    });
    this.game.events.emit('refresh-ui');
  }

  update(_time: number, delta: number): void {
    const realDt = Math.min(delta / 1000, 0.05);
    const simDt = realDt * SIMULATION_SPEED;
    this.syncLanes();

    if (this.market.phase === 'open') {
      this.market.elapsedSeconds += simDt;
      if (this.daySpawned < this.daySpawnTarget) {
        this.spawnTimer -= simDt;
        if (this.spawnTimer <= 0) {
          if (this.spawnCustomer()) {
            this.daySpawned += 1;
            const remaining = this.daySpawnTarget - this.daySpawned;
            this.spawnTimer = remaining > 0
              ? (this.market.dayDurationSeconds * NPC_SPAWN.scheduleRatio / this.daySpawnTarget)
                * Phaser.Math.FloatBetween(0.82, 1.18)
              : Number.POSITIVE_INFINITY;
          } else {
            // Mantém um intervalo curto entre chegadas em caso de falha momentânea.
            this.spawnTimer = NPC_SPAWN.retryDelay;
          }
        }
      }
      if (this.market.elapsedSeconds >= this.market.dayDurationSeconds) this.market.beginClosing();
    }

    this.moveCustomers(simDt);
    this.processQueues(simDt);

    if (this.market.phase === 'closing' && this.customers.length === 0) {
      this.market.finishDay();
      this.game.events.emit('refresh-ui');
    }

    this.uiTimer += realDt;
    if (this.uiTimer >= 0.35) {
      this.uiTimer = 0;
      this.game.events.emit('refresh-ui');
    }
  }

  getActiveCustomerCount(): number { return this.customers.length; }
  getQueueLength(): number { return this.laneQueues.reduce((sum, lane) => sum + lane.length, 0); }
  getDailySpawnProgress(): { spawned: number; target: number } {
    if (this.market.phase === 'preparation') return { spawned: 0, target: 0 };
    return { spawned: this.daySpawned, target: this.daySpawnTarget };
  }

  // ---------------------------------------------------------------------------
  // Mapa construído com formas independentes: paredes, piso, mobiliário e produtos
  // podem ser alterados sem editar uma imagem achatada.
  // ---------------------------------------------------------------------------

  private drawStoreEnvironment(): void {
    const g = this.add.graphics().setDepth(0);

    // Base externa e moldura verde do estabelecimento.
    this.rect(g, 5, 8, 502, 500, 0x17251f);
    this.rect(g, 9, 12, 494, 492, 0x397b36);
    this.rect(g, 14, 17, 484, 482, 0x70bf4e);
    this.rect(g, 20, 34, 472, 458, 0xd8bd98);

    // Piso quadriculado em tons quentes, com rejunte pixelado.
    for (let y = 35, row = 0; y < 492; y += 32, row += 1) {
      for (let x = 21, col = 0; x < 492; x += 32, col += 1) {
        const color = (row + col) % 2 === 0 ? 0xe8d3b5 : 0xdfc4a2;
        this.rect(g, x, y, Math.min(32, 492 - x), Math.min(32, 492 - y), color);
        this.outline(g, x, y, Math.min(32, 492 - x), Math.min(32, 492 - y), 0xc5a783, 0.72);
        this.rect(g, x + 2, y + 2, 2, 2, 0xf2e2c9, 0.65);
      }
    }

    // Paredes internas e acabamento superior.
    this.rect(g, 14, 12, 484, 23, 0x315b32);
    this.rect(g, 14, 12, 484, 6, 0x8ed35b);
    this.rect(g, 14, 18, 484, 5, 0x4b913d);
    this.rect(g, 14, 20, 13, 474, 0x2b6032);
    this.rect(g, 485, 20, 13, 474, 0x2b6032);
    this.rect(g, 14, 486, 186, 17, 0x2f6334);
    this.rect(g, 312, 486, 186, 17, 0x2f6334);
    this.rect(g, 20, 486, 180, 5, 0x7ac34c);
    this.rect(g, 312, 486, 180, 5, 0x7ac34c);

    // Entrada principal e tapete.
    this.rect(g, 204, 480, 104, 25, 0x263b2e);
    this.rect(g, 210, 484, 92, 16, 0xc58a36);
    this.rect(g, 214, 487, 84, 10, 0xf2b74e);
    this.rect(g, 222, 490, 68, 3, 0xd88e32);
    this.add.text(MAP_ORIGIN + 256, MAP_ORIGIN + 493, 'ENTRADA', {
      fontFamily: 'Arial, sans-serif', fontSize: '7px', color: '#694719', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // Setores desenhados a partir do catálogo; a parede superior permanece contínua,
    // sem porta ou identificação de STAFF.
    // As antigas marcações de piso dos caixas foram removidas para não deixar
    // sombras/retângulos na posição anterior das estações.
  }

  private drawProductShelves(g: Phaser.GameObjects.Graphics): void {
    for (const shelf of this.market.shelves) this.drawShelfFixture(g, shelf);
  }

  private refreshShelfGraphics(): void {
    this.shelfGraphics.clear();
    for (const label of this.shelfLockLabels) label.destroy();
    this.shelfLockLabels.splice(0, this.shelfLockLabels.length);

    this.drawProductShelves(this.shelfGraphics);
    for (const shelf of this.market.shelves) {
      const labels: Record<string, string> = {
        frutas: 'HORTIFRUTI',
        arroz: 'MERCEARIA\nESSENCIAL',
        higiene: 'HIGIENE E\nLIMPEZA',
        biscoitos: 'LANCHES E\nBISCOITOS',
        sucos: 'BEBIDAS',
        carne: 'MERCEARIA\nPREMIUM',
        padaria: 'PADARIA',
        iogurte: 'LATICÍNIOS',
        congelados: 'CARNES E AVES',
        sorvetes: 'SORVETERIA',
      };
      const labelText = shelf.unlocked ? labels[shelf.id] : `${labels[shelf.id]}\nBLOQUEADO`;
      // As placas ficam na faixa da parede imediatamente acima do móvel.
      // A placa de Laticínios usa o centro do próprio expositor e largura automática:
      // assim não sobra uma etiqueta solta no corredor nem ocorre corte por largura fixa.
      const isDairyLabel = shelf.id === 'iogurte';
      const labelX = shelf.id === 'congelados'
        ? shelf.rect.x + shelf.rect.width / 2 + 36
        : shelf.rect.x + shelf.rect.width / 2;
      const labelY = shelf.rect.y - (isDairyLabel ? 2 : 4);

      const label = this.add.text(
        MAP_ORIGIN + labelX,
        MAP_ORIGIN + labelY,
        labelText,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: isDairyLabel ? '6px' : '7px',
          color: shelf.unlocked ? '#fff8e8' : '#f2d6a7',
          align: 'center',
          fontStyle: 'bold',
          backgroundColor: shelf.unlocked ? '#36505a' : '#44382f',
          padding: { x: isDairyLabel ? 4 : 5, y: isDairyLabel ? 2 : 3 },
          stroke: '#1d2b2d',
          strokeThickness: 1,
          resolution: 3,
        },
      ).setOrigin(0.5, 1).setDepth(6);
      this.shelfLockLabels.push(label);
    }
  }

  private drawShelfFixture(g: Phaser.GameObjects.Graphics, shelf: ShelfProduct): void {
    const { x, y, width: w, height: h } = shelf.rect;
    if (['padaria', 'iogurte', 'congelados', 'sorvetes'].includes(shelf.id)) {
      this.drawSpecialShelfFixture(g, shelf);
      return;
    }
    const palettes: Record<string, number[]> = {
      biscoitos: [0xd39a4d, 0xc45e42, 0x6e9b57, 0xe1bd60],
      sucos: [0x4e9cb7, 0xe2a54d, 0x70a55c, 0x9a6ab2],
      frutas: [0xc64e3e, 0xe2aa3b, 0x6b9c4e, 0x83ae56],
      carne: [0x5b392c, 0x9a6a3e, 0x566f48, 0xc28b51],
      arroz: [0xe5d8b7, 0xd3b97c, 0x8fba9a, 0xc4a66d],
      higiene: [0x6b9fce, 0x82b5c8, 0xf0d9a0, 0x9b8cc5],
    };
    const colors = palettes[shelf.id] ?? palettes.biscoitos;

    this.rect(g, x - 2, y + h - 2, w + 4, 6, 0x573d2b, 0.55);
    this.rect(g, x, y, w, h, 0x543b2b);
    this.rect(g, x + 3, y + 3, w - 6, h - 6, 0xb67b42);
    this.rect(g, x + 5, y + 5, w - 10, h - 10, shelf.id === 'frutas' ? 0x60432e : 0x6b5742);

    if (!shelf.unlocked) {
      // A estrutura continua visível, mas sem produtos até a categoria ser comprada.
      this.rect(g, x + 7, y + 8, w - 14, h - 15, 0x55483c, 0.82);
      this.rect(g, x + 7, y + 8, w - 14, 3, 0xc49a64, 0.7);
      this.rect(g, x + 7, y + h - 10, w - 14, 3, 0xc49a64, 0.7);
      return;
    }

    const rowCount = h < 52 ? 2 : 3;
    const usableH = h - 14;
    for (let row = 0; row < rowCount; row += 1) {
      const rowY = y + 8 + row * (usableH / rowCount);
      this.rect(g, x + 5, rowY + usableH / rowCount - 3, w - 10, 3, 0xdda65d);
      const count = shelf.id === 'frutas' ? 8 : 10;
      for (let col = 0; col < count; col += 1) {
        const cellW = (w - 18) / count;
        const itemX = x + 8 + col * cellW;
        const color = colors[(col + row * 2) % colors.length];
        if (shelf.id === 'frutas') {
          this.rect(g, itemX + 1, rowY + 1 + (col % 2), Math.max(5, cellW - 2), Math.max(6, usableH / rowCount - 7), color);
          this.rect(g, itemX + 2, rowY + 2, 2, 2, 0xf0d18f, 0.7);
        } else {
          const itemH = Math.max(8, usableH / rowCount - 6);
          this.rect(g, itemX + 1, rowY + 1, Math.max(4, cellW - 2), itemH, color);
          this.rect(g, itemX + 2, rowY + 3, Math.max(2, cellW - 5), 2, 0xf3e7c8, 0.8);
          this.rect(g, itemX + 2, rowY + itemH - 2, Math.max(2, cellW - 5), 2, 0x41382f, 0.45);
        }
      }
    }
    this.rect(g, x + 2, y + 2, w - 4, 3, 0xf0c77f);
    this.rect(g, x + 2, y + h - 4, w - 4, 3, 0x71472e);
    this.rect(g, x + 2, y + 2, 3, h - 4, 0x71472e);
    this.rect(g, x + w - 5, y + 2, 3, h - 4, 0x71472e);
  }

  private drawSpecialShelfFixture(g: Phaser.GameObjects.Graphics, shelf: ShelfProduct): void {
    const { x, y, width: w, height: h } = shelf.rect;
    const palettes: Record<string, number[]> = {
      padaria: [0xd99a4d, 0xe8bd75, 0xc87a3d],
      iogurte: [0x70b5d6, 0xf0e6cf, 0x86bd79, 0xc77fa5],
      congelados: [0xc45b53, 0x9f3f3a, 0xe3b18c, 0x734b42],
      sorvetes: [0xf0a2b5, 0xe4c36a, 0x88b7dd, 0xb59ad8],
    };
    const palette = palettes[shelf.id] ?? palettes.padaria;
    const base = shelf.id === 'padaria' ? 0x8b512e : shelf.id === 'sorvetes' ? 0x327a9b : shelf.id === 'congelados' ? 0x6d3940 : 0x456b7b;

    // A estrutura de cada setor é desenhada novamente por cima do móvel decorativo,
    // permitindo que o setor permaneça vazio enquanto sua melhoria estiver bloqueada.
    this.rect(g, x - 1, y - 1, w + 2, h + 2, 0x263746);
    this.rect(g, x + 2, y + 2, w - 4, h - 4, base);
    this.rect(g, x + 5, y + 5, w - 10, h - 10, shelf.unlocked ? (shelf.id === 'congelados' ? 0xe6c4b3 : 0xd6e4df) : 0x4a5154);

    if (!shelf.unlocked) {
      this.rect(g, x + 5, y + 5, w - 10, h - 10, 0x303a3b, 0.9);
      this.outline(g, x + 2, y + 2, w - 4, h - 4, 0xb18b55, 0.9);
      return;
    }

    if (shelf.id === 'congelados') {
      // Seis bandejas distribuídas dentro da altura real do freezer.
      // O espaçamento proporcional evita que a última fileira ultrapasse a moldura.
      const rows = 6;
      const innerTop = y + 8;
      const innerBottom = y + h - 8;
      const rowStep = (innerBottom - innerTop) / rows;
      const productHeight = Math.min(21, rowStep - 7);
      const columnWidth = (w - 16) / 2;

      for (let row = 0; row < rows; row += 1) {
        const slotY = innerTop + row * rowStep;
        const productY = slotY + 2;
        this.rect(g, x + 6, slotY + rowStep - 3, w - 12, 2, 0x75464a);
        for (let col = 0; col < 2; col += 1) {
          const color = palette[(row + col) % palette.length];
          const itemX = x + 8 + col * columnWidth;
          this.rect(g, itemX, productY, Math.min(11, columnWidth - 2), productHeight, color);
          this.rect(g, itemX + 2, productY + 4, 4, 3, 0xf4f1e8, 0.85);
        }
      }
    } else {
      const rowCount = shelf.id === 'padaria' ? 3 : 2;
      const columns = shelf.id === 'padaria' ? 4 : shelf.id === 'sorvetes' ? 5 : 6;
      const innerW = w - 16;
      const innerH = h - 17;
      for (let row = 0; row < rowCount; row += 1) {
        const rowY = y + 8 + row * (innerH / rowCount);
        this.rect(g, x + 6, rowY + innerH / rowCount - 2, w - 12, 2, shelf.id === 'padaria' ? 0x9c6639 : 0x4e8191);
        for (let col = 0; col < columns; col += 1) {
          const cellW = innerW / columns;
          const itemX = x + 8 + col * cellW;
          const color = palette[(row * 2 + col) % palette.length];
          if (shelf.id === 'padaria') {
            this.rect(g, itemX + 1, rowY + 2, Math.max(7, cellW - 3), 7, color);
            this.rect(g, itemX + 3, rowY + 3, Math.max(3, cellW - 7), 2, 0xf4d59b, 0.8);
          } else {
            const itemH = Math.max(10, innerH / rowCount - 5);
            this.rect(g, itemX + 1, rowY + 1, Math.max(5, cellW - 2), itemH, color);
            this.rect(g, itemX + 2, rowY + 3, Math.max(2, cellW - 5), 2, 0xf6f0df, 0.85);
            if (shelf.id === 'sorvetes') this.rect(g, itemX + 2, rowY + itemH - 3, 2, 5, 0xf2e8d4);
          }
        }
      }
    }
    this.outline(g, x + 2, y + 2, w - 4, h - 4, shelf.id === 'padaria' ? 0xf1c27c : 0xa8d8df, 0.95);
  }


  private rect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
    g.fillStyle(color, alpha);
    g.fillRect(MAP_ORIGIN + x, MAP_ORIGIN + y, w, h);
  }

  private outline(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
    g.lineStyle(1, color, alpha);
    g.strokeRect(MAP_ORIGIN + x, MAP_ORIGIN + y, w, h);
  }

  private createShelfZones(): void {
    for (const shelf of this.market.shelves) {
      const { x, y, width, height } = shelf.rect;
      const zone = this.add.zone(MAP_ORIGIN + x + width / 2, MAP_ORIGIN + y + height / 2, width, height).setInteractive();
      zone.setDepth(8);
      zone.on('pointerdown', () => {
        if (this.market.phase !== 'preparation') return;
        this.selectedShelfId = shelf.id;
        this.drawSelection();
        this.game.events.emit('shelf-selected', shelf.id);
      });
    }
  }

  private drawSelection(): void {
    if (!this.selectionGraphics) return;
    this.selectionGraphics.clear();
    const shelf = this.market.getShelf(this.selectedShelfId);
    if (!shelf) return;
    this.selectionGraphics.lineStyle(3, 0xffb629, 1);
    this.selectionGraphics.strokeRect(
      MAP_ORIGIN + shelf.rect.x - 2,
      MAP_ORIGIN + shelf.rect.y - 2,
      shelf.rect.width + 4,
      shelf.rect.height + 4,
    );
    this.selectionGraphics.fillStyle(0xffb629, 0.09);
    this.selectionGraphics.fillRect(MAP_ORIGIN + shelf.rect.x, MAP_ORIGIN + shelf.rect.y, shelf.rect.width, shelf.rect.height);
  }

  // ---------------------------------------------------------------------------
  // Caixas: o modelo enviado mostra a operadora sentada atrás do balcão.
  // ---------------------------------------------------------------------------

  private createCheckoutLaneVisual(laneIndex: number): void {
    const checkout = CHECKOUTS[laneIndex];
    if (!checkout) return;
    const visual = this.add.container(0, 0).setDepth(MAP_ORIGIN + 178);
    const station = this.add.image(
      MAP_ORIGIN + checkout.cashierX,
      MAP_ORIGIN + checkout.cashierY,
      'checkout_station',
    ).setOrigin(0.5);
    // Calcula a altura pela proporção original: nunca estica o modelo enviado.
    const displayWidth = 68;
    station.setDisplaySize(displayWidth, displayWidth * station.height / station.width);
    const label = this.add.text(
      MAP_ORIGIN + checkout.cashierX,
      MAP_ORIGIN + 106,
      `CAIXA ${laneIndex + 1}`,
      {
        fontFamily: 'Arial, sans-serif', fontSize: '7px', color: '#34414b', fontStyle: 'bold',
        backgroundColor: '#fff0cd', padding: { x: 3, y: 2 },
      },
    ).setOrigin(0.5);
    visual.add([station, label]);
    this.cashierVisuals.push(visual);
  }

  private onMarketOpened(): void {
    this.daySpawnTarget = Phaser.Math.Between(NPC_SPAWN.minPerDay, NPC_SPAWN.maxPerDay);
    this.daySpawned = 0;
    this.spawnTimer = Phaser.Math.FloatBetween(NPC_SPAWN.firstDelayMin, NPC_SPAWN.firstDelayMax);
    this.market.addLog(`Meta aleatória do dia: ${this.daySpawnTarget} clientes, distribuídos ao longo do expediente.`);
  }

  private resetSimulation(): void {
    for (const customer of this.customers) customer.sprite.destroy();
    this.customers.splice(0, this.customers.length);
    this.laneQueues = [[]];
    this.spawnTimer = 0;
    this.daySpawnTarget = 0;
    this.daySpawned = 0;
    this.nextCustomerId = 1;
    this.nextNpcIndex = 0;
    this.syncLanes();
    this.selectedShelfId = 'arroz';
    this.refreshShelfGraphics();
    this.drawSelection();
    this.game.events.emit('shelf-selected', this.selectedShelfId);
    this.game.events.emit('refresh-ui');
  }

  private syncLanes(): void {
    while (this.laneQueues.length < this.market.checkoutLanes) this.laneQueues.push([]);
    while (this.cashierVisuals.length < this.market.checkoutLanes) this.createCheckoutLaneVisual(this.cashierVisuals.length);
    this.cashierVisuals.forEach((visual, index) => visual.setVisible(index < this.market.checkoutLanes));
  }

  private spawnCustomer(): boolean {
    // Os NPCs não têm colisão entre si; os três pontos só distribuem as entradas.
    const spawnPoint = ENTRANCE_SPAWNS[(this.nextCustomerId - 1) % ENTRANCE_SPAWNS.length];

    // A lista de compras é formada por produtos individuais, não apenas setores.
    const availableProducts = this.market.getAvailableItems();
    const shuffled = Phaser.Utils.Array.Shuffle([...availableProducts]);
    const interestCount = Phaser.Math.Between(3, Math.min(8, availableProducts.length));
    const interests = shuffled.slice(0, interestCount).map((product: MarketItem) => product.id);
    const key = NPC_KEYS[this.nextNpcIndex % NPC_KEYS.length];
    this.nextNpcIndex += 1;

    const sprite = this.add.image(MAP_ORIGIN + spawnPoint.x, MAP_ORIGIN + spawnPoint.y, key)
      .setOrigin(0.5, 1).setScale(NPC_SCALE).setDepth(MAP_ORIGIN + ENTRANCE.y);
    const customer: Customer = {
      id: this.nextCustomerId++, sprite, x: spawnPoint.x, y: spawnPoint.y, path: [], pathIndex: 0,
      speed: Phaser.Math.FloatBetween(22, 28), state: 'shopping', interests, interestIndex: 0,
      budget: Phaser.Math.FloatBetween(34, 92), threshold: Phaser.Math.FloatBetween(5.5, 15.5),
      basketTotal: 0, basketCount: 0, laneIndex: -1, waitTimer: 0, serviceTimer: 0,
      serviceStarted: false, arrived: false, queueSlotIndex: 0,
      destination: { ...spawnPoint }, walkPhase: 0, stuckTimer: 0,
    };
    this.customers.push(customer);
    this.moveToShelf(customer);
    return true;
  }

  private moveToShelf(customer: Customer): void {
    const productId = customer.interests[customer.interestIndex];
    const shelf = this.market.getShelfForItem(productId);
    if (!shelf || !shelf.unlocked) { this.advanceInterest(customer); return; }

    // Cada SKU possui sua própria decisão, mas o destino é uma posição livre
    // na frente do setor. Testa as três aproximações e escolhe a primeira rota válida.
    const approachOffsets = shelf.rect.width <= 50 ? [-8, 0, 8] : shelf.rect.width <= 90 ? [-12, 0, 12] : [-30, 0, 30];
    const preferred = (customer.id + customer.interestIndex) % approachOffsets.length;
    const orderedOffsets = [...approachOffsets.slice(preferred), ...approachOffsets.slice(0, preferred)];
    for (const offset of orderedOffsets) {
      if (this.setPath(customer, { x: shelf.target.x + offset, y: shelf.target.y })) return;
    }

    // Sem rota segura para este setor, pula somente este produto; não deixa o NPC preso.
    this.market.addLog(`Rota indisponível para ${shelf.name}; cliente seguiu para o próximo item.`);
    this.advanceInterest(customer);
  }

  private evaluateShelf(customer: Customer): void {
    const productId = customer.interests[customer.interestIndex];
    const product = this.market.getItem(productId);
    const shelf = this.market.getShelfForItem(productId);
    if (!product || !shelf || !shelf.unlocked) { this.advanceInterest(customer); return; }

    const utility = (product.need / Math.max(0.1, product.price)) * shelf.elasticity;
    const affordable = customer.budget >= product.price;
    const useful = utility >= customer.threshold;
    const accepted = product.stock > 0 && affordable && useful;

    if (accepted) {
      product.stock -= 1;
      customer.budget -= product.price;
      customer.basketTotal += product.price;
      customer.basketCount += 1;
      this.showReaction(customer, '✓', '#238b54');
    } else {
      const reaction = product.stock <= 0 ? 'SEM' : (!affordable ? '¤' : '×');
      this.showReaction(customer, reaction, '#d34b45');
    }
    this.advanceInterest(customer);
  }

  private advanceInterest(customer: Customer): void {
    customer.interestIndex += 1;
    if (customer.interestIndex < customer.interests.length) this.moveToShelf(customer);
    else this.goToCheckoutOrExit(customer);
  }

  private goToCheckoutOrExit(customer: Customer): void {
    if (customer.basketCount === 0) {
      this.beginLeaving(customer);
      return;
    }
    this.enqueue(customer);
  }

  private enqueue(customer: Customer): void {
    this.syncLanes();
    let selectedLane = 0;
    for (let i = 1; i < this.laneQueues.length; i += 1) {
      if (this.laneQueues[i].length < this.laneQueues[selectedLane].length) selectedLane = i;
    }
    customer.state = 'queue';
    customer.laneIndex = selectedLane;
    customer.waitTimer = 0;
    this.laneQueues[selectedLane].push(customer);
    this.repositionLane(selectedLane);
  }

  private queuePosition(laneIndex: number, index: number): Point2D {
    const checkout = CHECKOUTS[laneIndex];
    if (index === 0) return checkout.service;

    // Filas em zigue-zague no corredor livre à direita dos balcões. Todas as posições
    // ficam dentro do mapa e em células caminháveis, mesmo quando há muitos clientes.
    const rows = [230, 262, 294, 326, 358, 390, 422, 454, 486];
    const slot = index - 1;
    const row = slot % rows.length;
    const column = Math.floor(slot / rows.length);
    const columns = laneIndex === 0 ? [430, 442] : [464, 476];
    const x = columns[Math.min(column, columns.length - 1)];
    return { x, y: rows[row] };
  }

  private repositionLane(laneIndex: number): void {
    const queue = this.laneQueues[laneIndex];
    for (let index = 0; index < queue.length;) {
      const customer = queue[index];
      customer.queueSlotIndex = index;
      if (!this.setPath(customer, this.queuePosition(laneIndex, index))) {
        // Destinos de fila são pré-validados; esta proteção evita travamento caso o mapa mude.
        queue.splice(index, 1);
        this.market.registerLostCustomer();
        this.showReaction(customer, '😢', '#d34b45');
        this.beginLeaving(customer);
        continue;
      }
      index += 1;
    }
  }

  private processQueues(dt: number): void {
    for (let laneIndex = 0; laneIndex < this.laneQueues.length; laneIndex += 1) {
      const queue = this.laneQueues[laneIndex];
      for (let index = queue.length - 1; index >= 0; index -= 1) {
        const customer = queue[index];
        customer.waitTimer += dt;
        if (customer.waitTimer > this.queueToleranceSeconds && !(index === 0 && customer.serviceStarted)) {
          queue.splice(index, 1);
          this.market.registerLostCustomer();
          this.market.addLog('Um cliente desistiu após esperar muito na fila.');
          this.showReaction(customer, '😢', '#d34b45');
          this.beginLeaving(customer);
          this.repositionLane(laneIndex);
        }
      }

      const first = queue[0];
      if (!first || !first.arrived) continue;
      if (first.basketCount === 0) {
        queue.shift(); this.beginLeaving(first); this.repositionLane(laneIndex); continue;
      }
      if (!first.serviceStarted) {
        first.serviceStarted = true;
        first.serviceTimer = Math.max(1.8, first.basketCount * 1.7);
      }
      first.serviceTimer -= dt;
      if (first.serviceTimer <= 0) {
        this.market.addSale(first.basketTotal);
        this.market.addLog(`Compra finalizada: ¤ ${this.market.money(first.basketTotal)}.`);
        this.showReaction(first, '😊', '#238b54');
        queue.shift();
        this.beginLeaving(first);
        this.repositionLane(laneIndex);
      }
    }
  }

  private beginLeaving(customer: Customer): void {
    if (customer.state === 'leaving') return;
    customer.state = 'leaving'; customer.laneIndex = -1;
    if (!this.setPath(customer, ENTRANCE)) this.removeCustomer(customer);
  }

  private setPath(customer: Customer, destination: Point2D): boolean {
    const path = this.navigation.findPath({ x: customer.x, y: customer.y }, destination);
    if (!path.length) return false;
    customer.destination = { ...path[path.length - 1] };
    customer.path = path;
    customer.pathIndex = 0;
    customer.arrived = false;
    customer.stuckTimer = 0;
    return true;
  }

  private recoverStuckCustomer(customer: Customer): void {
    customer.stuckTimer = 0;
    if (customer.state === 'shopping') {
      this.market.addLog('Um cliente encontrou um corredor bloqueado e pulou para o próximo produto.');
      this.advanceInterest(customer);
      return;
    }
    if (customer.state === 'queue') {
      const laneIndex = customer.laneIndex;
      const queue = this.laneQueues[laneIndex];
      if (queue) {
        const index = queue.indexOf(customer);
        if (index >= 0) queue.splice(index, 1);
      }
      this.market.registerLostCustomer();
      this.showReaction(customer, '😢', '#d34b45');
      this.beginLeaving(customer);
      if (laneIndex >= 0) this.repositionLane(laneIndex);
      return;
    }
    this.removeCustomer(customer);
  }

  private moveCustomers(dt: number): void {
    for (const customer of [...this.customers]) {
      if (customer.pathIndex >= customer.path.length) {
        customer.walkPhase = 0;
        customer.sprite.setPosition(MAP_ORIGIN + customer.x, MAP_ORIGIN + customer.y);
        if (!customer.arrived) {
          customer.arrived = true;
          if (customer.state === 'shopping') this.evaluateShelf(customer);
          else if (customer.state === 'leaving') this.removeCustomer(customer);
        }
        continue;
      }

      let distanceLeft = customer.speed * dt;
      let movedThisFrame = 0;
      let iterations = 0;
      while (customer.pathIndex < customer.path.length && distanceLeft > 0.01 && iterations < 12) {
        iterations += 1;
        const point = customer.path[customer.pathIndex];
        const dx = point.x - customer.x;
        const dy = point.y - customer.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= 0.8) {
          customer.x = point.x;
          customer.y = point.y;
          customer.pathIndex += 1;
          continue;
        }

        const step = Math.min(distanceLeft, distance, 2.8);
        const direction = { x: dx / distance, y: dy / distance };
        const perpendicular = { x: -direction.y, y: direction.x };
        const candidates = [
          { x: customer.x + direction.x * step, y: customer.y + direction.y * step, penalty: 0 },
          { x: customer.x + (direction.x + perpendicular.x * 0.9) * step * 0.72, y: customer.y + (direction.y + perpendicular.y * 0.9) * step * 0.72, penalty: 1.4 },
          { x: customer.x + (direction.x - perpendicular.x * 0.9) * step * 0.72, y: customer.y + (direction.y - perpendicular.y * 0.9) * step * 0.72, penalty: 1.4 },
        ];

        let chosen: { x: number; y: number; score: number } | null = null;
        for (const candidate of candidates) {
          if (!this.navigation.isWalkablePoint(candidate)) continue;
          const remaining = Math.hypot(point.x - candidate.x, point.y - candidate.y);
          const score = remaining + candidate.penalty;
          if (!chosen || score < chosen.score) chosen = { ...candidate, score };
        }

        // NPCs atravessam uns aos outros; apenas obstáculos fixos do cenário bloqueiam o caminho.
        if (!chosen) {
          // Se um obstáculo fixo bloquear o próximo passo, tenta novamente no próximo frame.
          break;
        }
        const moved = Math.hypot(chosen.x - customer.x, chosen.y - customer.y);
        movedThisFrame += moved;
        customer.walkPhase += moved * 0.09;
        customer.x = chosen.x;
        customer.y = chosen.y;
        distanceLeft = Math.max(0, distanceLeft - moved);
      }

      const bounce = customer.pathIndex < customer.path.length
        ? Math.abs(Math.sin(customer.walkPhase)) * 2.2
        : 0;
      if (customer.pathIndex >= customer.path.length) customer.walkPhase = 0;
      customer.sprite.setPosition(MAP_ORIGIN + customer.x, MAP_ORIGIN + customer.y - bounce)
        .setDepth(MAP_ORIGIN + customer.y);

      if (customer.pathIndex < customer.path.length) {
        customer.stuckTimer = movedThisFrame > 0.05 ? 0 : customer.stuckTimer + dt;
        if (customer.stuckTimer >= 1.25) {
          if (!this.setPath(customer, customer.destination)) this.recoverStuckCustomer(customer);
          continue;
        }
      } else {
        customer.stuckTimer = 0;
      }

      if (customer.pathIndex >= customer.path.length && !customer.arrived) {
        customer.arrived = true;
        if (customer.state === 'shopping') this.evaluateShelf(customer);
        else if (customer.state === 'leaving') this.removeCustomer(customer);
      }
    }
  }

  private removeCustomer(customer: Customer): void {
    const index = this.customers.indexOf(customer);
    if (index >= 0) this.customers.splice(index, 1);
    customer.sprite.destroy();
  }

  private showReaction(customer: Customer, message: string, color: string): void {
    const text = this.add.text(MAP_ORIGIN + customer.x, MAP_ORIGIN + customer.y - 45, message, {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color, fontStyle: 'bold',
      backgroundColor: '#fffdf5', padding: { x: 4, y: 2 }, stroke: '#ffffff', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(1100);
    this.tweens.add({ targets: text, y: text.y - 10, alpha: 0, duration: 850, onComplete: () => text.destroy() });
  }
}
