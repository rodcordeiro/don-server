// src/agents/summary/summary-agent.ts

import type { Agent, AgentMetadata } from "../../core/agents/agent";
import { type EventBus } from "../../core/events/event-bus";
import type { EventEnvelope } from "../../core/events/event-envelope";

export class SummaryAgent implements Agent {
  metadata: AgentMetadata = {
    name: "summary-agent",
    description: "Consolida resultados de outros agentes e responde ao usuário.",
    capabilities: ["resumir resultados", "organizar resposta final", "consolidar subtarefas"],
  };

  constructor(private readonly eventBus: EventBus) {}

  async handle(event: EventEnvelope) {
    await this.eventBus.publish({
      eventId: crypto.randomUUID(),
      correlationId: event.correlationId,

      conversationId: event.conversationId,
      rootTaskId: event.rootTaskId,
      taskId: event.taskId,
      ...(event.parentTaskId !== undefined ? { parentTaskId: event.parentTaskId } : {}),

      type: "agent.message",
      source: this.metadata.name,

      payload: {
        content: "Vou consolidar os resultados recebidos dos agentes.",
      },

      createdAt: new Date().toISOString(),
    });
  }
}
