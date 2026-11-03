# Alterações — versão 0.3.0

## Correções solicitadas

- A velocidade global da simulação passou de 2,5× para 8×. Um expediente de 240 segundos simulados dura aproximadamente 30 segundos reais.
- A quantidade de clientes passou a ser sorteada no início de cada dia: entre 6 e 10 NPCs.
- Os clientes são distribuídos ao longo do expediente; o sistema não cria mais clientes indefinidamente.
- O spawn utiliza três posições diferentes na entrada e aguarda quando todas estão ocupadas, evitando criar NPCs sobrepostos.
- A checagem de colisão dos NPCs passou a considerar uma área retangular compatível com o tamanho real dos sprites, inclusive em movimentos diagonais.
- As duas estações de caixa agora usam o modelo enviado pelo usuário, com fundo removido e escala calculada pela proporção original da imagem.
- Os pontos de atendimento e as duas filas foram reorganizados na faixa livre à direita das gôndolas.
- NPCs que ficam bloqueados por outros personagens tentam uma rota lateral temporária e depois retomam o destino original.
- A interface exibe o progresso do spawn diário (quantos clientes já entraram e quantos foram sorteados).

## Parâmetros ajustáveis

Em `src/game/scenes/MarketScene.ts`, no objeto `NPC_SPAWN`:

- `minPerDay`: mínimo de clientes por dia.
- `maxPerDay`: máximo de clientes por dia.
- `firstDelayMin` / `firstDelayMax`: atraso inicial do primeiro cliente.
- `scheduleRatio`: fração do expediente usada para distribuir as chegadas.
- `SIMULATION_SPEED`: multiplicador geral de tempo, movimento e atendimento.
