# Changelog — versão 0.7.5

## Correções de cenário

- Placas de identificação agora ficam acima das prateleiras, alinhadas pela borda inferior e com espaço entre texto e mobiliário. O posicionamento é igual para todos os setores e comporta nomes em duas linhas mais o status de bloqueio.
- Reposicionadas as prateleiras de Padaria, Iogurtes e Laticínios, Sorveteria, Carnes e Aves, Lanches e Biscoitos, Bebidas, Hortifruti, Mercearia Premium, Mercearia Essencial e Higiene e Limpeza.
- Removidos os desenhos estáticos duplicados que ficavam sobre os setores gerenciados, evitando placas, produtos e estruturas sobrepostas.
- Porta STAFF refeita como vão na parede superior, com batentes e folha aberta ancorada ao batente.
- Freezer de Carnes e Aves separado da antiga geladeira decorativa lateral.
- Segundo caixa movido para a esquerda, mantendo margem em relação à parede direita.
- Coordenadas dos obstáculos A* sincronizadas com o novo layout visual.

## Verificações

- Sintaxe TypeScript analisada em todos os cinco arquivos-fonte.
- Testadas rotas dos três pontos de entrada até os três offsets de aproximação de cada um dos dez setores.
- Testadas rotas até os dois caixas, pontos das filas e retorno à entrada.
- Verificada ausência de interseção entre as áreas principais dos setores e os limites de parede.
- O build completo do Phaser não foi executado porque `npm install` excedeu o tempo limite de rede neste ambiente.
