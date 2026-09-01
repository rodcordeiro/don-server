# Dominio e vocabulario

## Proposito

Plataforma local de multiagentes orientada a eventos. Humanos enviam comandos; o sistema publica eventos; agentes reagem sem falar diretamente com o chat.

## Fluxo de comando

1. Entrada externa (REST `POST /commands` ou WebSocket).
2. `CommandService.handleUserCommand` publica `human.instruction`.
3. Parser resolve `@mention` ou default `planner-agent`.
4. `CommandService` publica `agent.command` para o alvo.
5. `AgentRouter` entrega via `AgentRuntime` (`agent.started` → resultado → `agent.completed` ou `agent.error`).
6. Historico consultavel via `EventService` / endpoints REST.

## Eventos principais

| Tipo | Papel |
| --- | --- |
| `human.instruction` | Comando humano registrado |
| `agent.command` | Delegacao a agente alvo |
| `agent.started` / `agent.completed` / `agent.error` | Ciclo de vida do agente |
| `agent.result` | Payload de resultado do agente |
| `tool.started` / `tool.result` / `tool.finished` / `tool.error` | Ciclo de ferramentas |
| `security.failure` | Falha de autenticacao |

## Identificadores

- `conversationId`, `taskId`, `correlationId`, `rootTaskId`, `parentTaskId` — gerados quando ausentes na entrada.
- `projectId` — opcional; backlog e eventos podem ser escopados por projeto.
- `actor` — identidade apos auth valida (nunca inclui o token).

## Contratos em `src/domain`

- **Planner:** `ExecutionPlan`, `ExecutionStep`
- **Agents:** `AgentResult`, `AgentDefinition`, `ExternalAgentDefinition`
- **Tools:** `ToolResult`
- **Commands:** `UserCommand`, `ParsedCommand`
- **Auth:** `AuthenticatedActor`
- **Projects:** `Project`, indice e backlog por projeto

## Agentes por capacidade (resumo)

| Agente | Papel |
| --- | --- |
| `planner-agent` | Plano tipado + delegacao |
| `backlog-agent` | Leitura/edicao de `docs/backlog.md` |
| `summary-agent` | Consolidacao de resultados |
| `git-agent` | Fronteira Git read-only |
| `security-agent` | Revisao de riscos |
| `rabbit-agent` | Diagnostico preparatorio (sem broker real) |
| `*-review-agent` | Analise tecnica por dominio |
| Dinamicos / externos | Registro em runtime via chat ou REST |

## Decisoes consolidadas (backlog + Nero)

- Prefixo de mencao: `@`
- Sem mencao → `planner-agent`
- Persistencia inicial: JSONL (`FileEventStore`)
- Auth inicial: token estatico (`DON_SERVER_TOKEN`)
