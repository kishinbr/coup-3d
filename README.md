# Coup 3D — Fase 1: protótipo visual

Jogo de blefe inspirado no Coup (edição base), em 3D e em primeira pessoa, num cassino clandestino.
Este repositório está na **Fase 1** do GDD: cena 3D navegável, sem regras e sem multiplayer.

## Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm run build      # checa TypeScript e gera dist/
npm run preview    # serve o build
```

Requer Node 20 ou mais recente.

## Controles

| Entrada | Ação |
|---|---|
| Clique na cena | Captura o cursor; mover o mouse olha ao redor |
| Arrastar | Também olha ao redor (quando o navegador bloqueia a captura do cursor) |
| ESC | Libera o cursor / guarda as cartas |
| C ou "Ver cartas" | Consulta privada das suas influências |

## O que existe nesta fase

- Salão do cassino: piso, tapete, paredes forradas, colunas, cortinas de veludo, lustres, arandelas e mesas ao fundo.
- Mesa de 6 lugares com feltro vermelho, borda de madeira, frisos dourados e zonas da **Corte** e do **Tesouro**.
- Três adversários provisórios (Lucas, Marina, Rafael) com roupas, cabelos e rostos distintos, animação de respiração, piscar e olhar.
- Cartas físicas com frente e verso próprios (arte desenhada em código), moedas 3D instanciadas, Corte com 17 cartas.
- Câmera em primeira pessoa com limites de rotação, e a consulta de cartas que inclina a câmera e traz as cartas para perto.
- HUD: logotipo, vez do jogador, registro, painel de ações, seus dados e plaquinhas sobre os adversários.

**Ilustrativo (ainda não funciona):** os botões de ação mostram um aviso em vez de executar regras,
o cronômetro é estático e o registro tem mensagens fixas. Tudo vem de `src/stores/gameStore.ts`.

## Estrutura

```
src/
  components/
    game/        cena: CasinoScene, CasinoRoom, PokerTable, PlayerAvatar, Chair, PlayingCard, Coin, ...
    camera/      CameraController (olhar), HeldCards (consulta de cartas)
    interface/   GameHUD, ActionPanel, GameLog, PlayerTag, Portrait, Icons
  game/
    types/       tipos públicos (PublicPlayer, TableView...). Sem campo para cartas alheias.
    constants/   paleta, influências, medidas da mesa
    rules/       (Fase 3) motor de regras
  stores/        zustand: gameStore, interfaceStore, cameraStore
  utils/         texturas procedurais (cartas, feltro, piso, parede)
server/          (Fase 4) Cloudflare Worker + Durable Objects
tests/           (Fase 3) testes das regras
```

## Decisões técnicas

- **Sem downloads de assets:** texturas desenhadas em canvas e mapa de ambiente gerado com `Lightformer`. A cena abre sem rede.
- **Desempenho:** uma única luz com sombra, moedas num só `InstancedMesh`, `dpr` limitado a 1,75, sem pós-processamento.
  A vinheta é feita em CSS.
- **Privacidade desde já:** cartas de adversário são desenhadas sem `influence`, ou seja, só com o verso.
  O tipo `PublicPlayer` não tem onde guardar cartas ocultas.
- **Fontes:** Cormorant Garamond (títulos) e Manrope (interface), empacotadas via `@fontsource`.

## Próximo passo (Fase 2)

Trocar os personagens provisórios por modelos GLB (Blender), adicionar as animações de apontar, contestar,
transferência de moedas e revelação de cartas, e tornar a interface contextual.
