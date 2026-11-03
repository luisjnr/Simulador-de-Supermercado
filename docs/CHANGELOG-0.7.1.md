# Versão 0.7.1 — Correção de navegação e NPCs presos

## Correções

- Corrigido o ponto de aproximação mais à esquerda de Carnes e Aves, que podia cair dentro da margem de colisão do freezer.
- O A* agora termina em coordenadas caminháveis: quando o destino original está bloqueado, utiliza o centro da célula livre mais próxima.
- Quando não existe caminho, o algoritmo retorna uma rota vazia. A cena trata esse caso de forma explícita, em vez de tentar caminhar diretamente até um alvo impossível.
- O NPC testa posições alternativas em frente ao setor e pula o produto caso todas estejam inacessíveis.
- Adicionado monitor de progresso: se o NPC não se mover por 1,25 segundo simulado, tenta recalcular a rota; se falhar, abandona a ação atual de maneira controlada.
- Posições de fila reorganizadas em duas colunas por caixa e nove linhas; posições excedentes permanecem dentro da área caminhável.

## Verificações realizadas

- 90 rotas de entrada até os 10 setores (três pontos de aproximação por setor, a partir das três entradas).
- 30 rotas de retorno dos setores à saída.
- 108 rotas de acesso aos pontos de fila dos dois caixas.
- 180 simulações de movimento: ida ao setor e retorno à saída para todas as aproximações.
- O antigo destino bloqueado de Carnes e Aves (57, 320) agora é ajustado para (68, 324), uma posição caminhável.
- Sintaxe dos cinco arquivos TypeScript verificada sem erros.

O build completo do Phaser não foi executado neste ambiente porque as dependências do projeto não estão instaladas e a rede do npm não foi validada nesta execução.
