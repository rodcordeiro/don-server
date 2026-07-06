// src/agents/planner/planner-agent.ts

import { EventBus } from "../../core/events/event-bus";
import { Agent, AgentMetadata } from "../../core/agents/agent";
import { AgentRegistry } from "../../core/agents/agent-registry";
import { LlmProvider } from "../../core/providers/llm-provider";
import { EventEnvelope } from "../../core/events/event-envelope";

type PlannerStep = {
  target: string;
  reason: string;
  content: string;
};

type PlannerResponse = {
  steps: PlannerStep[];
};

export class PlannerAgent implements Agent {
  metadata: AgentMetadata = {
    name: "planner-agent",
    description: "Planeja tarefas, escolhe agentes e delega subtarefas.",
    capabilities: [
      "analisar pedido do usuário",
      "selecionar agentes",
      "criar subtarefas",
      "delegar execução"
    ],
    examples: [
      "@planner levante o backlog pendente deste projeto",
      "@planner revise o projeto e rode os testes"
    ]
  };

  constructor(
    private readonly eventBus: EventBus,
    private readonly registry: AgentRegistry,
    private readonly llm: LlmProvider
  ) {}

  async handle(event: EventEnvelope) {
    const content = String((event.payload as any).content ?? "");

    this.say(event, "Vou analisar quais agentes devem ser acionados.");

    const plan = await this.createPlan(content);

    this.say(
      event,
      `Vou acionar: ${plan.steps.map(step => step.target).join(", ")}.`
    );

    for (const step of plan.steps) {
      this.dispatch(event, step);
    }
  }

  private async createPlan(userRequest: string): Promise<PlannerResponse> {
    const catalog = this.registry
      .getCatalog()
      .filter(agent => agent.name !== this.metadata.name);

    const systemPrompt = `
Você é o PlannerAgent.

Sua função é decidir quais agentes devem ser acionados para atender o pedido do usuário.

Agentes disponíveis:
${catalog
  .map(agent => {
    return [
      `Nome: ${agent.name}`,
      `Descrição: ${agent.description}`,
      `Capacidades: ${agent.capabilities?.join(", ")}`,
      agent.examples?.length ? `Exemplos: ${agent.examples.join(" | ")}` : ""
    ]
      .filter(Boolean)
      .join("\n");
  })
  .join("\n\n")}

Responda somente em JSON válido:

{
  "steps": [
    {
      "target": "nome-do-agente",
      "reason": "por que este agente deve ser acionado",
      "content": "instrução objetiva para este agente"
    }
  ]
}

Regras:
- Use apenas agentes da lista.
- Não invente agentes.
- Para tarefas ambíguas, acione primeiro um agente capaz de identificar contexto.
- Se for necessário consolidar resposta final, acione summary-agent.
`;

    const response = await this.llm.chat({
      model: "llama3.1",
      format: "json",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userRequest }
      ]
    });

    return this.validatePlan(JSON.parse(response));
  }

  private validatePlan(plan: PlannerResponse): PlannerResponse {
    const availableAgents = new Set(
      this.registry.getCatalog().map(agent => agent.name)
    );

    const validSteps = plan.steps.filter(step => {
      return availableAgents.has(step.target);
    });

    return {
      steps: validSteps
    };
  }

  private dispatch(parentEvent: EventEnvelope, step: PlannerStep) {
    this.eventBus.publish({
      eventId: crypto.randomUUID(),
      correlationId: parentEvent.correlationId,

      conversationId: parentEvent.conversationId,
      rootTaskId: parentEvent.rootTaskId,
      taskId: crypto.randomUUID(),
      parentTaskId: parentEvent.taskId,

      type: "agent.command",
      source: this.metadata.name,
      target: step.target,

      payload: {
        content: step.content,
        reason: step.reason
      },

      createdAt: new Date().toISOString()
    });
  }

  private say(parentEvent: EventEnvelope, content: string) {
    this.eventBus.publish({
      eventId: crypto.randomUUID(),
      correlationId: parentEvent.correlationId,

      conversationId: parentEvent.conversationId,
      rootTaskId: parentEvent.rootTaskId,
      taskId: parentEvent.taskId,
      parentTaskId: parentEvent.parentTaskId,

      type: "agent.message",
      source: this.metadata.name,

      payload: {
        content
      },

      createdAt: new Date().toISOString()
    });
  }
}