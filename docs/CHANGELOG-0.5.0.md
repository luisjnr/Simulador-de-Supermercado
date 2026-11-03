# Changelog — 0.5.0

## Movimentação dos NPCs
- Removida a verificação de distância entre clientes durante o deslocamento e a lógica de desvio baseada em outros NPCs.
- NPCs podem atravessar uns aos outros, inclusive em movimentos diagonais e nas filas.
- Obstáculos estáticos do supermercado continuam sendo respeitados pela navegação A*.
- Adicionado efeito procedural de caminhada: pequenos pulos verticais conforme a distância percorrida.

## Evolução das prateleiras
- O supermercado começa somente com produtos da categoria Essencial disponíveis: Arroz, Hortifruti e Higiene.
- Categoria Normal: melhoria de ¤ 350, desbloqueia Biscoitos e Sucos e inclui 12 unidades de cada.
- Categoria Premium/Luxo: melhoria de ¤ 450, desbloqueia Carne premium e inclui 12 unidades.
- Gôndolas bloqueadas aparecem vazias com identificação da categoria.
- Os desbloqueios são feitos na fase de preparação e permanecem disponíveis nos dias seguintes. Reiniciar a simulação restaura o estado inicial.
