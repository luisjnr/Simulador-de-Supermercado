# Mercado Tycoon — Simulador de Supermercado

Protótipo de jogo web 2D desenvolvido com **Phaser 4.2.1, TypeScript e Vite** (versão 0.7.11). O mapa é construído por código com elementos independentes e utiliza os sprites de NPC enviados como referência.

## Executar localmente

Requisitos: Node.js 20.19+ ou 22.12+ e npm.

```bash
npm install
npm run dev
```

Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`.

Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

O conteúdo de produção será gerado em `dist/` e pode ser publicado na Vercel como projeto Vite.

## Catálogo por setor — versão 0.7.0

Cada setor contém **três produtos independentes**. Ao clicar em uma prateleira durante a preparação, o painel lateral mostra os três produtos daquele setor. Cada produto possui preço de venda, estoque, limite de estoque e custo de reposição próprios. O preço digitado é aplicado automaticamente quando o campo perde o foco (ou quando Enter é pressionado). O botão ↑10% aplica um reajuste rápido de 10%, e o botão + repõe até 10 unidades de cada SKU separadamente.

| Setor | Produtos | Desbloqueio |
|---|---|---|
| Hortifruti | Banana, Tomate, Alface | Inicial |
| Mercearia Essencial | Arroz, Feijão, Macarrão | Inicial |
| Higiene e Limpeza | Sabonete, Papel higiênico, Detergente | Inicial |
| Lanches e Biscoitos | Biscoito recheado, Cereal matinal, Batata chips | Lanches e Bebidas · ¤ 350 |
| Bebidas | Refrigerante, Suco, Leite | Lanches e Bebidas · ¤ 350 |
| Mercearia Premium | Café especial, Azeite extra virgem, Chocolate premium | Mercearia Premium · ¤ 450 |
| Padaria | Pão francês, Pão de forma, Croissant | Padaria · ¤ 300 |
| Laticínios | Iogurte natural, Iogurte grego, Leite fermentado | Laticínios · ¤ 275 |
| Carnes e Aves (freezer) | Carne bovina, Frango, Linguiça | Freezer de carnes · ¤ 400 |
| Sorveteria | Sorvete de pote, Picolé, Milk-shake | Sorveteria · ¤ 350 |

Os itens essenciais começam com estoque. As demais seções ficam bloqueadas até a compra da melhoria correspondente; ao desbloquear, cada produto recebe 12 unidades iniciais.

## Clientes e decisão de compra

- Cada cliente recebe orçamento, limiar de exigência e uma lista aleatória de **3 a 8 produtos individuais** entre os SKUs dos setores desbloqueados.
- O NPC caminha até o setor do produto escolhido e toma a decisão de compra usando o preço e a necessidade daquele SKU: `U = (N / P) × E`.
- Para comprar, o produto precisa ter estoque, caber no orçamento restante e atingir o limiar de utilidade do cliente.
- Cada unidade comprada reduz o estoque daquele produto específico. O valor da compra entra no carrinho e é contabilizado no caixa.
- Os NPCs atravessam uns aos outros; os obstáculos fixos do mapa continuam bloqueando a movimentação. A caminhada utiliza pequenos pulos procedurais.

## Ciclo e economia

O jogo alterna entre preparação (preços, estoque e melhorias) e mercado aberto (clientes e caixas). O expediente tem 14 horas simuladas e dura aproximadamente 44 segundos reais (velocidade global de 5,5×). A quantidade diária de clientes é sorteada entre 20 e 28.

O lucro líquido diário segue: `Lucro = Receita bruta − Custos variáveis − Custos fixos`. Os custos de reposição são acumulados nos custos variáveis. Valores econômicos não definidos na documentação original — preços, custos de reposição, investimentos e necessidades dos produtos — são parâmetros iniciais de balanceamento no `MarketManager.ts`.

## Estrutura do projeto

```text
src/
├── game/scenes/MarketScene.ts       # cenário, NPCs, destinos por produto e ciclo
├── systems/economy/MarketManager.ts # setores, SKUs, preço, estoque, vendas e melhorias
├── systems/navigation/AStarGrid.ts  # navegação A* e obstáculos estáticos
├── ui/MarketUI.ts                   # painel com três produtos por setor
└── main.ts                          # inicialização do Phaser
public/assets/
├── npcs/                            # dez personagens em PNG com transparência
└── checkout/cashier_station.png     # caixa ilustrado
```

## Correções da versão 0.7.1

- Corrigido o destino lateral do setor Carnes e Aves que caía dentro da margem de colisão do freezer.
- O A* agora ajusta destinos bloqueados para uma célula livre e retorna rota vazia quando não existe caminho; não envia mais o cliente direto para dentro de obstáculos.
- Os NPCs testam alternativas de aproximação para cada setor. Se nenhuma rota for possível, avançam para o próximo produto.
- Incluído watchdog de movimentação: após 1,25 segundo simulado sem progresso, o cliente recalcula a rota; se necessário, abandona o produto/fila ou é removido ao sair, evitando loops infinitos.
- Filas reorganizadas em zigue-zague com pontos dentro da área caminhável, inclusive para filas maiores.

## Correções do cenário — versão 0.7.9

- As duas estações de caixa foram reposicionadas lado a lado e os pontos de pagamento ficaram logo à frente dos balcões.
- Os rótulos CAIXA 1/2 foram movidos para cima dos balcões.
- O piso agora demarca discretamente as duas áreas de atendimento.
- A antiga porta STAFF foi removida por completo; a parede superior permanece contínua, sem abertura, folha, batente ou placa.
- A grade A* foi atualizada para os novos caixas e já não contém obstáculos da antiga porta.

## Alterações da versão 0.7.0

- Refatorados os setores para conter três SKUs individuais cada.
- Cada SKU tem preço, estoque, limite e custo de reposição próprios.
- O painel muda ao clicar em um setor e apresenta seus três produtos com controles independentes.
- A lista de compras dos NPCs passou a usar IDs de produtos individuais; cada NPC avalia e pode comprar produtos de setores diferentes.
- O freezer agora é o setor Carnes e Aves (carne bovina, frango e linguiça).
- Bebidas passou a vender refrigerante, suco e leite.
- Mercearia Premium agora reúne café especial, azeite extra virgem e chocolate premium.
- Nomes mais claros aplicados às prateleiras e setores no mapa.

## Ajustes da versão 0.7.2

- Removido o botão redundante `Salvar` do catálogo de produtos.
- O preço digitado é aplicado automaticamente ao sair do campo ou pressionar Enter, durante a fase de preparação.
- Adicionado o botão `↑10%`, que aumenta imediatamente em 10% o preço informado no campo, respeitando o limite de ¤ 9.999,00.
- Mantido o botão de reposição `+N`, que compra até 10 unidades e respeita estoque máximo e saldo disponível.
- Atualizados os rótulos de versão do projeto.


## Ajustes da versão 0.7.4

- Separados visualmente os controles de preço de venda e reposição de estoque em cada produto.
- Adicionados botões de reajuste de preço `−10%` e `+10%`, ambos aplicados imediatamente durante a preparação.
- A reposição mostra a quantidade que será adicionada, o custo unitário e o custo total daquela operação antes da confirmação.
- O botão de reposição informa quando o estoque está completo ou quando o saldo não é suficiente.


## Atualização 0.7.4

- Reposição com quantidade personalizável por produto (campo numérico, a partir de 1 unidade).
- Atalho separado para reposição rápida de até 10 unidades.
- Prévia de custo recalculada conforme a quantidade escolhida.
- Os dois botões mostram a disponibilidade, respeitam o estoque máximo e o saldo do caixa.


## Correção do cenário — versão 0.7.5

- Reorganizado o layout das dez prateleiras para criar margens visíveis em relação às paredes e corredores mais regulares entre as fileiras.
- Todas as placas de setor foram reposicionadas acima dos móveis e ancoradas pela borda inferior, inclusive quando o rótulo tem três linhas por estar bloqueado. As placas não são desenhadas sobre os produtos.
- Removidos desenhos decorativos duplicados que ocupavam exatamente as mesmas coordenadas da Padaria, dos Laticínios, da Sorveteria e do freezer de Carnes e Aves. Cada setor agora tem uma única representação visual, derivada de `MarketManager.shelves`.
- A antiga porta STAFF foi removida; a parede superior agora é contínua, sem vão, folha ou placa.
- Atualizada a grade A* para usar exatamente as novas coordenadas de mobiliário e obstáculos.
- Os dois caixas foram reposicionados lado a lado em uma área de atendimento dedicada. Os pontos de pagamento ficam imediatamente à frente dos balcões e as filas usam o corredor livre à direita.
- Validadas rotas dos três pontos de entrada até as aproximações dos dez setores, os dois caixas e os pontos de fila. Também foram verificadas as rotas de saída a partir dos destinos.


## Ajustes da versão 0.7.9

- Nome do setor encurtado para **Laticínios** na interface, mantendo os produtos de iogurtes e bebidas lácteas.
- Estações de caixa movidas 12 unidades para cima no mapa.
- Pontos de pagamento e obstáculos de navegação sincronizados com a nova posição.
- Removidas as antigas marcações translúcidas do piso que deixavam sombra na posição anterior dos caixas.


## Ajustes da versão 0.7.11

- A placa de Laticínios foi reposicionada no espaço livre ao lado do expositor, com largura e tipografia próprias para evitar sobreposição e quebra do texto.
- O tempo de atendimento no caixa foi reduzido levemente: de 2 para 1,7 segundo simulado por item, mantendo o mínimo de 1,8 segundo por compra. A velocidade geral do dia e dos NPCs não foi alterada.


## Correção da placa de Laticínios — versão 0.7.11

- A placa de Laticínios voltou para a faixa da parede, centralizada acima do expositor.
- Removido o posicionamento lateral que deixava a placa solta no corredor/piso.
- Removidas as dimensões fixas que podiam cortar o texto; a placa agora usa largura automática, fonte compacta e duas linhas quando o setor está bloqueado.
- Nenhuma posição de setor, caixa, tempo de atendimento, produto, estoque, NPC ou regra econômica foi alterada.
