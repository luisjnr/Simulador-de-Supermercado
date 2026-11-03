# Changelog — 0.6.0

## Organização dos setores
- Os nomes das prateleiras agora representam setores/categorias gerais, e não um item isolado.
- O painel exibe o nome geral do setor, uma descrição da variedade e, separadamente, o produto cujo preço e estoque são gerenciados.
- A categoria premium passa a ser exibida como **Mercearia Premium**.

## Novas melhorias
- **Padaria — ¤ 300:** libera Pão francês.
- **Iogurtes e Laticínios — ¤ 275:** libera Iogurte natural.
- **Congelados — ¤ 400:** libera Pizza congelada.
- **Sorveteria — ¤ 350:** libera Sorvete de pote.
- Cada melhoria fornece 12 unidades iniciais.
- Os novos setores são adicionados automaticamente ao conjunto de interesses dos NPCs quando desbloqueados.
- Utilidade dos produtos congelados e sorvetes ajustada para permitir decisões de compra positivas dentro da faixa atual de exigência dos consumidores.

## Compatibilidade
- Mantida a estrutura do Phaser 4 + TypeScript + Vite.
- Mantidos os sistemas de navegação, fila, NPCs, economia e ciclo diário da versão 0.5.0.

## Observação do protótipo
Cada setor ainda tem um produto econômico representativo com preço e estoque próprios. Os outros itens mencionados na descrição do setor não são SKUs separados nesta versão.
