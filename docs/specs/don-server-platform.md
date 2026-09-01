# Don Server — Platform Spec

Status: **implementado** (Sprints 1–26). Referencia: `docs/backlog.md`.

## Problem Statement

Operadores e desenvolvedores precisam de uma plataforma local de multiagentes orientada a eventos para enviar comandos (`@agent`), delegar tarefas entre agentes especializados, consultar historico de execucao e auditar falhas — sem acoplar agentes diretamente ao canal de chat.

## Solution

Don Server expoe REST e WebSocket na mesma porta HTTP, converte comandos humanos em eventos de dominio, persiste a historia em JSONL, roteia comandos para agentes registrados e oferece UI minima, auditoria operacional e autenticacao por token estatico.

## User Stories

1. As an operator, I want to send `@backlog levante o backlog` via REST, so that I see pending tasks from the project backlog Markdown.
2. As an operator, I want commands without `@mention` to route to `planner-agent`, so that natural-language planning works by default.
3. As an operator, I want `@planner levante o backlog deste projeto` to delegate to BacklogAgent, so that multi-agent flows work end-to-end.
4. As an operator, I want WebSocket chat with live events, so that I can observe agent execution in real time.
5. As an operator, I want `POST /commands` to reuse the same rules as WebSocket, so that clients are interchangeable.
6. As an operator, I want `GET /conversations/:conversationId/events`, so that I can debug without maintaining a WebSocket connection.
7. As an operator, I want `GET /tasks/:taskId/events`, so that I can trace a task and its subtasks.
8. As an operator, I want `GET /correlations/:correlationId/events`, so that I can follow a logical operation across agents.
9. As an operator, I want events ordered by `createdAt` with stable shape, so that UI and API consumers render timelines reliably.
10. As an operator, I want `human.instruction` published only by CommandService, so that gateways remain thin adapters.
11. As an operator, I want `@` prefix for agent mentions resolved via AgentRegistry, so that new agents appear in parsing automatically.
12. As an operator, I want the server to generate `conversationId`, `taskId` and `correlationId` when omitted, so that ad-hoc clients work without ceremony.
13. As an operator, I want `agent.started` and `agent.completed` events with duration, so that runtime performance is observable.
14. As an operator, I want agent timeouts to publish `agent.error`, so that hung agents do not block the process indefinitely.
15. As an operator, I want agent exceptions to become persisted `agent.error` events, so that failures are auditable.
16. As an operator, I want FilesystemTool to read/list within an allowed root, so that agents can inspect the repo safely.
17. As an operator, I want GitTool for read-only status/diff, so that Git context is available without write risk.
18. As an operator, I want ShellTool in dry-run by default with allowlist for real execution, so that shell access is controlled.
19. As an operator, I want ToolRuntime to emit `tool.started`, `tool.result`, `tool.finished` and `tool.error`, so that tool usage is auditable.
20. As an operator, I want static token authentication on REST and WebSocket, so that anonymous access is blocked before sensitive features expand.
21. As an operator, I want to pass `Authorization: Bearer`, `x-don-token`, or `?token=` on WebSocket, so that different clients can authenticate.
22. As an operator, I want optional `x-don-user-id` honored after valid token, so that events carry operational identity.
23. As an operator, I want `security.failure` events on auth failures, so that intrusion attempts are logged without persisting secrets.
24. As an operator, I want `actor` on authenticated events, so that audit trails identify who triggered an action.
25. As an operator, I want BacklogAgent to list pending/partial tasks by sprint, so that project status is actionable.
26. As an operator, I want BacklogAgent to add, edit, complete and remove backlog tasks in Markdown, so that the backlog stays synchronized with work.
27. As an operator, I want BacklogAgent to use LLM when available with deterministic fallback, so that offline development still works.
28. As an operator, I want diff-auditable backlog mutations, so that changes are reviewable before commit.
29. As an operator, I want semantic search of backlog tasks by intent, so that I am not limited to literal task IDs.
30. As an operator, I want SummaryAgent to consolidate child agent results, so that multi-step flows produce one readable output.
31. As an operator, I want summaries tailored to technical, executive or operational audiences, so that the same data serves different readers.
32. As an operator, I want risks, blockers and next steps highlighted in summaries, so that decisions are faster.
33. As an operator, I want evidence IDs in summaries, so that conclusions are traceable to events and tasks.
34. As an operator, I want PlannerAgent to build plans from an agent catalog, so that delegation targets known capabilities.
35. As an operator, I want ExecutionPlan validation before publishing steps, so that invalid targets are rejected early.
36. As an operator, I want Planner to respect `dependsOn` between steps, so that dependent work runs in order.
37. As an operator, I want replanning when a plan is empty or invalid, so that transient LLM failures recover gracefully.
38. As an operator, I want Planner metrics (time, provider, model, success), so that planning quality can be monitored.
39. As an operator, I want multiple LLM providers (Ollama, OpenAI, CLI) with configurable default and fallback, so that model choice is flexible.
40. As an operator, I want per-agent provider/model preferences, so that cost and capability can be tuned per role.
41. As an operator, I want to register dynamic agents at runtime via chat or REST, so that the catalog expands without redeploy.
42. As an operator, I want external agents registrable via REST or MCP alias, so that Cursor/Codex or remote agents join the catalog.
43. As an operator, I want `GET /agents` to list the current catalog including runtime registrations, so that clients discover capabilities.
44. As an operator, I want per-project backlogs resolved by `projectId` with fallback to the local backlog file, so that multiple projects are supported.
45. As an operator, I want `projectId` propagated on commands and events when provided, so that audit and backlog scope stay consistent.
46. As an operator, I want event export filtered by conversation, task or correlation, so that I can share operational history.
47. As an operator, I want execution metrics by event type, agent and duration, so that I can spot bottlenecks.
48. As an operator, I want read-only replay of a task or conversation timeline, so that I can reconstruct what happened without re-execution.
49. As an operator, I want a failures report for `agent.error` and `tool.error`, so that incident triage is faster.
50. As an operator, I want specialized technical review agents (backend, frontend, mobile, DBA, DevOps), so that analysis matches the domain.
51. As an operator, I want standardized review output (findings, severity, evidence, recommendation), so that technical agents are comparable.
52. As an operator, I want GitAgent as the single Git boundary, so that Git permissions stay centralized.
53. As an operator, I want SecurityAgent for auth, data exposure and surface-area review, so that security questions get a dedicated delegate.
54. As an operator, I want SecurityAgent to scan events for missing identity or sensitive data, so that audit gaps are visible.
55. As an operator, I want a minimal UI at `/ui` for chat and timeline, so that I can operate without curl or a custom client.
56. As an operator, I want conversation list and task detail in the UI, so that navigation across work items is possible.
57. As an operator, I want visual highlighting of agent and tool errors in the UI, so that failures stand out in the timeline.
58. As a developer, I want shared domain types for plans, results, commands and tools, so that modules speak a common language.
59. As a developer, I want `pnpm dev` with hot reload, so that iteration is fast.
60. As a developer, I want documented smoke tests in AGENTS/references, so that onboarding validates a working install quickly.

## Implementation Decisions

- **Event kernel:** EventBus publishes to subscribers and optionally persists via EventStore; FileEventStore (JSONL) is the active store; SqliteEventStore exists but is not wired in Bootstrap.
- **Command boundary:** CommandService owns `human.instruction`, `agent.command` and inline agent registration flows; gateways authenticate and forward only.
- **Agent execution:** AgentRouter listens for `agent.command` and invokes AgentRuntime, which wraps `agent.handle()` with lifecycle events, duration and timeout.
- **Tool execution:** ToolRuntime wraps tools with `tool.*` events and ToolResult contract.
- **Parsing:** CommandParser resolves mentions from AgentRegistry catalog; default target is `planner-agent`.
- **Planner:** Generates JSON plans validated by a dedicated validator; prompt built from catalog and versioned builder module; publishes one `agent.command` per valid step.
- **Providers:** ProviderRegistry registers Ollama, OpenAI and CLI providers; selection via env defaults, per-agent preference and optional fallback chain.
- **Auth:** AuthService validates static token; propagates AuthenticatedActor; publishes `security.failure` on reject.
- **Projects:** ProjectService indexes projects and resolves backlog paths; projectId optional on commands and envelopes.
- **Dynamic agents:** DynamicAgentService validates definitions and registers at runtime; ExternalAgentService for HTTP/CLI/MCP-style externals.
- **UI:** Inline HTML/JS served from RestGateway at `/` and `/ui`; no separate frontend package.
- **Persistence path:** `data/events.jsonl` created at runtime by FileEventStore.

## Testing Decisions

- **Principle:** Test external behavior at the highest seam — HTTP command in, persisted events out — before unit-testing internals.
- **Primary seam:** `POST /commands` with auth header + `GET /conversations/:id/events` asserting event type sequence and payloads.
- **Secondary seams:** BacklogAgent mutations (read/modify `docs/backlog.md` in a temp fixture); ExecutionPlanValidator (invalid targets, empty plans); AuthService (missing token, invalid token, actor propagation).
- **Prior art:** None — `package.json` test script is a stub; this spec establishes the testing approach.
- **Manual smoke:** Documented in `.agents/references/conventions.md` and legacy AGENTS flow.

## Out of Scope

- HTTPTool, RabbitMQTool, real RabbitAgent diagnostics, CLI Gateway, RabbitMQ Gateway (see `sprint-27-expansions.md`).
- JWT/OAuth (deferred by explicit decision; static token is sufficient for local operation).
- Dedicated SPA frontend or mobile client.
- Production deployment topology, CI/CD pipelines and hosted infrastructure.

## Further Notes

- Backlog reports 95/100 tasks complete; remaining work is Sprint 27 only.
- RabbitAgent is registered but operates in preparatory mode without a live RabbitMQ connection.
- LLM-dependent agents degrade deterministically when Ollama/remote providers are unavailable.
- Knowledge Repo Nero project: `don-server`, domain `api`; operational snapshots track backlog evolution.
