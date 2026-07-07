// src/agents/planner/planner-agent.ts

import { type EventBus } from "../../core/events/event-bus";
import type { Agent, AgentMetadata } from "../../core/agents/agent";
import { type AgentRegistry } from "../../core/agents/agent-registry";
import { type ProviderRegistry } from "../../core/providers/provider-registry";
import type { EventEnvelope } from "../../core/events/event-envelope";
import type { ExecutionPlan, ExecutionStep } from "../../domain";
import { parseExecutionPlan } from "./execution-plan-validator";
import { buildPlannerPrompt } from "./planner-prompt-builder";

export class PlannerAgent implements Agent {
  metadata: AgentMetadata = {
    name: "planner-agent",
    description: "Planeja tarefas, escolhe agentes e delega subtarefas.",
    capabilities: [
      "analisar pedido do usuario",
      "selecionar agentes",
      "criar subtarefas",
      "delegar execucao",
    ],
    examples: [
      "@planner levante o backlog pendente deste projeto",
      "@planner revise o projeto e rode os testes",
    ],
  };

  constructor(
    private readonly eventBus: EventBus,
    private readonly registry: AgentRegistry,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  async handle(event: EventEnvelope) {
    const payload = event.payload as Record<string, unknown>;
    const content = typeof payload["content"] === "string" ? payload["content"] : "";

    await this.say(event, "Vou analisar quais agentes devem ser acionados.");

    const plan = await this.createPlan(content);

    await this.say(event, `Vou acionar: ${plan.steps.map(step => step.target).join(", ")}.`);

    for (const step of plan.steps) {
      await this.dispatch(event, step);
    }
  }

  private async createPlan(userRequest: string): Promise<ExecutionPlan> {
    const catalog = this.registry.getCatalog().filter(agent => agent.name !== this.metadata.name);
    const llm = this.providerRegistry.get("ollama");

    if (!llm) {
      throw new Error("Provider ollama nao encontrado.");
    }

    const response = await llm.chat({
      model: "llama3.1",
      format: "json",
      messages: [
        { role: "system", content: buildPlannerPrompt(catalog) },
        { role: "user", content: userRequest },
      ],
    });

    return parseExecutionPlan(response, new Set(catalog.map(agent => agent.name)));
  }

  private async dispatch(parentEvent: EventEnvelope, step: ExecutionStep) {
    await this.eventBus.publish({
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
        content: step.instruction,
        reason: step.reason,
        stepId: step.id,
      },

      createdAt: new Date().toISOString(),
    });
  }

  private async say(parentEvent: EventEnvelope, content: string) {
    await this.eventBus.publish({
      eventId: crypto.randomUUID(),
      correlationId: parentEvent.correlationId,

      conversationId: parentEvent.conversationId,
      rootTaskId: parentEvent.rootTaskId,
      taskId: parentEvent.taskId,
      ...(parentEvent.parentTaskId !== undefined ? { parentTaskId: parentEvent.parentTaskId } : {}),

      type: "agent.message",
      source: this.metadata.name,

      payload: {
        content,
      },

      createdAt: new Date().toISOString(),
    });
  }
}
