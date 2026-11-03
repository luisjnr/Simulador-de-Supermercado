export interface Point2D { x: number; y: number; }
interface Node { index: number; score: number; }

class MinHeap {
  private data: Node[] = [];
  push(node: Node): void {
    this.data.push(node); let index = this.data.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.data[parent].score <= node.score) break;
      this.data[index] = this.data[parent]; index = parent;
    }
    this.data[index] = node;
  }
  pop(): Node | undefined {
    if (!this.data.length) return undefined;
    const root = this.data[0]; const last = this.data.pop()!;
    if (this.data.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1; const right = left + 1;
        if (left >= this.data.length) break;
        const child = right < this.data.length && this.data[right].score < this.data[left].score ? right : left;
        if (this.data[child].score >= last.score) break;
        this.data[index] = this.data[child]; index = child;
      }
      this.data[index] = last;
    }
    return root;
  }
  get length(): number { return this.data.length; }
}

/** A* em grade com obstáculos correspondentes ao mapa desenhado no Phaser (512 x 512). */
export class AStarGrid {
  private readonly cellSize = 8;
  private readonly columns = 64;
  private readonly rows = 64;
  private readonly blocked = new Uint8Array(64 * 64);
  private readonly directions = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142],
  ] as const;

  constructor() {
    const obstacles = [
      // Paredes externas; a abertura inferior permanece livre para a entrada.
      { x: 0, y: 0, w: 17, h: 512 }, { x: 495, y: 0, w: 17, h: 512 },
      { x: 0, y: 0, w: 512, h: 25 }, { x: 0, y: 496, w: 205, h: 16 }, { x: 307, y: 496, w: 205, h: 16 },
      // Mobiliário fixo e setores clicáveis: coordenadas sincronizadas com MarketManager.
      { x: 42, y: 35, w: 99, h: 99 },       // Padaria: encostada à parede superior
      { x: 158, y: 35, w: 84, h: 52 },      // Iogurtes e laticínios: parede superior
      { x: 350, y: 35, w: 113, h: 54 },    // Sorveteria: parede superior
      { x: 27, y: 180, w: 44, h: 210 },    // Freezer de carnes e aves: parede esquerda
      { x: 142, y: 220, w: 105, h: 56 },   // Lanches e biscoitos
      { x: 315, y: 220, w: 103, h: 56 },   // Bebidas
      { x: 142, y: 310, w: 104, h: 56 },   // Hortifruti
      { x: 315, y: 310, w: 103, h: 56 },   // Mercearia premium
      { x: 142, y: 400, w: 103, h: 56 },   // Mercearia essencial
      { x: 315, y: 400, w: 103, h: 56 },   // Higiene e limpeza
      // Estações de caixa reposicionadas e alinhadas com as áreas de atendimento.
      { x: 314, y: 117, w: 68, h: 49 }, { x: 386, y: 117, w: 68, h: 49 },
      // A parede superior é contínua: não existe mais porta de STAFF.
    ];

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.columns; col += 1) {
        const x = (col + 0.5) * this.cellSize;
        const y = (row + 0.5) * this.cellSize;
        const outside = x < 24 || x > 488 || y < 34 || y > 492;
        // A margem extra representa a largura física dos personagens, não apenas o centro deles.
        const object = obstacles.some((r) => x >= r.x - 7 && x <= r.x + r.w + 7 && y >= r.y - 7 && y <= r.y + r.h + 7);
        this.blocked[this.index(col, row)] = outside || object ? 1 : 0;
      }
    }
  }

  isWalkablePoint(point: Point2D): boolean {
    const cell = this.toCell(point);
    return this.isWalkable(cell.x, cell.y);
  }

  findPath(start: Point2D, destination: Point2D): Point2D[] {
    const from = this.nearestWalkable(this.toCell(start));
    const to = this.nearestWalkable(this.toCell(destination));
    // Uma rota inexistente deve ser explícita. Retornar [destination] fazia o NPC
    // tentar atravessar o obstáculo até um alvo que não podia alcançar.
    if (!from || !to) return [];

    // Se o alvo original estiver bloqueado (ex.: offset lateral do freezer),
    // termina no centro da célula livre mais próxima, nunca dentro do mobiliário.
    const finalDestination = this.isWalkablePoint(destination)
      ? destination
      : { x: (to.x + 0.5) * this.cellSize, y: (to.y + 0.5) * this.cellSize };
    const startIndex = this.index(from.x, from.y); const goalIndex = this.index(to.x, to.y);
    if (startIndex === goalIndex) return [finalDestination];

    const total = this.columns * this.rows;
    const g = new Float32Array(total); g.fill(Number.POSITIVE_INFINITY);
    const previous = new Int32Array(total); previous.fill(-1);
    const closed = new Uint8Array(total); const open = new MinHeap();
    g[startIndex] = 0; open.push({ index: startIndex, score: this.heuristic(from.x, from.y, to.x, to.y) });

    while (open.length) {
      const current = open.pop()!;
      if (closed[current.index]) continue;
      if (current.index === goalIndex) {
        const cells = [goalIndex]; let cursor = goalIndex;
        while (cursor !== startIndex) { cursor = previous[cursor]; if (cursor < 0) return []; cells.push(cursor); }
        cells.reverse();
        const points = cells.slice(1).map((index) => ({ x: (index % this.columns + 0.5) * this.cellSize, y: (Math.floor(index / this.columns) + 0.5) * this.cellSize }));
        if (points.length) points[points.length - 1] = finalDestination; else points.push(finalDestination);
        return this.simplify(points);
      }
      closed[current.index] = 1;
      const cx = current.index % this.columns; const cy = Math.floor(current.index / this.columns);
      for (const [dx, dy, cost] of this.directions) {
        const nx = cx + dx; const ny = cy + dy;
        if (!this.isWalkable(nx, ny)) continue;
        if (dx && dy && (!this.isWalkable(cx + dx, cy) || !this.isWalkable(cx, cy + dy))) continue;
        const next = this.index(nx, ny); if (closed[next]) continue;
        const tentative = g[current.index] + cost;
        if (tentative >= g[next]) continue;
        previous[next] = current.index; g[next] = tentative;
        open.push({ index: next, score: tentative + this.heuristic(nx, ny, to.x, to.y) });
      }
    }
    return [];
  }

  private simplify(points: Point2D[]): Point2D[] {
    if (points.length < 3) return points;
    const result = [points[0]];
    let dx0 = Math.sign(points[1].x - points[0].x); let dy0 = Math.sign(points[1].y - points[0].y);
    for (let i = 1; i < points.length - 1; i += 1) {
      const dx = Math.sign(points[i + 1].x - points[i].x); const dy = Math.sign(points[i + 1].y - points[i].y);
      if (dx !== dx0 || dy !== dy0) result.push(points[i]); dx0 = dx; dy0 = dy;
    }
    result.push(points[points.length - 1]); return result;
  }

  private nearestWalkable(cell: { x: number; y: number }): { x: number; y: number } | null {
    const origin = { x: Math.max(0, Math.min(63, cell.x)), y: Math.max(0, Math.min(63, cell.y)) };
    if (this.isWalkable(origin.x, origin.y)) return origin;
    const queue = [origin]; const seen = new Set([this.index(origin.x, origin.y)]);
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = current.x + dx; const y = current.y + dy;
        if (x < 0 || x >= 64 || y < 0 || y >= 64) continue;
        const index = this.index(x, y); if (seen.has(index)) continue;
        if (this.isWalkable(x, y)) return { x, y };
        seen.add(index); queue.push({ x, y });
      }
    }
    return null;
  }
  private toCell(point: Point2D): { x: number; y: number } { return { x: Math.floor(point.x / 8), y: Math.floor(point.y / 8) }; }
  private index(x: number, y: number): number { return y * 64 + x; }
  private isWalkable(x: number, y: number): boolean { return x >= 0 && x < 64 && y >= 0 && y < 64 && this.blocked[this.index(x, y)] === 0; }
  private heuristic(x: number, y: number, gx: number, gy: number): number {
    const dx = Math.abs(x - gx); const dy = Math.abs(y - gy);
    const diagonal = Math.min(dx, dy);
    return diagonal * 1.4142 + (dx + dy - 2 * diagonal);
  }
}
