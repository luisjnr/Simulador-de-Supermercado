# Changelog — 0.7.7

## Cenário e caixas
- Removida completamente a porta STAFF, incluindo folha, batentes, moldura e placa.
- A parede superior permanece contínua com o mesmo acabamento das demais partes da parede.
- Reposicionadas as duas estações de caixa para uma área de atendimento mais organizada, com espaçamento uniforme.
- Pontos de pagamento movidos para a frente imediata dos balcões.
- Identificação CAIXA 1/2 movida para acima dos balcões, sem ocupar a área onde os clientes aguardam.
- Delimitadas duas áreas discretas no piso para reforçar visualmente os pontos de atendimento.
- Atualizada a grade A* para refletir os novos obstáculos e removida a colisão da antiga porta.

## Preservado
- NPCs, filas, navegação, produtos, estoque, preços, upgrades, economia e ciclo diário.

## Validação
- TypeScript: sintaxe verificada nos cinco arquivos da aplicação, sem erros de parsing.
- Navegação A*: 144 rotas verificadas sem falhas, incluindo três pontos de entrada para aproximações dos dez setores, dois pontos de pagamento, posições das filas e trajetos de saída.
- Build completo do Phaser não executado neste ambiente porque as dependências não estão instaladas localmente.
