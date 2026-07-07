// src/agents/summary/summary-agent.ts

import type { Agent, AgentMetadata } from '../../core/agents/agent';
import { type EventBus } from '../../core/events/event-bus';
import type { EventEnvelope } from '../../core/events/event-envelope';

export class SummaryAgent implements Agent {
	metadata: AgentMetadata = {
		name: 'summary-agent',
		description: 'Consolida resultados de outros agentes e responde ao usuario.',
		capabilities: ['resumir resultados', 'organizar resposta final', 'consolidar subtarefas'],
		examples: ['Resuma o resultado do BacklogAgent', 'Consolide os resultados dos agentes'],
	};

	constructor(private readonly eventBus: EventBus) {}

	async handle(event: EventEnvelope) {
		const payload = event.payload as Record<string, unknown>;
		const content = typeof payload['content'] === 'string' ? payload['content'] : '';

		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: event.correlationId,

			conversationId: event.conversationId,
			rootTaskId: event.rootTaskId,
			taskId: event.taskId,
			...(event.parentTaskId !== undefined ? { parentTaskId: event.parentTaskId } : {}),

			type: 'agent.result',
			source: this.metadata.name,

			payload: {
				status: 'completed',
				result: content.trim()
					? `Resumo consolidado: ${content}`
					: 'Resumo consolidado: nenhum conteudo informado para consolidacao.',
			},

			createdAt: new Date().toISOString(),
		});
	}
}
