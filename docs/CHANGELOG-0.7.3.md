# Versão 0.7.3 — Controles separados de preço e estoque

## Preço de venda
- Campo individual de preço por produto.
- Botão `−10%` para reduzir o preço em 10%, respeitando o mínimo de ¤ 0,10.
- Botão `+10%` mantido para aumentar o preço em 10%, respeitando o máximo de ¤ 9.999,00.
- Alterações de preço não descontam dinheiro do caixa.

## Reposição de estoque
- Bloco visual separado do gerenciamento de preço.
- Exibe quantidade prevista para reposição (até 10 unidades).
- Exibe custo unitário e custo total exato da reposição antes da compra.
- O botão confirma a reposição e o sistema desconta do caixa o custo exibido.
- Mostra estados de estoque completo e saldo insuficiente.

## Execução
```bash
npm install
npm run dev
```
