# Changelog — versão 0.7.6

## Ajuste solicitado de layout

- Padaria movida para a parede superior, com o móvel encostado à parede.
- Iogurtes e Laticínios movidos para a parede superior, ao lado da Padaria e antes da abertura da porta STAFF.
- Sorveteria movida para a parede superior direita, com o congelador encostado à parede.
- Freezer de Carnes e Aves movido para a parede esquerda, sem afastamento entre o móvel e a parede.
- Placas dos três setores da parede superior permanecem na faixa da parede, acima dos móveis. A placa vertical do freezer foi deslocada um pouco para a direita para não sair da área interna nem cobrir o equipamento.
- Atualizados os destinos de aproximação dos NPCs e as áreas de obstáculos do A* para manter os quatro setores acessíveis.
- Os demais seis setores mantêm as posições da versão 0.7.5.

## Verificações

- Compilação isolada do módulo AStarGrid.ts concluída com TypeScript em modo estrito.
- Testadas 99 rotas: três posições de entrada até os três pontos de aproximação de cada um dos dez setores, além dos dois caixas e da saída. Todas encontraram caminho.
- O build completo do Phaser não foi executado porque as dependências não estão instaladas neste ambiente.
