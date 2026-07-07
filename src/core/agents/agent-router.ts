// src/core/agents/agent-router.ts

import { type EventBus } from "../events/event-bus";
import { type AgentRegistry } from "./agent-registry";
import type { EventEnvelope } from "../events/event-envelope";

export class AgentRouter {
  constructor(
    private readonly eventBus: EventBus,
    private readonly registry: AgentRegistry,
  ) {}

  start() {
    this.eventBus.subscribe("agent.command", async event => {
      const target = event.target;

      if (!target) {
        this.publishError(event, "Comando sem target.");
        return;
      }

      const agent = this.registry.get(target);

      if (!agent) {
        this.publishError(event, `Agente não encontrado: ${target}`);
        return;
      }

      await agent.handle(event);
    });
  }

  private publishError(event: EventEnvelope, error: string): void {
    void this.eventBus.publish({
      ...event,
      eventId: crypto.randomUUID(),
      type: "agent.error",
      source: "agent-router",
      target: event.source,
      payload: { error },
      createdAt: new Date().toISOString(),
    });
  }
}
