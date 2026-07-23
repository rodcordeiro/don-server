import { randomUUID } from 'node:crypto';

import { type EventBus } from '../core/events/event-bus';
import { type AgentRegistry } from '../core/agents/agent-registry';
import { parseCommand } from '../gateway/command-parser';
import type { UserCommand } from '../domain';

export type HandleUserCommandInput = UserCommand;

export type HandleUserCommandResult = {
	conversationId: string;
	projectId?: string;
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

		const conversationId = input.conversationId ?? 'conv-local';
		const taskId = randomUUID();
		const correlationId = randomUUID();
		const createdAt = new Date().toISOString();

		await this.eventBus.publish({
			eventId: randomUUID(),
			correlationId,
			conversationId,
			...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
			rootTaskId: taskId,
			taskId,
			type: 'human.instruction',
			source: input.source,
			target: parsed.target,
			actor: input.actor,
			payload: {
				rawContent: input.content,
				content: parsed.content,
				...(parsed.mention !== undefined ? { mention: parsed.mention } : {}),
			},
			createdAt,
		});

		await this.eventBus.publish({
			eventId: randomUUID(),
			correlationId,
			conversationId,
			...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
			rootTaskId: taskId,
			taskId,
			type: 'agent.command',
			source: 'command-service',
			target: parsed.target,
			actor: input.actor,
			payload: {
				content: parsed.content,
			},
			createdAt: new Date().toISOString(),
		});

		return {
			conversationId,
			...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
			taskId,
			correlationId,
			target: parsed.target,
		};
	}
}
