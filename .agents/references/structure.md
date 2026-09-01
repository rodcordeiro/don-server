# Estrutura do repositorio

Factual do checkout atual. Nao inventar pastas ausentes.

## Raiz

| Path | Proposito |
| --- | --- |
| `src/` | Codigo TypeScript da aplicacao |
| `docs/` | Backlog, seguranca, specs, refs historicas |
| `scripts/` | Cliente WebSocket de teste (`ws-client.ts`) |
| `data/` | Persistencia runtime (`events.jsonl` via FileEventStore) |
| `.env.example` | Variaveis de ambiente documentadas |

## `src/` — camadas

| Pasta | Responsabilidade |
| --- | --- |
| `main.ts` | Entry; carrega `.env` se existir; chama `Bootstrap.start()` |
| `bootstrap/` | Composicao manual (`Bootstrap.create`, `AppContext`) |
| `core/` | Kernel: eventos, agentes, tools, providers |
| `domain/` | Contratos compartilhados (planner, agents, tools, commands, auth, projects) |
| `services/` | Casos de uso: comando, eventos, auth, projetos, agentes dinamicos/externos |
| `gateway/` | Adaptadores HTTP/REST, WebSocket, UI inline, parser de comandos |
| `agents/` | Implementacoes de agentes (planner, backlog, summary, git, security, rabbit, technical, dynamic, external) |
| `tools/` | Ferramentas executaveis (filesystem, git, shell) |
| `store/` | EventStore (`FileEventStore` em uso; `SqliteEventStore` legado/nao usado) |

## Fronteiras

- **Gateway** → traduz HTTP/WS; nao publica `human.instruction` diretamente fora do `CommandService`.
- **CommandService** → unico ponto para comandos humanos e registro inline de agentes.
- **AgentRouter** → consome `agent.command`; delega a `AgentRuntime`.
- **EventBus** → publica e persiste (quando store configurado); subscribe global e por tipo.
- **Domain** → tipos e contratos; sem logica de infraestrutura.

## Fora do escopo deste repo

- Frontend dedicado (UI minima servida em `/ui` dentro do `RestGateway`).
- Testes automatizados (pasta `test/` ou `__tests__/` ausente).
