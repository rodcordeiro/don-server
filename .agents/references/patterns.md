# Padroes locais

Padroes observados no checkout, nao prescricoes genericas.

## Composicao manual (sem framework DI)

`Bootstrap.create()` instancia e conecta dependencias explicitamente. `AppContext` expoe o grafo para testes futuros ou extensao.

## Event-driven agents

Agentes implementam `Agent` com `metadata` e `handle(EventEnvelope)`. Nao respondem diretamente ao WebSocket; publicam `agent.result` via `EventBus`.

## Router + Runtime

`AgentRouter` escuta `agent.command` e delega a `AgentRuntime`, que padroniza `agent.started`, duracao, timeout e `agent.error`.

## Command parser dinamico

`parseCommand` usa `AgentRegistry.getCatalog()` para resolver `@mention` e variantes (`@backlog` → `backlog-agent`).

## Planner tipado

Planner gera JSON validado por `ExecutionPlanValidator` antes de publicar steps. Prompt em modulo dedicado (`planner-prompt-builder`).

## Tools com auditoria

`ToolRuntime` envolve execucao e emite eventos `tool.*`. Tools retornam `ToolResult`.

## Provider registry com fallback

`ProviderRegistry` suporta default, selecao por agente e fallback configuravel por env.

## Registro dinamico

- Agentes dinamicos: JSON inline no chat ou `POST /agents`
- Agentes externos: `POST /external-agents` ou `/mcp/agents`
- `CommandService` detecta payloads de registro antes do parse normal

## Backlog como fonte de verdade operacional

`BacklogSource` le/edita `docs/backlog.md`. BacklogAgent interpreta intents (LLM ou fallback deterministico).

## UI inline

`RestGateway` serve HTML minimo em `/` e `/ui` via `renderUiPage()` — sem bundler frontend.

## Auth fail-closed

Sem token configurado ou token invalido → 401 REST, WS close 1008, evento `security.failure`.
