import { randomUUID } from 'node:crypto';

import { type EventBus } from '../core/events/event-bus';
import { type AgentRegistry } from '../core/agents/agent-registry';
import { parseCommand } from '../gateway/command-parser';
import type { UserCommand } from '../domain';
import type { DynamicAgentService } from './dynamic-agent-service';
import type { ExternalAgentService } from './external-agent-service';

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
		private readonly dynamicAgentService?: DynamicAgentService,
		private readonly externalAgentService?: ExternalAgentService,
	) {}

	async handleUserCommand(input: HandleUserCommandInput): Promise<HandleUserCommandResult> {
		const registration = parseAgentRegistration(input.content);
		const externalRegistration = parseExternalAgentRegistration(input.content);
		const parsed =
			registration || externalRegistration
				? { target: 'agent-registry', content: input.content, mention: undefined }
				: parseCommand(input.content, this.agentRegistry);

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

		if (registration) {
			const result = this.registerDynamicAgent(registration.definition);
			await this.publishRegistrationResult(input, conversationId, taskId, correlationId, result);

			return {
				conversationId,
				...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
				taskId,
				correlationId,
				target: parsed.target,
			};
		}

		if (externalRegistration) {
			const result = this.registerExternalAgent(externalRegistration.definition);
			await this.publishRegistrationResult(input, conversationId, taskId, correlationId, result);

			return {
				conversationId,
				...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
				taskId,
				correlationId,
				target: parsed.target,
			};
		}

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

	private async publishRegistrationResult(
		input: HandleUserCommandInput,
		conversationId: string,
		taskId: string,
		correlationId: string,
		result: { name: string; description: string },
	): Promise<void> {
		await this.eventBus.publish({
			eventId: randomUUID(),
			correlationId,
			conversationId,
			...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
			rootTaskId: taskId,
			taskId,
			type: 'agent.result',
			source: 'agent-registry',
			actor: input.actor,
			payload: {
				status: 'completed',
				result: `Agente registrado: ${result.name}.`,
				data: result,
			},
			createdAt: new Date().toISOString(),
		});
	}

	private registerDynamicAgent(definition: unknown) {
		if (!this.dynamicAgentService) {
			throw new Error('Registro dinamico de agentes nao configurado.');
		}

		return this.dynamicAgentService.register(definition);
	}

	private registerExternalAgent(definition: unknown) {
		if (!this.externalAgentService) {
			throw new Error('Registro de agentes externos nao configurado.');
		}

		return this.externalAgentService.register(definition);
	}
}

function parseAgentRegistration(content: string): { definition: unknown } | undefined {
	const trimmed = content.trim();
	const prefixMatch = trimmed.match(/^\/agents?\s+register\s+/i);

	if (!prefixMatch) {
		return undefined;
	}

	return {
		definition: JSON.parse(trimmed.slice(prefixMatch[0].length)) as unknown,
	};
}

function parseExternalAgentRegistration(content: string): { definition: unknown } | undefined {
	const trimmed = content.trim();
	const prefixMatch = trimmed.match(/^\/external-agents?\s+register\s+/i);

	if (!prefixMatch) {
		return undefined;
	}

	return {
		definition: JSON.parse(trimmed.slice(prefixMatch[0].length)) as unknown,
	};
}
