# Runtime e boot

## Sequencia de inicializacao

1. `src/main.ts` — carrega `.env` se o arquivo existir.
2. `Bootstrap.create()` monta dependencias em ordem fixa.
3. `Bootstrap.start()` — `agentRouter.start()`, `chatGateway.start()`, `httpGateway.start()`, subscribe de log global.

## Wiring principal (`Bootstrap.create`)

| Componente | Dependencias notaveis |
| --- | --- |
| `FileEventStore` | path `data/events.jsonl` |
| `EventBus` | eventStore |
| `EventService` | eventStore |
| `AgentRegistry` | agentes estaticos + runtime dinamico |
| `ToolRegistry` | FilesystemTool, GitTool, ShellTool |
| `ProviderRegistry` | Ollama, OpenAI, CLI (cursor/codex/custom) |
| `AgentRuntime` | eventBus, timeout (`AGENT_TIMEOUT_MS`, default 30s) |
| `ToolRuntime` | eventBus |
| `AgentRouter` | eventBus, registry, runtime |
| `CommandService` | eventBus, registry, dynamic/external services |
| `AuthService` | eventBus, `DON_SERVER_TOKEN`, `DON_SERVER_USER_ID` |
| `HttpGateway` | porta `PORT` (default 3001) |
| `ChatGateway` | eventBus, commandService, http server, authService |
| `RestGateway` | commandService, eventService, auth, projects, registry, dynamic/external |

## Porta e protocolos

- HTTP + WebSocket compartilham o mesmo servidor (`HttpGateway`).
- REST tratado por `RestGateway.handleRequest` registrado no HTTP gateway.

## Agentes registrados no boot (estaticos)

BacklogAgent, SummaryAgent, PlannerAgent, GitAgent, SecurityAgent, RabbitAgent (preparatorio), TechnicalReviewAgent (5 perfis: backend, frontend, mobile, dba, devops).

## Observabilidade em dev

`Bootstrap.start` faz `eventBus.subscribeAll` com `console.log` de tipo, source, target, taskId e payload.

## Variaveis de ambiente relevantes

Ver `.env.example`: `PORT`, `AGENT_TIMEOUT_MS`, `DON_SERVER_TOKEN`, `DON_SERVER_USER_ID`, `LLM_*`, `OPENAI_API_KEY`, `CURSOR_CLI_*`, `CODEX_CLI_*`.
