# Mercado Tycoon — Simulador de Supermercado

Protótipo de jogo web 2D desenvolvido com Phaser 4.2.1, TypeScript e Vite (versão 0.7.11). O mapa é construído por código com elementos independentes e utiliza os sprites de NPC enviados como referência.

## Executar localmente

**Requisitos:** Node.js 20.19+ ou 22.12+ e npm.

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

## Catálogo por setor

Cada setor contém três produtos independentes. Ao clicar em uma prateleira durante a preparação, o painel lateral mostra os três produtos daquele setor. Cada produto possui preço de venda, estoque, limite de estoque e custo de reposição próprios.

O preço digitado é aplicado automaticamente quando o campo perde o foco ou quando Enter é pressionado. Os botões `−10%` e `+10%` diminuem ou aumentam o preço de venda em 10%. A reposição permite informar a quantidade desejada e visualizar o custo total antes da confirmação; também há um atalho para repor até 10 unidades.

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

Cada cliente recebe orçamento, limiar de exigência e uma lista aleatória de 3 a 8 produtos individuais entre os SKUs dos setores desbloqueados.

O NPC caminha até o setor do produto escolhido e toma a decisão de compra usando o preço e a necessidade daquele SKU:

`U = (N / P) × E`

Para comprar, o produto precisa ter estoque, caber no orçamento restante e atingir o limiar de utilidade do cliente.

Cada unidade comprada reduz o estoque daquele produto específico. O valor da compra entra no carrinho e é contabilizado no caixa.

Os NPCs atravessam uns aos outros; os obstáculos fixos do mapa continuam bloqueando a movimentação. A caminhada utiliza pequenos pulos procedurais.

## Ciclo e economia

O jogo alterna entre preparação (preços, estoque e melhorias) e mercado aberto (clientes e caixas). O expediente tem 14 horas simuladas e dura aproximadamente 44 segundos reais (velocidade global de 5,5×). A quantidade diária de clientes é sorteada entre 20 e 28.

O lucro líquido diário segue:

`Lucro = Receita bruta − Custos variáveis − Custos fixos`

Os custos de reposição são acumulados nos custos variáveis. Valores econômicos não definidos na documentação original — preços, custos de reposição, investimentos e necessidades dos produtos — são parâmetros iniciais de balanceamento no `MarketManager.ts`.

## Estrutura do projeto

```text
src/
├── game/scenes/MarketScene.ts        # cenário, NPCs, destinos por produto e ciclo
├── systems/economy/MarketManager.ts  # setores, SKUs, preço, estoque, vendas e melhorias
├── systems/navigation/AStarGrid.ts   # navegação A* e obstáculos estáticos
├── ui/MarketUI.ts                    # painel com três produtos por setor
└── main.ts                           # inicialização do Phaser

public/assets/
├── npcs/                             # dez personagens em PNG com transparência
└── checkout/cashier_station.png      # caixa ilustrado
```
