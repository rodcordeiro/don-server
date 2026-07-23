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
					riskCatalog: RISK_CATALOG,
					toolPolicies: TOOL_POLICIES,
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
		'Catalogo de riscos:',
		...RISK_CATALOG.map(risk => `- ${risk.severity}: ${risk.category} - ${risk.recommendation}`),
		'',
		'Politicas por ferramenta:',
		...TOOL_POLICIES.map(policy => `- ${policy.tool}: ${policy.policy}`),
		'',
		'Deteccao de segredo:',
		'- Sinalizar token, secret, password, api key e Authorization Bearer em outputs/eventos.',
		'',
		'Checklist de deploy seguro:',
		'- DON_SERVER_TOKEN configurado e fora do repositorio.',
		'- Logs sem tokens ou payloads sensiveis.',
		'- CORS/origem revisados antes de exposicao externa.',
		'- Providers/CLI externos com timeout e cwd controlado.',
		'',
		'Recomendacoes:',
		'- Manter tokens fora de logs e payloads persistidos.',
		'- Revisar autorizacao antes de liberar ferramentas sensiveis.',
		'- Usar relatorios de falha para endurecer configuracao operacional.',
	].join('\n');
}

const RISK_CATALOG = [
	{
		severity: 'high',
		category: 'secret-exposure',
		recommendation: 'Mascarar segredos em logs, eventos e diffs.',
	},
	{
		severity: 'medium',
		category: 'tool-execution',
		recommendation: 'Restringir comandos e exigir allowlist.',
	},
	{
		severity: 'medium',
		category: 'external-agent',
		recommendation: 'Aplicar timeout, cwd controlado e auditoria.',
	},
	{
		severity: 'low',
		category: 'static-token',
		recommendation: 'Migrar para JWT/OAuth quando houver multiusuario real.',
	},
];

const TOOL_POLICIES = [
	{ tool: 'ShellTool', policy: 'dry-run por padrao; execucao real apenas com allowlist.' },
	{ tool: 'FilesystemTool', policy: 'acesso restrito a raiz permitida.' },
	{ tool: 'GitTool', policy: 'read-only para status/diff; escrita bloqueada.' },
	{ tool: 'HTTP/ExternalAgent', policy: 'timeout, payload minimo e auditoria por evento.' },
];
