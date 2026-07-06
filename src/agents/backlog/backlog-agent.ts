// src/agents/backlog/backlog-agent.ts

import { Agent, AgentMetadata } from "../../core/agents/agent";
import { EventBus } from "../../core/events/event-bus";
import { EventEnvelope } from "../../core/events/event-envelope";

export class BacklogAgent implements Agent {
  metadata: AgentMetadata = {
    name: "backlog-agent",
    description: "Consulta backlog, tarefas pendentes, status e prioridades.",
    capabilities: [
      "listar backlog",
      "identificar tarefas pendentes",
      "agrupar por status",
      "resumir prioridades"
    ],
    examples: [
      "Levante tarefas pendentes",
      "Liste backlog aberto",
      "Mostre itens não concluídos"
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

      type: "agent.result",
      source: this.metadata.name,

      payload: {
        status: "completed",
        result: "Backlog fake: 3 itens pendentes encontrados."
      },

      createdAt: new Date().toISOString()
    });
  }
}