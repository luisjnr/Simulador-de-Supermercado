export type MarketPhase = 'preparation' | 'open' | 'closing' | 'report' | 'gameover';
export type ProductCategory = 'Essencial' | 'Normal' | 'Luxo';
export type DepartmentUpgradeId = 'normal' | 'premium' | 'bakery' | 'yogurt' | 'freezer' | 'icecream';

export interface MarketItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  initialStock: number;
  maxStock: number;
  restockCost: number;
  need: number;
}

export interface ShelfProduct {
  id: string;
  /** Nome geral do setor mostrado no mapa e no painel. */
  name: string;
  /** Descrição curta dos produtos que fazem parte deste setor. */
  contents: string;
  category: ProductCategory;
  upgradeId: DepartmentUpgradeId | null;
  unlocked: boolean;
  elasticity: number;
  symbol: string;
  products: MarketItem[];
  rect: { x: number; y: number; width: number; height: number };
  target: { x: number; y: number };
}

export interface DailyReport {
  day: number; revenue: number; variableCosts: number; fixedCosts: number; netProfit: number;
  cash: number; customersServed: number; customersLost: number; redDays: number;
}

const UPGRADE_COSTS: Record<DepartmentUpgradeId, number> = {
  normal: 350, premium: 450, bakery: 300, yogurt: 275, freezer: 400, icecream: 350,
};

const UPGRADE_LABELS: Record<DepartmentUpgradeId, string> = {
  normal: 'Lanches e Bebidas',
  premium: 'Mercearia Premium',
  bakery: 'Padaria',
  yogurt: 'Laticínios',
  freezer: 'Carnes e Aves',
  icecream: 'Sorveteria',
};

const item = (id: string, name: string, price: number, restockCost: number, need: number, initialStock = 12): MarketItem => ({
  id, name, price, restockCost, need, initialStock, stock: initialStock, maxStock: 40,
});

export class MarketManager {
  phase: MarketPhase = 'preparation';
  day = 1; cash = 1600; elapsedSeconds = 0;
  readonly dayDurationSeconds = 240;
  grossRevenue = 0; variableCosts = 0; customersServed = 0; customersLost = 0; redDays = 0;
  checkoutLanes = 1; readonly maxCheckoutLanes = 2;
  readonly rentPerDay = 110; readonly utilitiesPerDay = 40; readonly cashierSalaryPerDay = 75;
  report: DailyReport | null = null;
  log: string[] = [];

  /** Cada setor contém três SKUs independentes, com preço, estoque e reposição próprios. */
  shelves: ShelfProduct[] = [
    {
      id: 'frutas', name: 'Hortifruti', contents: 'Frutas, verduras e legumes frescos', category: 'Essencial', upgradeId: null, unlocked: true, elasticity: 1.2, symbol: '✿',
      products: [item('banana', 'Banana', 4.5, 2.1, 72, 16), item('tomate', 'Tomate', 5.0, 2.4, 78, 14), item('alface', 'Alface', 3.5, 1.6, 68, 14)],
      rect: { x: 142, y: 310, width: 104, height: 56 }, target: { x: 194, y: 376 },
    },
    {
      id: 'arroz', name: 'Mercearia Essencial', contents: 'Grãos, massas e alimentos básicos', category: 'Essencial', upgradeId: null, unlocked: true, elasticity: 1.2, symbol: '▦',
      products: [item('arroz', 'Arroz (5 kg)', 5.5, 2.8, 100, 18), item('feijao', 'Feijão (1 kg)', 7.0, 3.5, 105, 16), item('macarrao', 'Macarrão', 4.0, 1.9, 82, 16)],
      rect: { x: 142, y: 400, width: 103, height: 56 }, target: { x: 194, y: 466 },
    },
    {
      id: 'higiene', name: 'Higiene e Limpeza', contents: 'Cuidados pessoais e limpeza doméstica', category: 'Essencial', upgradeId: null, unlocked: true, elasticity: 1.2, symbol: '▧',
      products: [item('sabonete', 'Sabonete', 3.5, 1.6, 66, 14), item('papel-higienico', 'Papel higiênico', 9.0, 5.0, 105, 12), item('detergente', 'Detergente', 3.0, 1.3, 62, 14)],
      rect: { x: 315, y: 400, width: 103, height: 56 }, target: { x: 366, y: 466 },
    },
    {
      id: 'biscoitos', name: 'Lanches e Biscoitos', contents: 'Biscoitos, cereais e salgadinhos', category: 'Normal', upgradeId: 'normal', unlocked: false, elasticity: 1.0, symbol: '▤',
      products: [item('biscoito', 'Biscoito recheado', 4.5, 2.2, 72, 0), item('cereal', 'Cereal matinal', 8.0, 4.2, 100, 0), item('batata-chips', 'Batata chips', 6.0, 2.9, 82, 0)],
      rect: { x: 142, y: 220, width: 105, height: 56 }, target: { x: 194, y: 286 },
    },
    {
      id: 'sucos', name: 'Bebidas', contents: 'Bebidas geladas e não alcoólicas', category: 'Normal', upgradeId: 'normal', unlocked: false, elasticity: 1.0, symbol: '▥',
      products: [item('refrigerante', 'Refrigerante (2 L)', 7.0, 3.5, 92, 0), item('suco', 'Suco (1 L)', 5.5, 2.6, 84, 0), item('leite', 'Leite (1 L)', 5.0, 2.5, 98, 0)],
      rect: { x: 315, y: 220, width: 103, height: 56 }, target: { x: 366, y: 286 },
    },
    {
      id: 'carne', name: 'Mercearia Premium', contents: 'Produtos selecionados e de maior valor', category: 'Luxo', upgradeId: 'premium', unlocked: false, elasticity: 0.6, symbol: '◆',
      products: [item('cafe-especial', 'Café especial', 18.0, 10.0, 260, 0), item('azeite', 'Azeite extra virgem', 22.0, 13.0, 310, 0), item('chocolate-premium', 'Chocolate premium', 14.0, 7.5, 220, 0)],
      rect: { x: 315, y: 310, width: 103, height: 56 }, target: { x: 366, y: 376 },
    },
    {
      id: 'padaria', name: 'Padaria', contents: 'Pães frescos e produtos de forno', category: 'Essencial', upgradeId: 'bakery', unlocked: false, elasticity: 1.2, symbol: '♨',
      products: [item('pao-frances', 'Pão francês (un.)', 1.2, 0.45, 42, 0), item('pao-forma', 'Pão de forma', 7.0, 3.6, 96, 0), item('croissant', 'Croissant', 5.0, 2.4, 86, 0)],
      rect: { x: 42, y: 35, width: 99, height: 99 }, target: { x: 92, y: 151 },
    },
    {
      id: 'iogurte', name: 'Laticínios', contents: 'Iogurtes e bebidas lácteas', category: 'Normal', upgradeId: 'yogurt', unlocked: false, elasticity: 1.0, symbol: '🥛',
      products: [item('iogurte-natural', 'Iogurte natural', 5.5, 2.8, 86, 0), item('iogurte-grego', 'Iogurte grego', 7.5, 3.8, 105, 0), item('leite-fermentado', 'Leite fermentado', 6.0, 3.0, 90, 0)],
      rect: { x: 158, y: 35, width: 84, height: 52 }, target: { x: 200, y: 103 },
    },
    {
      id: 'congelados', name: 'Carnes e Aves', contents: 'Carnes resfriadas e congeladas', category: 'Normal', upgradeId: 'freezer', unlocked: false, elasticity: 1.0, symbol: '❄',
      products: [item('carne-bovina', 'Carne bovina', 18.0, 11.0, 180, 0), item('frango', 'Frango', 13.0, 7.5, 145, 0), item('linguica', 'Linguiça', 11.0, 6.0, 125, 0)],
      rect: { x: 27, y: 180, width: 44, height: 210 }, target: { x: 88, y: 285 },
    },
    {
      id: 'sorvetes', name: 'Sorveteria', contents: 'Sorvetes, picolés e sobremesas geladas', category: 'Luxo', upgradeId: 'icecream', unlocked: false, elasticity: 0.6, symbol: '✦',
      products: [item('sorvete-pote', 'Sorvete de pote', 8.0, 4.2, 150, 0), item('picole', 'Picolé', 3.0, 1.4, 82, 0), item('milkshake', 'Milk-shake', 9.0, 4.8, 165, 0)],
      rect: { x: 350, y: 35, width: 113, height: 54 }, target: { x: 406, y: 105 },
    },
  ];

  get fixedCostsPerDay(): number { return this.rentPerDay + this.utilitiesPerDay + this.cashierSalaryPerDay * this.checkoutLanes; }
  get clockLabel(): string {
    const minutes = Math.min(14 * 60, (this.elapsedSeconds / this.dayDurationSeconds) * 14 * 60);
    const total = 8 * 60 + minutes;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(Math.floor(total % 60)).padStart(2, '0')}`;
  }

  getShelf(id: string): ShelfProduct | undefined { return this.shelves.find((shelf) => shelf.id === id); }
  getItem(id: string): MarketItem | undefined {
    for (const shelf of this.shelves) {
      const found = shelf.products.find((product) => product.id === id);
      if (found) return found;
    }
    return undefined;
  }
  getShelfForItem(itemId: string): ShelfProduct | undefined { return this.shelves.find((shelf) => shelf.products.some((product) => product.id === itemId)); }
  getAvailableItems(): MarketItem[] { return this.shelves.filter((shelf) => shelf.unlocked).flatMap((shelf) => shelf.products); }

  isUpgradeUnlocked(id: DepartmentUpgradeId): boolean {
    const group = this.shelves.filter((shelf) => shelf.upgradeId === id);
    return group.length > 0 && group.every((shelf) => shelf.unlocked);
  }
  getUpgradeCost(id: DepartmentUpgradeId): number { return UPGRADE_COSTS[id]; }
  getUpgradeLabel(id: DepartmentUpgradeId): string { return UPGRADE_LABELS[id]; }

  updatePrice(itemId: string, price: number): boolean {
    const product = this.getItem(itemId);
    const shelf = this.getShelfForItem(itemId);
    if (this.phase !== 'preparation' || !product || !shelf?.unlocked || !Number.isFinite(price) || price <= 0 || price > 9999) return false;
    product.price = Math.round(price * 100) / 100;
    this.addLog(`Preço de ${product.name.toLowerCase()} atualizado para ¤ ${this.money(product.price)}.`);
    return true;
  }

  restock(itemId: string, quantity = 10): { ok: boolean; message: string } {
    const product = this.getItem(itemId);
    const shelf = this.getShelfForItem(itemId);
    if (this.phase !== 'preparation') return { ok: false, message: 'O mercado precisa estar fechado para repor o estoque.' };
    if (!product || !shelf) return { ok: false, message: 'Produto não encontrado.' };
    if (!shelf.unlocked) return { ok: false, message: `Libere o setor ${shelf.name.toLowerCase()} antes de repor o estoque.` };
    const amount = Math.min(quantity, product.maxStock - product.stock);
    if (amount <= 0) return { ok: false, message: `${product.name} já está com estoque máximo.` };
    const cost = amount * product.restockCost;
    if (this.cash < cost) return { ok: false, message: 'Saldo insuficiente para essa reposição.' };
    product.stock += amount; this.cash -= cost; this.variableCosts += cost;
    this.addLog(`${amount} un. de ${product.name.toLowerCase()} repostas (¤ ${this.money(cost)}).`);
    return { ok: true, message: `${amount} unidades de ${product.name} adicionadas ao estoque.` };
  }

  hireCashier(): { ok: boolean; message: string } {
    if (this.phase !== 'preparation') return { ok: false, message: 'Contratações só podem ser feitas durante a preparação.' };
    if (this.checkoutLanes >= this.maxCheckoutLanes) return { ok: false, message: 'Limite de caixas atingido nesta versão.' };
    if (this.cash < 320) return { ok: false, message: 'Saldo insuficiente para contratar um operador.' };
    this.cash -= 320; this.checkoutLanes += 1;
    this.addLog('Novo operador contratado. Um segundo caixa está disponível.');
    return { ok: true, message: 'Operador contratado. O segundo caixa já está ativo.' };
  }

  unlockNormalShelves(): { ok: boolean; message: string } { return this.unlockDepartment('normal'); }
  unlockPremiumShelf(): { ok: boolean; message: string } { return this.unlockDepartment('premium'); }

  unlockDepartment(id: DepartmentUpgradeId): { ok: boolean; message: string } {
    if (this.phase !== 'preparation') return { ok: false, message: 'Melhorias só podem ser compradas durante a preparação.' };
    if (this.isUpgradeUnlocked(id)) return { ok: false, message: `O setor ${UPGRADE_LABELS[id]} já está liberado.` };
    const group = this.shelves.filter((shelf) => shelf.upgradeId === id);
    if (!group.length) return { ok: false, message: 'Setor não encontrado.' };
    const cost = UPGRADE_COSTS[id];
    if (this.cash < cost) return { ok: false, message: `Saldo insuficiente para liberar ${UPGRADE_LABELS[id]}.` };
    this.cash -= cost;
    group.forEach((shelf) => {
      shelf.unlocked = true;
      shelf.products.forEach((product) => { product.stock = Math.min(12, product.maxStock); });
    });
    const products = group.flatMap((shelf) => shelf.products.map((product) => product.name)).join(', ');
    this.addLog(`${UPGRADE_LABELS[id]} liberado. Produtos disponíveis: ${products}.`);
    return { ok: true, message: `${UPGRADE_LABELS[id]} liberado com 12 unidades iniciais de cada produto.` };
  }

  openMarket(): boolean {
    if (this.phase !== 'preparation') return false;
    this.phase = 'open'; this.elapsedSeconds = 0; this.grossRevenue = 0;
    this.customersServed = 0; this.customersLost = 0; this.report = null;
    this.addLog(`Mercado aberto para o expediente do dia ${this.day}.`);
    return true;
  }
  beginClosing(): void { if (this.phase === 'open') { this.phase = 'closing'; this.addLog('Horário de fechamento. Os clientes que estão na loja serão atendidos.'); } }
  addSale(amount: number): void { if (amount > 0) { this.grossRevenue += amount; this.cash += amount; this.customersServed += 1; } }
  registerLostCustomer(): void { this.customersLost += 1; }

  finishDay(): DailyReport | null {
    if (this.phase !== 'closing') return null;
    const fixed = this.fixedCostsPerDay;
    this.cash -= fixed;
    const net = this.grossRevenue - this.variableCosts - fixed;
    this.redDays = this.cash < 0 ? this.redDays + 1 : 0;
    this.report = { day: this.day, revenue: this.grossRevenue, variableCosts: this.variableCosts, fixedCosts: fixed, netProfit: net, cash: this.cash, customersServed: this.customersServed, customersLost: this.customersLost, redDays: this.redDays };
    this.phase = this.redDays >= 3 ? 'gameover' : 'report';
    this.addLog(`Dia ${this.day} encerrado. Resultado líquido: ¤ ${this.money(net)}.`);
    return this.report;
  }

  nextDay(): boolean {
    if (this.phase !== 'report') return false;
    this.day += 1; this.elapsedSeconds = 0; this.grossRevenue = 0; this.variableCosts = 0;
    this.customersServed = 0; this.customersLost = 0; this.report = null; this.phase = 'preparation';
    this.addLog(`Dia ${this.day}: período de preparação iniciado.`);
    return true;
  }

  restart(): void {
    this.phase = 'preparation'; this.day = 1; this.cash = 1600; this.elapsedSeconds = 0;
    this.grossRevenue = 0; this.variableCosts = 0; this.customersServed = 0; this.customersLost = 0;
    this.redDays = 0; this.checkoutLanes = 1; this.report = null; this.log = [];
    this.shelves.forEach((shelf) => {
      shelf.unlocked = shelf.upgradeId === null;
      shelf.products.forEach((product) => { product.stock = shelf.unlocked ? product.initialStock : 0; });
    });
    this.addLog('Novo supermercado iniciado. Desbloqueie novos setores para ampliar o catálogo.');
  }

  addLog(message: string): void { this.log.unshift(message); this.log = this.log.slice(0, 6); }
  money(value: number): string { return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
}
