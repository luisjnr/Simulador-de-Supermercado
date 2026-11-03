# Versão 0.2.0

## Alterações solicitadas

- O cenário foi refeito com desenhos vetoriais/pixelados feitos pelo próprio Phaser. A imagem de referência não é carregada nem usada como plano de fundo.
- Piso, paredes, padaria, freezer, geladeira, gôndolas, balcões e caixas são componentes desenhados separadamente em `MarketScene.ts`.
- Os clientes usam escala menor, pontos de aproximação distribuídos nas gôndolas e verificação de espaço livre para não atravessar outros NPCs.
- As filas passaram a usar posições espaçadas. Quando a fila lateral fica cheia, os clientes ocupam pontos de espera adicionais no corredor central.
- A operadora do caixa é representada por um desenho próprio em posição sentada, atrás do balcão.
- O tempo de simulação foi acelerado em 2,5×. Um expediente de 14 horas do jogo passa em cerca de 96 segundos reais.

## Arquivos principais

- `src/game/scenes/MarketScene.ts`: construção visual do mapa, NPCs, caixa, fila e movimentação.
- `src/systems/navigation/AStarGrid.ts`: obstáculos e busca de caminhos do mapa reconstruído.
- `src/ui/MarketUI.ts`: texto atualizado com a duração acelerada do expediente.
- `index.html` e `package.json`: identificação da versão 0.2.0.
