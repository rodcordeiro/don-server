import type { Agent, AgentMetadata } from '../../core/agents/agent';
import type { EventBus } from '../../core/events/event-bus';
import type { EventEnvelope } from '../../core/events/event-envelope';

export class RabbitAgent implements Agent {
	readonly metadata: AgentMetadata = {
		name: 'rabbit-agent',
		description: 'Prepara diagnostico operacional RabbitMQ com guardrails para acoes sensiveis.',
		capabilities: [
			'rabbitmq.diagnostics',
			'rabbitmq.threshold-alerts',
			'rabbitmq.operational-report',
			'rabbitmq.safe-actions',
		],
		examples: ['@rabbit-agent diagnostique filas', '@rabbit-agent relatorio operacional rabbitmq'],
		source: 'static',
	};

	constructor(private readonly eventBus: EventBus) {}

	async handle(event: EventEnvelope): Promise<void> {
		const payload = event.payload as Record<string, unknown>;
		const instruction =
			typeof payload['content'] === 'string' ? payload['content'].toLowerCase() : '';
		const sensitiveActionRequested = ['purge', 'requeue', 'apagar', 'limpar'].some(term =>
			instruction.includes(term),
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
				result: buildRabbitReport(sensitiveActionRequested),
				data: {
					toolConfigured: false,
					sensitiveActionBlocked: sensitiveActionRequested,
					audit: 'RabbitAgent executou diagnostico preparatorio sem conectar ao RabbitMQ.',
				},
			},
			createdAt: new Date().toISOString(),
		});
	}
}

function buildRabbitReport(sensitiveActionRequested: boolean): string {
	return [
		'RabbitAgent: relatorio operacional preparatorio.',
		'',
		'Diagnostico de filas: RabbitMQTool ainda nao configurado; nenhuma fila foi consultada.',
		'Alertas por limiar: aplicar alerta quando mensagens prontas/nao reconhecidas excederem limite configurado.',
		'Relatorio operacional: incluir filas, consumidores, ready/unacked e recomendacoes por exchange/fila.',
		`Acoes seguras: ${sensitiveActionRequested ? 'acao sensivel solicitada e bloqueada.' : 'purge/requeue exigem confirmacao explicita quando RabbitMQTool existir.'}`,
		'Auditoria: toda consulta ou acao operacional deve publicar evento antes/depois.',
	].join('\n');
}
