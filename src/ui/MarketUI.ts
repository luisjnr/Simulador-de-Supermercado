import type Phaser from 'phaser';
import { MarketManager, type DepartmentUpgradeId } from '../systems/economy/MarketManager';
import type { MarketScene } from '../game/scenes/MarketScene';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento #${id} não encontrado.`);
  return element as T;
};

export class MarketUI {
  private selectedShelfId = 'arroz';
  private readonly modal: HTMLElement;
  private messageOverride: string | null = null;
  private messageTimeout: number | null = null;

  constructor(private readonly market: MarketManager, private readonly game: Phaser.Game, private readonly scene: MarketScene) {
    this.modal = byId('report-modal');
    this.bindEvents();
    this.game.events.on('refresh-ui', () => this.refresh());
    this.game.events.on('shelf-selected', (id: string) => {
      this.selectedShelfId = id;
      this.renderProduct(true);
      this.refresh();
    });
    this.refresh();
    this.renderProduct(true);
  }

  refresh(): void {
    const phase = this.market.phase;
    byId('day-label').textContent = `DIA ${String(this.market.day).padStart(2, '0')}`;
    byId('cash-value').textContent = `¤ ${this.market.money(this.market.cash)}`;
    byId('cash-state').textContent = this.market.cash < 0 ? 'NO VERMELHO' : (this.market.cash < 300 ? 'ATENÇÃO' : 'ESTÁVEL');
    byId('cash-state').className = `stat-trend ${this.market.cash < 0 ? 'negative' : this.market.cash < 300 ? 'warning' : ''}`;
    byId('clock-value').textContent = this.market.clockLabel;
    byId('clock-subtitle').textContent = phase === 'preparation' || phase === 'report' ? 'Mercado fechado' : phase === 'closing' ? 'Fechamento · velocidade 5,5×' : phase === 'open' ? 'Expediente · velocidade 5,5×' : 'Simulação encerrada';
    byId('customers-value').textContent = String(this.scene.getActiveCustomerCount());
    const spawn = this.scene.getDailySpawnProgress();
    const spawnLabel = spawn.target > 0 ? `${spawn.spawned}/${spawn.target} previstos · ` : '';
    byId('customers-subtitle').textContent = `${spawnLabel}${this.market.customersServed} atendidos · ${this.market.customersLost} desistências`;
    byId('queue-value').textContent = String(this.scene.getQueueLength());
    byId('register-subtitle').textContent = `${this.market.checkoutLanes} ${this.market.checkoutLanes === 1 ? 'caixa ativo' : 'caixas ativos'}`;

    const phaseNames: Record<string, string> = {
      preparation: 'PREPARAÇÃO', open: 'MERCADO ABERTO', closing: 'FECHAMENTO', report: 'RELATÓRIO', gameover: 'FALÊNCIA',
    };
    byId('phase-label').textContent = phaseNames[phase];
    byId('phase-label').className = `phase-chip phase-${phase}`;
    const live = byId('live-indicator');
    live.className = `live-indicator ${phase === 'open' ? 'is-live' : ''}`;
    live.innerHTML = `<span></span> ${phase === 'open' ? 'SIMULAÇÃO AO VIVO' : phase === 'closing' ? 'FECHANDO O MERCADO' : 'MERCADO FECHADO'}`;

    const action = byId<HTMLButtonElement>('phase-action');
    const reportAction = byId<HTMLButtonElement>('report-action');
    action.disabled = phase === 'open' || phase === 'closing';
    action.innerHTML = phase === 'preparation' ? 'Abrir mercado <span>→</span>' : phase === 'report' ? 'Avançar dia <span>→</span>' : phase === 'gameover' ? 'Reiniciar simulação <span>↻</span>' : phase === 'closing' ? 'Finalizando atendimento…' : 'Mercado aberto';
    reportAction.textContent = phase === 'gameover' ? 'Reiniciar simulação' : 'Avançar para o próximo dia →';
    reportAction.disabled = false;
    byId('market-message').textContent = this.messageOverride ?? this.messageForPhase(phase);

    const editable = phase === 'preparation';
    byId<HTMLButtonElement>('hire-button').disabled = !editable || this.market.checkoutLanes >= this.market.maxCheckoutLanes;
    const normalUnlocked = this.market.isUpgradeUnlocked('normal');
    const premiumUnlocked = this.market.isUpgradeUnlocked('premium');
    byId<HTMLButtonElement>('unlock-normal-button').disabled = !editable || normalUnlocked || this.market.cash < this.market.getUpgradeCost('normal');
    byId<HTMLButtonElement>('unlock-premium-button').disabled = !editable || premiumUnlocked || this.market.cash < this.market.getUpgradeCost('premium');

    const specialUpgrades: { id: DepartmentUpgradeId; buttonId: string }[] = [
      { id: 'bakery', buttonId: 'unlock-bakery-button' },
      { id: 'yogurt', buttonId: 'unlock-yogurt-button' },
      { id: 'freezer', buttonId: 'unlock-freezer-button' },
      { id: 'icecream', buttonId: 'unlock-icecream-button' },
    ];
    for (const upgrade of specialUpgrades) {
      const button = byId<HTMLButtonElement>(upgrade.buttonId);
      const unlocked = this.market.isUpgradeUnlocked(upgrade.id);
      const cost = this.market.getUpgradeCost(upgrade.id);
      button.disabled = !editable || unlocked || this.market.cash < cost;
      button.innerHTML = unlocked
        ? '<b>LIBERADO</b><small>SETOR ATIVO</small>'
        : `<b>¤ ${this.market.money(cost)}</b><small>LIBERAR</small>`;
    }

    const selectedShelf = this.market.getShelf(this.selectedShelfId);
    byId('edit-note').textContent = selectedShelf && !selectedShelf.unlocked
      ? 'Este setor está bloqueado. Compre a melhoria correspondente para liberar os três produtos.'
      : editable ? 'Preço e estoque têm controles separados. Ajuste o valor em Preço de venda; em Reposição, confira a quantidade e o custo antes de comprar.' : 'O mercado está aberto. Preços e reposição ficam bloqueados até o próximo dia.';

    const bakeryUnlocked = this.market.isUpgradeUnlocked('bakery');
    const yogurtUnlocked = this.market.isUpgradeUnlocked('yogurt');
    const freezerUnlocked = this.market.isUpgradeUnlocked('freezer');
    const icecreamUnlocked = this.market.isUpgradeUnlocked('icecream');
    byId('upgrade-note').textContent = `${this.market.checkoutLanes} caixa(s) · Lanches/Bebidas ${normalUnlocked ? '✓' : '—'} · Premium ${premiumUnlocked ? '✓' : '—'} · Padaria ${bakeryUnlocked ? '✓' : '—'} · Laticínios ${yogurtUnlocked ? '✓' : '—'} · Carnes ${freezerUnlocked ? '✓' : '—'} · Sorvetes ${icecreamUnlocked ? '✓' : '—'}`;

    const hireLabel = byId('hire-button');
    hireLabel.innerHTML = this.market.checkoutLanes >= this.market.maxCheckoutLanes ? '<b>COMPLETO</b><small>2 / 2 CAIXAS</small>' : '<b>¤ 320</b><small>CONTRATAR</small>';
    const normalButton = byId<HTMLButtonElement>('unlock-normal-button');
    normalButton.innerHTML = normalUnlocked ? '<b>LIBERADO</b><small>SETOR ATIVO</small>' : `<b>¤ ${this.market.money(this.market.getUpgradeCost('normal'))}</b><small>LIBERAR</small>`;
    const premiumButton = byId<HTMLButtonElement>('unlock-premium-button');
    premiumButton.innerHTML = premiumUnlocked ? '<b>LIBERADO</b><small>SETOR ATIVO</small>' : `<b>¤ ${this.market.money(this.market.getUpgradeCost('premium'))}</b><small>LIBERAR</small>`;

    const focusedProductInput = document.activeElement instanceof HTMLInputElement && document.activeElement.matches('[data-item-price], [data-restock-quantity]');
    if (!focusedProductInput) this.renderProduct(false);
    this.renderActivity();
    this.renderReport();
  }

  private bindEvents(): void {
    byId('phase-action').addEventListener('click', () => this.performMainAction());
    byId('report-action').addEventListener('click', () => this.performMainAction());

    const productList = byId('product-list');
    // Atualiza quantidade, custo estimado e os dois botões de reposição sem reconstruir o painel.
    productList.addEventListener('input', (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.matches('[data-restock-quantity]')) {
        this.updateRestockPreview(target);
      }
    });

    productList.addEventListener('change', (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.matches('[data-restock-quantity]')) {
        this.normalizeRestockQuantity(target);
        this.updateRestockPreview(target);
        return;
      }
      // O preço digitado é aplicado automaticamente ao sair do campo (ou confirmar com Enter).
      if (!(target instanceof HTMLInputElement) || !target.matches('[data-item-price]')) return;
      const itemId = target.dataset.itemPrice;
      if (!itemId) return;
      const value = Number(target.value);
      if (!this.market.updatePrice(itemId, value)) {
        this.notify('Informe um preço válido maior que zero.', true);
        this.renderProduct(true);
      } else {
        this.notify('Preço aplicado automaticamente.', false, false);
      }
    });

    productList.addEventListener('keydown', (event) => {
      const target = event.target;
      if (event.key === 'Enter' && target instanceof HTMLInputElement && target.matches('[data-item-price], [data-restock-quantity]')) {
        target.blur();
      }
    });

    productList.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest<HTMLButtonElement>('button[data-action][data-item-id]');
      if (!button) return;
      const itemId = button.dataset.itemId;
      if (!itemId) return;
      if (button.dataset.action === 'increase-price' || button.dataset.action === 'decrease-price') {
        const input = productList.querySelector<HTMLInputElement>(`[data-item-price="${CSS.escape(itemId)}"]`);
        const currentValue = input ? Number(input.value) : NaN;
        if (!Number.isFinite(currentValue) || currentValue <= 0) {
          this.notify('Informe um preço válido antes de aplicar o reajuste.', true);
        } else {
          const increasing = button.dataset.action === 'increase-price';
          const adjustedPrice = increasing
            ? Math.min(9999, Math.round((currentValue * 1.1 + Number.EPSILON) * 100) / 100)
            : Math.max(0.1, Math.round((currentValue * 0.9 + Number.EPSILON) * 100) / 100);
          if (adjustedPrice === currentValue || !this.market.updatePrice(itemId, adjustedPrice)) {
            this.notify(increasing ? 'Não foi possível aumentar o preço deste produto.' : 'O preço já está no valor mínimo permitido.', true);
          } else {
            this.notify(`Preço ${increasing ? 'aumentado' : 'reduzido'} em 10%: ¤ ${this.market.money(adjustedPrice)}.`);
          }
        }
      } else if (button.dataset.action === 'restock-selected') {
        const quantityInput = productList.querySelector<HTMLInputElement>(`[data-restock-quantity="${CSS.escape(itemId)}"]`);
        const quantity = quantityInput ? Math.floor(Number(quantityInput.value)) : 0;
        if (!Number.isFinite(quantity) || quantity < 1) {
          this.notify('Informe uma quantidade válida para a reposição.', true);
        } else {
          const result = this.market.restock(itemId, quantity);
          this.notify(result.message, !result.ok);
        }
      } else if (button.dataset.action === 'restock-ten') {
        const result = this.market.restock(itemId, 10);
        this.notify(result.message, !result.ok);
      }
      this.renderProduct(true);
      this.refresh();
    });

    byId('unlock-normal-button').addEventListener('click', () => this.buyDepartment('normal'));
    byId('unlock-premium-button').addEventListener('click', () => this.buyDepartment('premium'));
    const specialUpgradeButtons: { id: DepartmentUpgradeId; buttonId: string }[] = [
      { id: 'bakery', buttonId: 'unlock-bakery-button' },
      { id: 'yogurt', buttonId: 'unlock-yogurt-button' },
      { id: 'freezer', buttonId: 'unlock-freezer-button' },
      { id: 'icecream', buttonId: 'unlock-icecream-button' },
    ];
    for (const upgrade of specialUpgradeButtons) byId(upgrade.buttonId).addEventListener('click', () => this.buyDepartment(upgrade.id));

    byId('hire-button').addEventListener('click', () => {
      const result = this.market.hireCashier();
      this.notify(result.message, !result.ok);
      this.game.events.emit('refresh-ui');
      this.refresh();
    });
  }

  private buyDepartment(id: DepartmentUpgradeId): void {
    const result = this.market.unlockDepartment(id);
    this.notify(result.message, !result.ok);
    if (result.ok) this.game.events.emit('shelf-upgrades-changed');
    this.renderProduct(true);
    this.refresh();
  }

  private performMainAction(): void {
    if (this.market.phase === 'preparation') {
      if (this.market.openMarket()) {
        this.game.events.emit('market-opened');
        this.game.events.emit('refresh-ui');
      }
    } else if (this.market.phase === 'report') {
      this.market.nextDay();
      this.modal.classList.remove('is-visible');
      this.modal.setAttribute('aria-hidden', 'true');
      this.game.events.emit('refresh-ui');
    } else if (this.market.phase === 'gameover') {
      this.market.restart();
      this.modal.classList.remove('is-visible');
      this.modal.setAttribute('aria-hidden', 'true');
      this.game.events.emit('restart-simulation');
      this.game.events.emit('refresh-ui');
    }
  }

  private renderProduct(force: boolean): void {
    const shelf = this.market.getShelf(this.selectedShelfId) ?? this.market.shelves[0];
    byId('shelf-number').textContent = String(this.market.shelves.indexOf(shelf) + 1).padStart(2, '0');
    byId('product-name').textContent = shelf.name;
    byId('product-detail').textContent = shelf.contents;
    byId('product-symbol').textContent = shelf.symbol;
    const category = byId('product-category');
    category.textContent = shelf.unlocked ? shelf.category.toUpperCase() : 'BLOQUEADO';
    category.className = `category-pill ${shelf.unlocked ? (shelf.category === 'Luxo' ? 'luxo' : shelf.category.toLowerCase()) : 'locked'}`;

    const list = byId('product-list');
    if (!shelf.unlocked) {
      list.innerHTML = '<div class="catalog-locked">🔒 Setor bloqueado<br><span>Compre a melhoria para liberar os três produtos deste setor.</span></div>';
      return;
    }
    const canEdit = this.market.phase === 'preparation';
    list.innerHTML = shelf.products.map((product) => {
      const stockPercent = (product.stock / product.maxStock) * 100;
      const stockLabel = product.stock <= 4 ? 'CRÍTICO' : product.stock <= 10 ? 'BAIXO' : 'REGULAR';
      const stockClass = product.stock <= 4 ? 'stock-critical' : product.stock <= 10 ? 'stock-low' : '';
      const availableStock = Math.max(0, product.maxStock - product.stock);
      const restockQty = Math.min(1, availableStock);
      const restockTotal = restockQty * product.restockCost;
      const quickRestockQty = Math.min(10, availableStock);
      const quickRestockTotal = quickRestockQty * product.restockCost;
      const canAffordSelected = this.market.cash >= restockTotal;
      const canAffordQuick = this.market.cash >= quickRestockTotal;
      return `
        <article class="catalog-product" data-product-row="${this.escape(product.id)}">
          <div class="catalog-product-head"><strong>${this.escape(product.name)}</strong><span class="${stockClass}">${product.stock}/${product.maxStock} · ${stockLabel}</span></div>
          <div class="catalog-stock-track"><span style="width:${stockPercent}%"></span></div>

          <section class="catalog-management price-management" aria-label="Gerenciamento de preço de ${this.escape(product.name)}">
            <div class="catalog-section-heading"><span class="catalog-section-icon price-icon">¤</span><div><strong>Preço de venda</strong><small>Valor cobrado por unidade</small></div></div>
            <div class="catalog-price-row">
              <label class="catalog-price"><span>¤</span><input data-item-price="${this.escape(product.id)}" type="number" min="0.1" max="9999" step="0.1" value="${product.price.toFixed(2)}" ${canEdit ? '' : 'disabled'} aria-label="Preço de venda de ${this.escape(product.name)}"><small>/ un.</small></label>
              <div class="catalog-price-actions">
                <button class="catalog-action decrease-price" data-action="decrease-price" data-item-id="${this.escape(product.id)}" ${canEdit && product.price > 0.1 ? '' : 'disabled'} aria-label="Diminuir preço de ${this.escape(product.name)} em 10 por cento" title="Diminuir preço em 10%">−10%</button>
                <button class="catalog-action increase-price" data-action="increase-price" data-item-id="${this.escape(product.id)}" ${canEdit && product.price < 9999 ? '' : 'disabled'} aria-label="Aumentar preço de ${this.escape(product.name)} em 10 por cento" title="Aumentar preço em 10%">+10%</button>
              </div>
            </div>
          </section>

          <section class="catalog-management stock-management" aria-label="Reposição de estoque de ${this.escape(product.name)}">
            <div class="catalog-section-heading"><span class="catalog-section-icon stock-icon">＋</span><div><strong>Reposição de estoque</strong><small>Custo unitário: ¤ ${this.market.money(product.restockCost)}</small></div></div>
            <label class="catalog-quantity-control">
              <span>Quantidade desejada</span>
              <span class="catalog-quantity-input-wrap"><input data-restock-quantity="${this.escape(product.id)}" type="number" min="1" max="${availableStock}" step="1" value="${restockQty || ''}" ${canEdit && availableStock > 0 ? '' : 'disabled'} aria-label="Quantidade de ${this.escape(product.name)} para repor"><small>unidades</small></span>
            </label>
            <div class="catalog-restock-summary">
              <div><span>Custo da quantidade escolhida</span><strong data-restock-selected-total>¤ ${this.market.money(restockTotal)}</strong></div>
              <div class="catalog-restock-total"><span>Compra rápida (+${quickRestockQty})</span><strong>¤ ${this.market.money(quickRestockTotal)}</strong></div>
            </div>
            <div class="catalog-restock-actions">
              <button class="catalog-restock-button" data-action="restock-selected" data-item-id="${this.escape(product.id)}" ${canEdit && restockQty > 0 && canAffordSelected ? '' : 'disabled'} aria-label="Repor quantidade escolhida de ${this.escape(product.name)} por ${this.market.money(restockTotal)}">${restockQty <= 0 ? 'Estoque completo' : !canAffordSelected ? 'Saldo insuficiente' : `Repor +${restockQty} un.`}</button>
              <button class="catalog-restock-quick-button" data-action="restock-ten" data-item-id="${this.escape(product.id)}" ${canEdit && quickRestockQty > 0 && canAffordQuick ? '' : 'disabled'} aria-label="Compra rápida de até 10 unidades de ${this.escape(product.name)} por ${this.market.money(quickRestockTotal)}">${quickRestockQty <= 0 ? 'Estoque completo' : !canAffordQuick ? '+10 · Saldo insuficiente' : `Repor +${quickRestockQty} un.`}</button>
            </div>
            <small class="catalog-restock-capacity">${availableStock > 0 ? `Você pode adicionar até ${availableStock} unidade(s).` : 'Estoque máximo atingido.'}</small>
          </section>
        </article>`;
    }).join('');
  }

  private normalizeRestockQuantity(input: HTMLInputElement): void {
    const max = Number(input.max);
    const raw = Number(input.value);
    if (!Number.isFinite(raw) || raw < 1) {
      input.value = max > 0 ? '1' : '';
      return;
    }
    input.value = String(Math.min(max, Math.max(1, Math.floor(raw))));
  }

  private updateRestockPreview(input: HTMLInputElement): void {
    const itemId = input.dataset.restockQuantity;
    if (!itemId) return;
    const product = this.market.getItem(itemId);
    if (!product) return;
    const available = Math.max(0, product.maxStock - product.stock);
    const rawQuantity = input.value.trim() === '' ? 0 : Number(input.value);
    const valid = Number.isInteger(rawQuantity) && rawQuantity >= 1 && rawQuantity <= available;
    const quantity = valid ? rawQuantity : 0;
    const total = quantity * product.restockCost;
    const quickQuantity = Math.min(10, available);
    const quickTotal = quickQuantity * product.restockCost;
    const canEdit = this.market.phase === 'preparation';
    const row = input.closest<HTMLElement>('[data-product-row]');
    if (!row) return;
    const selectedTotal = row.querySelector<HTMLElement>('[data-restock-selected-total]');
    const selectedButton = row.querySelector<HTMLButtonElement>('[data-action="restock-selected"]');
    const quickButton = row.querySelector<HTMLButtonElement>('[data-action="restock-ten"]');
    if (selectedTotal) selectedTotal.textContent = `¤ ${this.market.money(total)}`;
    if (selectedButton) {
      selectedButton.disabled = !canEdit || !valid || this.market.cash < total;
      selectedButton.textContent = available <= 0 ? 'Estoque completo' : !valid ? 'Quantidade inválida' : this.market.cash < total ? 'Saldo insuficiente' : `Repor +${quantity} un.`;
      selectedButton.setAttribute('aria-label', `Repor ${quantity} unidades de ${product.name} por ${this.market.money(total)}`);
    }
    if (quickButton) {
      quickButton.disabled = !canEdit || quickQuantity <= 0 || this.market.cash < quickTotal;
      quickButton.textContent = quickQuantity <= 0 ? 'Estoque completo' : this.market.cash < quickTotal ? `+${quickQuantity} · Saldo insuficiente` : `Repor +${quickQuantity} un.`;
      quickButton.setAttribute('aria-label', `Compra rápida de até 10 unidades de ${product.name} por ${this.market.money(quickTotal)}`);
    }
  }

  private renderActivity(): void {
    const container = byId('activity-list');
    if (!this.market.log.length) {
      container.innerHTML = '<div class="empty-activity"><span>◇</span><p>Nenhuma atividade ainda.<br/>Abra o mercado para começar.</p></div>';
      return;
    }
    container.innerHTML = this.market.log.slice(0, 5).map((entry, index) => `
      <div class="activity-item ${index === 0 ? 'latest' : ''}"><span class="activity-marker"></span><p>${this.escape(entry)}</p></div>
    `).join('');
  }

  private renderReport(): void {
    if (this.market.phase !== 'report' && this.market.phase !== 'gameover') {
      this.modal.classList.remove('is-visible');
      this.modal.setAttribute('aria-hidden', 'true');
      return;
    }
    const report = this.market.report;
    if (!report) return;
    this.modal.classList.add('is-visible');
    this.modal.setAttribute('aria-hidden', 'false');
    byId('report-day').textContent = `DIA ${String(report.day).padStart(2, '0')}`;
    byId('report-icon').textContent = this.market.phase === 'gameover' ? '!' : report.netProfit >= 0 ? '↗' : '↘';
    byId('report-title').textContent = this.market.phase === 'gameover' ? 'Supermercado em falência' : 'Relatório financeiro';
    byId('report-description').textContent = this.market.phase === 'gameover'
      ? 'O caixa permaneceu negativo por três dias consecutivos. A simulação foi encerrada.'
      : `Dia ${report.day} concluído. ${report.customersServed} clientes finalizaram compras e ${report.customersLost} desistiram da fila.`;
    byId('report-revenue').textContent = `¤ ${this.market.money(report.revenue)}`;
    byId('report-variable').textContent = `¤ ${this.market.money(report.variableCosts)}`;
    byId('report-fixed').textContent = `¤ ${this.market.money(report.fixedCosts)}`;
    const net = byId('report-net');
    net.textContent = `${report.netProfit < 0 ? '−' : ''}¤ ${this.market.money(Math.abs(report.netProfit))}`;
    net.className = report.netProfit < 0 ? 'negative' : 'positive';
    byId('report-warning').textContent = `Dias consecutivos no vermelho: ${report.redDays} de 3 · Saldo final: ¤ ${this.market.money(report.cash)}.`;
    byId('report-action').textContent = this.market.phase === 'gameover' ? 'Reiniciar simulação ↻' : 'Avançar para o próximo dia →';
  }

  private messageForPhase(phase: string): string {
    const messages: Record<string, string> = {
      preparation: 'Clique em um setor para gerenciar os três produtos. Cada item possui preço e estoque próprios.',
      open: 'Clientes circulando e escolhendo produtos individuais. Preços e estoques ficam bloqueados.',
      closing: 'O expediente terminou. Os clientes restantes estão finalizando o atendimento.',
      report: 'Dia encerrado. Analise o resultado e prepare o próximo expediente.',
      gameover: 'A simulação foi encerrada por falência. Reinicie para tentar outra estratégia.',
    };
    return messages[phase] ?? '';
  }

  private notify(message: string, error = false, refresh = true): void {
    this.messageOverride = message;
    const target = byId('market-message');
    target.textContent = message;
    target.classList.toggle('message-error', error);
    if (refresh) this.refresh();
    if (this.messageTimeout !== null) window.clearTimeout(this.messageTimeout);
    this.messageTimeout = window.setTimeout(() => {
      this.messageOverride = null;
      target.classList.remove('message-error');
      this.messageTimeout = null;
      this.refresh();
    }, 2600);
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
  }
}
