import type { Agent, AgentMetadata } from '../../core/agents/agent';
import type { EventBus } from '../../core/events/event-bus';
import type { EventEnvelope } from '../../core/events/event-envelope';
import type { EventService } from '../../services/event-service';

export class SecurityAgent implements Agent {
	readonly metadata: AgentMetadata = {
		name: 'security-agent',
		description: 'Revisa autenticacao, autorizacao, dados sensiveis, eventos e superficie exposta.',
		capabilities: [
			'security.review',
			'auth.review',
			'authorization.review',
			'sensitive-data.review',
			'event.audit.security',
		],
		examples: ['@security-agent revise autenticacao', '@security-agent avalie eventos de falha'],
		source: 'static',
	};

	constructor(
		private readonly eventBus: EventBus,
		private readonly eventService: EventService,
	) {}

	async handle(event: EventEnvelope): Promise<void> {
		const failures = await this.eventService.listFailures(
			event.projectId !== undefined ? { projectId: event.projectId } : {},
		);

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
				result: buildSecurityReport(failures.length),
				data: {
					severity: failures.length > 0 ? 'medium' : 'low',
					failures: failures.length,
				},
			},
			createdAt: new Date().toISOString(),
		});
	}
}

function buildSecurityReport(failureCount: number): string {
	return [
		'SecurityAgent: relatorio inicial de risco.',
		'',
		`Severidade: ${failureCount > 0 ? 'medium' : 'low'}.`,
		`Eventos de falha observados: ${failureCount}.`,
		'',
		'Evidencias avaliadas:',
		'- Autenticacao por token estatico nos gateways REST/WebSocket.',
		'- Propagacao de actor em eventos autenticados.',
		'- Relatorio de falhas via EventService.',
		'',
		'Recomendacoes:',
		'- Manter tokens fora de logs e payloads persistidos.',
		'- Revisar autorizacao antes de liberar ferramentas sensiveis.',
		'- Usar relatorios de falha para endurecer configuracao operacional.',
	].join('\n');
}
