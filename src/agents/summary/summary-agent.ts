// src/agents/summary/summary-agent.ts

import type { Agent, AgentMetadata } from '../../core/agents/agent';
import { type EventBus } from '../../core/events/event-bus';
import type { EventEnvelope } from '../../core/events/event-envelope';
import type { EventService } from '../../services/event-service';

export class SummaryAgent implements Agent {
	metadata: AgentMetadata = {
		name: 'summary-agent',
		description: 'Consolida resultados de outros agentes e responde ao usuario.',
		capabilities: ['resumir resultados', 'organizar resposta final', 'consolidar subtarefas'],
		examples: ['Resuma o resultado do BacklogAgent', 'Consolide os resultados dos agentes'],
	};

	constructor(
		private readonly eventBus: EventBus,
		private readonly eventService?: EventService,
	) {}

	async handle(event: EventEnvelope) {
		const payload = event.payload as Record<string, unknown>;
		const content = typeof payload['content'] === 'string' ? payload['content'] : '';
		const relatedEvents = this.eventService
			? await this.eventService.listByTask(event.rootTaskId)
			: [];
		const relatedResults = relatedEvents.filter(candidate => {
			return candidate.type === 'agent.result' && candidate.source !== this.metadata.name;
		});
		const failures = relatedEvents.filter(candidate => {
			return candidate.type === 'agent.error' || candidate.type === 'tool.error';
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
				result: buildSummary(content, relatedResults, failures),
				data: {
					audience: detectAudience(content),
					relatedResults: relatedResults.length,
					failures: failures.length,
					evidenceEventIds: relatedResults.slice(0, 5).map(candidate => candidate.eventId),
				},
			},

			createdAt: new Date().toISOString(),
		});
	}
}

function buildSummary(
	content: string,
	relatedResults: EventEnvelope[],
	failures: EventEnvelope[],
): string {
	const lines = [
		`Resumo consolidado (${detectAudience(content)}):`,
		content.trim() || 'Nenhum conteudo informado para consolidacao.',
		'',
		`Resultados relacionados: ${relatedResults.length}.`,
		`Riscos/falhas destacados: ${failures.length}.`,
	];

	for (const result of relatedResults.slice(0, 3)) {
		const payload = result.payload as Record<string, unknown>;
		lines.push(`- ${result.source}: ${stringifySummaryValue(payload['result']).slice(0, 240)}`);
	}

	if (failures.length > 0) {
		lines.push('', 'Riscos:');
		for (const failure of failures.slice(0, 3)) {
			lines.push(`- ${failure.type} em ${failure.source} (${failure.eventId})`);
		}
	}

	lines.push(
		'',
		`Evidencias: ${
			relatedResults
				.slice(0, 5)
				.map(result => result.eventId)
				.join(', ') || 'nenhuma'
		}.`,
	);

	return limitSummary(lines.join('\n'));
}

function detectAudience(content: string): 'tecnico' | 'executivo' | 'operacional' {
	const normalized = content.toLowerCase();

	if (normalized.includes('executivo')) {
		return 'executivo';
	}

	if (normalized.includes('operacional')) {
		return 'operacional';
	}

	return 'tecnico';
}

function limitSummary(content: string): string {
	return content.length <= 1_500 ? content : `${content.slice(0, 1_497)}...`;
}

function stringifySummaryValue(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}

	if (value === undefined || value === null) {
		return '';
	}

	return JSON.stringify(value);
}
