# Coup 3D

Jogo de blefe inspirado no Coup (edição base), em 3D e em primeira pessoa, num cassino clandestino.

**Estado atual: Fase 3 — regras completas, partida local contra bots.**
Por decisão do projeto, a Fase 3 (regras) veio antes da Fase 2 (visual e animações), que fica para o final.

## Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes das regras + simulação de partidas
npm run build      # checa TypeScript e gera dist/
```

Requer Node 20.19+ (ou 22+). No Windows, se o PowerShell bloquear o `npm`, rode uma vez:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Como jogar

1. Na tela inicial, escolha seu nome e de 1 a 5 adversários (bots).
2. Na sua vez, escolha uma ação no painel da direita. Ações com alvo pedem para escolher o jogador
   (no painel central ou clicando na plaquinha sobre ele).
3. Quando alguém declara uma influência, aparece o painel para **Contestar** ou **Permitir**; quando você pode
   bloquear, aparecem as opções de bloqueio. Você tem 15 segundos; sem resposta conta como "permitir".
4. Ao perder uma influência com duas cartas na mão, você escolhe qual revelar.

| Entrada | Ação |
|---|---|
| Clique na cena | Captura o cursor; mover o mouse olha ao redor |
| Arrastar | Também olha ao redor (quando o navegador bloqueia a captura) |
| ESC | Libera o cursor / guarda as cartas |
| C ou "Ver cartas" | Consulta privada das suas influências |

## Arquitetura

```
src/game/rules/      motor de regras PURO (sem tela, sem rede, sem tempo)
  engine.ts          createGame, applyCommand, waitingOn — a máquina de estados
  actions.ts         tabela das 7 ações: custo, influência declarada, quem bloqueia
  view.ts            getPlayerView: o que UM jogador pode saber + o que ele pode fazer agora
  random.ts          gerador com semente (partidas reproduzíveis)
src/game/bots/       bot simples; só enxerga a PlayerView, como um humano
src/services/
  localGame.ts       faz o papel do servidor: guarda o estado, valida, agenda bots e o tempo de resposta
  eventText.ts       eventos → frases do registro
src/stores/          zustand: o cliente guarda só a PlayerView, nunca o estado completo
src/components/      cena 3D (game/, camera/) e HUD (interface/)
tests/rules/         casos do GDD §15
tests/game/          1.300 partidas simuladas checando invariantes
```

Fluxo de uma ação no motor (GDD §3, §4, §8.5):

```
declarar → janela de contestação (se declara influência)
         → janela de bloqueio (se bloqueável)
         → janela de contestação do bloqueio
         → resolução → próximo turno
```

Perdas de influência interrompem o fluxo até a carta ser escolhida. Cada comando devolve um novo estado e
uma lista de eventos (`ACTION_DECLARED`, `CHALLENGE_RESOLVED`, `INFLUENCE_LOST`, `COINS_TRANSFERRED`...),
que hoje alimentam o registro e na fase visual vão disparar as animações.

Na Fase 4, `localGame.ts` é substituído por um Durable Object que roda **o mesmo** `engine.ts`
e envia a cada jogador apenas o resultado de `getPlayerView`.

## Decisões sobre pontos não especificados no GDD

- **Tamanho da Corte:** o GDD fala em 15 cartas, mas isso só vale para 5 jogadores. O jogo usa 25 − 2 × jogadores.
- **Ordem das respostas:** em toda ação, primeiro abre-se a contestação; só depois o bloqueio (GDD §8.5 aplicado a todas).
- **Embaixador com uma influência:** compra 2 e mantém 1 (a regra do jogo de base).
- **Tempo de resposta (modo local):** 15 s; sem resposta conta como "permitir".
- **Alvo eliminado no meio da ação:** se o alvo de um roubo perde a última influência ao contestar, o roubo ainda acontece;
  um assassinato contra quem já foi eliminado não tem efeito.
- **Moedas de eliminados:** ficam com o jogador e não têm mais uso.

## Próximos passos

- **Fase 4:** salas online (Cloudflare Workers + Durable Objects), entrada por código, reconexão.
- **Fase 2 / 5 (visual):** personagens GLB, animações de apontar, contestar, moedas atravessando a mesa, revelação de cartas, sons.
