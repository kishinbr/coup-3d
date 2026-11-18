# Coup 3D

Jogo de blefe inspirado no Coup (edição base), em 3D e em primeira pessoa, num cassino clandestino.

**Estado atual: Fase 4 — multiplayer online (salas por código) + modo contra bots.**
Por decisão do projeto, as fases de regras e multiplayer vieram antes do visual e das animações, que ficam para o final.

## Como rodar

```bash
npm install
npm run dev:online   # site + servidor local juntos → abra http://localhost:5173
npm run dev          # só o site (o modo contra bots funciona; o online não)
npm test             # regras, simulação de partidas e salas multiplayer
npm run build        # checa TypeScript (site e servidor) e gera dist/
```

Requer Node 20.19+ (ou 22+). No Windows, se o PowerShell bloquear o `npm`, rode uma vez:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Para testar o online sozinho, abra duas abas em `http://localhost:5173`: cada aba é um jogador.

## Publicar na internet (Cloudflare, plano gratuito)

O mesmo comando publica o site e o servidor das salas no mesmo endereço.

```bash
npx wrangler login     # só na primeira vez: abre o navegador para entrar/criar a conta
npm run deploy         # gera o site e publica tudo
```

No fim aparece o endereço, algo como `https://coup-3d.SEU-USUARIO.workers.dev`. É só mandar para os amigos.
Na primeira publicação a Cloudflare pode pedir para escolher o subdomínio `workers.dev`.

> Quer o site na Vercel, como no GDD? Publique o servidor com `npm run deploy` e, na Vercel, defina a variável
> `VITE_SERVER_URL` com o endereço do Worker. Com a Cloudflare servindo os dois, isso não é necessário.

## Como jogar

1. Na tela inicial, digite seu nome e escolha:
   - **Com amigos (online):** "Criar sala" gera um código de 5 letras. Os amigos entram com o código ou pelo link
     de convite. O anfitrião pode completar a mesa com bots e começa a partida (2 a 6 jogadores).
   - **Contra bots:** de 1 a 5 adversários, sem internet.
2. Na sua vez, escolha uma ação no painel da direita. Ações com alvo pedem para escolher o jogador
   (no painel central ou clicando na plaquinha sobre ele).
3. Quando alguém declara uma influência, aparece o painel para **Contestar** ou **Permitir**; quando você pode
   bloquear, aparecem as opções de bloqueio. Você tem 15 segundos; sem resposta conta como "permitir".
   Online, cada decisão tem prazo (anel no canto superior direito): 60 s para a ação do turno, 30 s para escolher
   cartas. Se o prazo acabar, o servidor escolhe a opção mais neutra (Renda, permitir, primeira carta).
4. Ao perder uma influência com duas cartas na mão, você escolhe qual revelar.

| Entrada | Ação |
|---|---|
| Clique na cena | Captura o cursor; mover o mouse olha ao redor |
| Arrastar | Também olha ao redor (quando o navegador bloqueia a captura) |
| ESC | Libera o cursor / guarda as cartas |
| C ou "Ver cartas" | Consulta privada das suas influências |

## Arquitetura

```
server/              servidor (Cloudflare Worker + Durable Objects)
  src/index.ts       rotas: criar sala, checar sala, WebSocket
  src/rooms/GameRoom.ts   Durable Object: uma instância por sala (WebSockets com hibernação + alarmes)
  src/rooms/RoomLogic.ts  regras da SALA (entrar, anfitrião, bots, prazos, reconexão), testável sem Cloudflare
  wrangler.jsonc     configuração da Cloudflare
src/game/types/protocol.ts   mensagens trocadas entre navegador e servidor
src/game/rules/      motor de regras PURO (sem tela, sem rede, sem tempo), usado pelo site E pelo servidor
  engine.ts          createGame, applyCommand, waitingOn — a máquina de estados
  actions.ts         tabela das 7 ações: custo, influência declarada, quem bloqueia
  view.ts            getPlayerView: o que UM jogador pode saber + o que ele pode fazer agora
  random.ts          gerador com semente (partidas reproduzíveis)
src/game/bots/       bot simples; só enxerga a PlayerView, como um humano
src/services/
  localGame.ts       modo contra bots: faz o papel do servidor dentro do navegador
  onlineRoom.ts      conexão WebSocket com a sala, com reconexão automática
  eventText.ts       eventos → frases do registro
src/stores/          zustand: o cliente guarda só a PlayerView, nunca o estado completo
src/components/      cena 3D (game/, camera/) e HUD (interface/)
tests/rules/         casos do GDD §15
tests/game/          1.300 partidas simuladas checando invariantes
tests/multiplayer/   salas: anfitrião, privacidade das cartas, comandos inválidos, desconexão, reconexão
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

O servidor roda **o mesmo** `engine.ts` e envia a cada jogador apenas o resultado de `getPlayerView`:
as cartas ocultas dos outros nunca chegam ao navegador.

## Decisões sobre pontos não especificados no GDD

- **Tamanho da Corte:** o GDD fala em 15 cartas, mas isso só vale para 5 jogadores. O jogo usa 25 − 2 × jogadores.
- **Ordem das respostas:** em toda ação, primeiro abre-se a contestação; só depois o bloqueio (GDD §8.5 aplicado a todas).
- **Embaixador com uma influência:** compra 2 e mantém 1 (a regra do jogo de base).
- **Tempo de resposta (modo local):** 15 s; sem resposta conta como "permitir".
- **Alvo eliminado no meio da ação:** se o alvo de um roubo perde a última influência ao contestar, o roubo ainda acontece;
  um assassinato contra quem já foi eliminado não tem efeito.
- **Moedas de eliminados:** ficam com o jogador e não têm mais uso.
- **Online:** quem cai na sala de espera sai da lista; durante a partida, o lugar fica guardado e a pessoa volta
  ao recarregar a página (o token fica salvo na aba). Desconectado, cada decisão tem prazo de 8 s.
  Ninguém novo entra numa partida em andamento. Salas vazias são apagadas depois de 2 horas.

## Próximos passos

- **Fase 2 / 5 (visual):** personagens GLB, animações de apontar, contestar, moedas atravessando a mesa, revelação de cartas, sons.
