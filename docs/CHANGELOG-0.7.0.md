# Versão 0.7.0 — Catálogo de produtos por setor

## Mudanças

- Cada setor passou a conter três produtos individuais, totalizando 30 SKUs.
- Cada SKU possui seu próprio preço, estoque, limite de estoque e custo de reposição.
- Ao selecionar uma prateleira, a interface apresenta os três produtos daquele setor com controles independentes para salvar preços e repor estoque.
- Os clientes passaram a receber uma lista de compras composta por IDs de produtos individuais, caminhar até o setor correspondente e avaliar o SKU específico.
- O freezer foi redefinido como **Carnes e Aves**, com carne bovina, frango e linguiça.
- O setor **Mercearia Premium** agora oferece café especial, azeite extra virgem e chocolate premium.
- **Bebidas** oferece refrigerante, suco e leite.
- Setores essenciais iniciais: Hortifruti, Mercearia Essencial e Higiene e Limpeza.
- A melhoria **Lanches e Bebidas** libera Lanches e Biscoitos e Bebidas; as demais melhorias liberam seus setores específicos.
- Cada setor desbloqueado recebe 12 unidades iniciais de cada SKU.
- Reiniciar a simulação restaura os nove SKUs essenciais e bloqueia os demais setores novamente.

## Testes

- 10 setores, com exatamente três produtos por setor.
- 30 identificadores únicos de produtos.
- Nove produtos essenciais disponíveis no início.
- Testes de alteração de preço e reposição individual.
- Testes de desbloqueio das seis melhorias e estoque inicial dos SKUs.
- Teste de reinicialização.
- Teste de rota A* da entrada até os dez setores.
