import type { Agent, AgentMetadata } from '../../core/agents/agent';
import type { EventBus } from '../../core/events/event-bus';
import type { EventEnvelope } from '../../core/events/event-envelope';
import type { ProviderRegistry } from '../../core/providers/provider-registry';
import type { AgentDefinition } from '../../domain';

export class DynamicAgent implements Agent {
	readonly metadata: AgentMetadata;

	constructor(
		private readonly definition: AgentDefinition,
		private readonly eventBus: EventBus,
		private readonly providerRegistry: ProviderRegistry,
	) {
		this.metadata = {
			name: definition.name,
			description: definition.description,
			...(definition.capabilities !== undefined ? { capabilities: definition.capabilities } : {}),
			...(definition.examples !== undefined ? { examples: definition.examples } : {}),
			...(definition.llm !== undefined ? { llm: definition.llm } : {}),
			...(definition.limits !== undefined ? { limits: definition.limits } : {}),
			source: 'dynamic',
		};
	}

	async handle(event: EventEnvelope): Promise<void> {
		const payload = event.payload as Record<string, unknown>;
		const content = typeof payload['content'] === 'string' ? payload['content'] : '';
		const response = await this.providerRegistry.chat({
			...this.definition.llm,
			messages: [
				{ role: 'system', content: this.definition.instruction },
				{ role: 'user', content },
			],
		});

		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: event.correlationId,
			conversationId: event.conversationId,
			...(event.projectId !== undefined ? { projectId: event.projectId } : {}),
			rootTaskId: event.rootTaskId,
			taskId: event.taskId,
			...(event.parentTaskId !== undefined ? { parentTaskId: event.parentTaskId } : {}),
			...(event.actor !== undefined ? { actor: event.actor } : {}),
			type: 'agent.result',
			source: this.metadata.name,
			payload: {
				status: 'completed',
				result: response,
			},
			createdAt: new Date().toISOString(),
		});
	}
}
