// src/agents/summary/summary-agent.ts

import { Agent, AgentMetadata } from "../../core/agents/agent";
import { EventBus } from "../../core/events/event-bus";
import { EventEnvelope } from "../../core/events/event-envelope";

export class SummaryAgent implements Agent {
  metadata: AgentMetadata = {
    name: "summary-agent",
    description: "Consolida resultados de outros agentes e responde ao usuário.",
    capabilities: [
      "resumir resultados",
      "organizar resposta final",
      "consolidar subtarefas"
    ]
  };

  constructor(private readonly eventBus: EventBus) {}

  async handle(event: EventEnvelope) {
    this.eventBus.publish({
      eventId: crypto.randomUUID(),
      correlationId: event.correlationId,

      conversationId: event.conversationId,
      rootTaskId: event.rootTaskId,
      taskId: event.taskId,
      parentTaskId: event.parentTaskId,

      type: "agent.message",
      source: this.metadata.name,

      payload: {
        content: "Vou consolidar os resultados recebidos dos agentes."
      },

      createdAt: new Date().toISOString()
    });
  }
}