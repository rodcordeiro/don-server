# Sprint 27 — Expansions Spec

Status: **pendente**. Backlog IDs: TOOL-007, TOOL-008, AG-006, GW-002, GW-003.

## Problem Statement

After the core platform is validated, operators need additional entry points (CLI, message queues) and outbound integrations (HTTP APIs, RabbitMQ) so that Don Server can participate in broader automation pipelines without bypassing CommandService, ToolRuntime or security guardrails.

## Solution

Add controlled tools (HTTP, RabbitMQ), wire RabbitAgent to real queue diagnostics, and expose new gateways that adapt external inputs into the existing command/event pipeline — reusing CommandService and the same auth and audit model where applicable.

## User Stories

1. As an operator, I want an HTTPTool with allowlisted methods, hosts and headers, so that agents can call external APIs safely.
2. As an operator, I want HTTPTool requests to pass through ToolRuntime with full `tool.*` audit events, so that outbound calls are traceable.
3. As an operator, I want HTTPTool to redact secrets from logged request/response bodies, so that tokens are not persisted in events.
4. As an operator, I want SecurityAgent policies to evaluate HTTPTool usage before sensitive calls, so that SSRF and data exfiltration risks are gated.
5. As an operator, I want configurable timeouts and response size limits on HTTPTool, so that runaway calls cannot hang agents.
6. As an operator, I want a RabbitMQTool to inspect queue depth, consumers, ready and unacked counts, so that I can diagnose messaging health.
7. As an operator, I want RabbitMQTool to publish messages only to allowlisted exchanges/routing keys, so that accidental broadcasts are prevented.
8. As an operator, I want RabbitMQ connection settings via environment variables, so that brokers are not hardcoded.
9. As an operator, I want RabbitAgent to use RabbitMQTool for real diagnostics instead of preparatory stubs, so that `@rabbit-agent` returns live data.
10. As an operator, I want RabbitAgent to suggest alerts when queues exceed configured thresholds, so that operational issues are proactive.
11. As an operator, I want RabbitAgent to block purge/requeue without explicit confirmation, so that destructive actions require intent.
12. As an operator, I want every RabbitMQ query and action audited as events, so that messaging operations are reconstructible.
13. As an operator, I want a CLI gateway that reads commands from stdin or argv and calls CommandService, so that shell scripts can drive Don Server.
14. As an operator, I want the CLI gateway to support the same token auth model, so that unattended scripts do not weaken security.
15. As an operator, I want CLI gateway to print correlation/task IDs on success, so that scripts can chain event queries.
16. As an operator, I want a RabbitMQ gateway consumer that turns queue messages into commands, so that async workflows trigger agents.
17. As an operator, I want the RabbitMQ gateway to map message payload fields to `content`, `conversationId` and `projectId`, so that context is preserved.
18. As an operator, I want the RabbitMQ gateway to ack/nack with clear error events on failure, so that poison messages are visible.
19. As an operator, I want Planner to delegate to RabbitAgent only when the instruction mentions queues or RabbitMQ, so that routing stays precise.
20. As a developer, I want new tools registered in ToolRegistry alongside existing Filesystem/Git/Shell tools, so that composition stays uniform.

## Implementation Decisions

- **HTTPTool:** Implement Tool interface; configurable allowlist for hosts, methods, max body size, timeout; integrate with ToolRuntime and SecurityAgent policy hooks (OPT-027 pattern).
- **RabbitMQTool:** Connection via env (`RABBITMQ_URL` or discrete host/user/password/vhost); read operations (queue stats) enabled by default; publish restricted; no destructive ops without explicit flag in payload.
- **RabbitAgent (AG-006):** Replace preparatory stub responses with RabbitMQTool calls; retain guardrails from OPT-031–035 (threshold alerts, safe actions, audit events).
- **CLI Gateway (GW-002):** Thin adapter — parse argv/stdin JSON or plain text → `CommandService.handleUserCommand`; reuse AuthService token from env or flag; no duplicate event rules.
- **RabbitMQ Gateway (GW-003):** Consumer subscribes to configured queue; deserialize message → command input; publish results optionally to reply queue (if specified in message metadata); depends on RabbitMQTool/client library choice.
- **Ordering:** HTTPTool and CLI Gateway are independent; RabbitMQTool blocks AG-006 and GW-003.
- **Bootstrap:** Register new tools in ToolRegistry; register CLI/Rabbit gateways in Bootstrap.start only when env enables them (fail-safe default: off).

## Testing Decisions

- **Principle:** Test adapter boundaries — CLI/Rabbit gateways should be verified by asserting CommandService receives the same input shape as REST would produce.
- **HTTPTool:** Mock HTTP server (or nock-style) asserting allowlist rejection, timeout, audit events and redaction — no real external calls in CI.
- **RabbitMQTool / Gateway:** Integration tests behind feature flag with Testcontainers or documented manual broker; unit tests for message→command mapping without broker.
- **RabbitAgent:** With mocked RabbitMQTool, assert live diagnostic shape vs preparatory stub; assert sensitive action blocking.
- **Seam priority:** CLI gateway end-to-end (spawn process → POST equivalent command → query events) as highest seam for GW-002.

## Out of Scope

- Full message broker administration UI.
- Write operations on RabbitMQ beyond controlled publish (purge, delete queue) even with confirmation — defer until operational need is explicit.
- OAuth for CLI or queue consumers.
- Replacing FileEventStore or changing core event contracts.

## Further Notes

- RabbitAgent already exists in preparatory mode (`toolConfigured: false`); AG-006 is an upgrade, not greenfield.
- OPT-031–035 optimized the preparatory agent; this sprint delivers the real integration.
- Recommended implementation order: TOOL-007 → GW-002 → TOOL-008 → AG-006 → GW-003.
- Update `docs/backlog.md` task statuses when each ID is delivered.
