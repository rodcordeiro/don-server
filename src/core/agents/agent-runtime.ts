import type { EventBus } from '../events/event-bus';
import type { EventEnvelope } from '../events/event-envelope';
import type { Agent } from './agent';

export class AgentRuntime {
	constructor(
		private readonly eventBus: EventBus,
		private readonly timeoutMs = 30_000,
	) {}

	async execute(agent: Agent, event: EventEnvelope): Promise<void> {
		const startedAt = Date.now();

		await this.publishStarted(agent, event);

		try {
			await withTimeout(agent.handle(event), this.timeoutMs);
			await this.publishCompleted(agent, event, Date.now() - startedAt);
		} catch (error) {
			await this.publishError(agent, event, error, Date.now() - startedAt);
		}
	}

	private async publishStarted(agent: Agent, event: EventEnvelope): Promise<void> {
		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: event.correlationId,
			conversationId: event.conversationId,
			...(event.projectId !== undefined ? { projectId: event.projectId } : {}),
			rootTaskId: event.rootTaskId,
			taskId: event.taskId,
			...(event.parentTaskId !== undefined ? { parentTaskId: event.parentTaskId } : {}),
			...(event.actor !== undefined ? { actor: event.actor } : {}),
			type: 'agent.started',
			source: 'agent-runtime',
			target: agent.metadata.name,
			payload: {
				agent: agent.metadata.name,
			},
			createdAt: new Date().toISOString(),
		});
	}

	private async publishCompleted(
		agent: Agent,
		event: EventEnvelope,
		durationMs: number,
	): Promise<void> {
		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: event.correlationId,
			conversationId: event.conversationId,
			...(event.projectId !== undefined ? { projectId: event.projectId } : {}),
			rootTaskId: event.rootTaskId,
			taskId: event.taskId,
			...(event.parentTaskId !== undefined ? { parentTaskId: event.parentTaskId } : {}),
			...(event.actor !== undefined ? { actor: event.actor } : {}),
			type: 'agent.completed',
			source: 'agent-runtime',
			target: agent.metadata.name,
			payload: {
				agent: agent.metadata.name,
				durationMs,
			},
			createdAt: new Date().toISOString(),
		});
	}

	private async publishError(
		agent: Agent,
		event: EventEnvelope,
		error: unknown,
		durationMs: number,
	): Promise<void> {
		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: event.correlationId,
			conversationId: event.conversationId,
			...(event.projectId !== undefined ? { projectId: event.projectId } : {}),
			rootTaskId: event.rootTaskId,
			taskId: event.taskId,
			...(event.parentTaskId !== undefined ? { parentTaskId: event.parentTaskId } : {}),
			...(event.actor !== undefined ? { actor: event.actor } : {}),
			type: 'agent.error',
			source: 'agent-runtime',
			target: agent.metadata.name,
			payload: {
				error: error instanceof Error ? error.message : 'Erro desconhecido ao executar agente.',
				durationMs,
				timeoutMs: this.timeoutMs,
			},
			createdAt: new Date().toISOString(),
		});
	}
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	let timeout: NodeJS.Timeout | undefined;

	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timeout = setTimeout(() => {
					reject(new Error(`Timeout de agente excedido (${timeoutMs}ms).`));
				}, timeoutMs);
			}),
		]);
	} finally {
		if (timeout) {
			clearTimeout(timeout);
		}
	}
}
