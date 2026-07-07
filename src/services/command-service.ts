import { randomUUID } from "node:crypto";

import { type EventBus } from "../core/events/event-bus";
import { type AgentRegistry } from "../core/agents/agent-registry";
import { parseCommand } from "../gateway/command-parser";

export type HandleUserCommandInput = {
  conversationId?: string;
  content: string;
  source: string;
};

export type HandleUserCommandResult = {
  conversationId: string;
  taskId: string;
  correlationId: string;
  target: string;
};

export class CommandService {
  constructor(
    private readonly eventBus: EventBus,
    private readonly agentRegistry: AgentRegistry,
  ) {}

  async handleUserCommand(input: HandleUserCommandInput): Promise<HandleUserCommandResult> {
    const parsed = parseCommand(input.content, this.agentRegistry);

    const conversationId = input.conversationId ?? "conv-local";
    const taskId = randomUUID();
    const correlationId = randomUUID();
    const createdAt = new Date().toISOString();

    await this.eventBus.publish({
      eventId: randomUUID(),
      correlationId,
      conversationId,
      rootTaskId: taskId,
      taskId,
      type: "human.instruction",
      source: input.source,
      target: parsed.target,
      payload: {
        rawContent: input.content,
        content: parsed.content,
        mention: parsed.mention,
      },
      createdAt,
    });

    await this.eventBus.publish({
      eventId: randomUUID(),
      correlationId,
      conversationId,
      rootTaskId: taskId,
      taskId,
      type: "agent.command",
      source: "command-service",
      target: parsed.target,
      payload: {
        content: parsed.content,
      },
      createdAt: new Date().toISOString(),
    });

    return {
      conversationId,
      taskId,
      correlationId,
      target: parsed.target,
    };
  }
}
