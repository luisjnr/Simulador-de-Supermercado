# Versão 0.7.2 — Ajuste dos controles de produto

## Alterações

- Removido o botão `Salvar` do catálogo para simplificar a edição.
- O preço digitado é aplicado automaticamente ao sair do campo; pressionar Enter também confirma a alteração.
- Adicionado o botão `↑10%` para reajustar imediatamente o preço atual em 10%. O valor considera o que estiver digitado no campo e respeita o teto de ¤ 9.999,00.
- Mantido o botão de reposição de estoque, que adiciona até 10 unidades conforme o saldo e o limite do produto.
- Ambos os controles ficam desabilitados quando o mercado está aberto ou o setor está bloqueado.

## Comportamento esperado

1. Digite o novo preço e saia do campo: a alteração é aplicada automaticamente.
2. Clique em `↑10%`: o preço atual é aumentado em 10% e aplicado imediatamente.
3. Clique em `+N`: o sistema compra e adiciona até N unidades ao estoque individual do produto.
