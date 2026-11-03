# Changelog — 0.7.10

## Correções pontuais

- Reposicionada exclusivamente a placa do setor **Laticínios** para o vão livre à direita do expositor superior. A placa usa largura fixa e fonte ligeiramente menor para manter o texto legível sem atravessar o móvel ou a parede.
- Reduzido levemente o tempo de atendimento no caixa: `Math.max(1.8, basketCount * 1.7)` em vez de `Math.max(2, basketCount * 2)`. Isso torna o processamento aproximadamente 15% mais rápido para compras maiores, sem alterar a velocidade global da simulação.
- Nenhum outro setor, posição, produto, preço, estoque, comportamento de NPC ou elemento da interface foi alterado.
