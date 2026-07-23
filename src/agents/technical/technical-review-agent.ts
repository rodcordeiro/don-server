import type { Agent, AgentMetadata } from '../../core/agents/agent';
import type { EventBus } from '../../core/events/event-bus';
import type { EventEnvelope } from '../../core/events/event-envelope';

export type TechnicalReviewProfile = {
	name: string;
	description: string;
	capabilities: string[];
	focusAreas: string[];
	evidenceHints: string[];
	rubric: string[];
	delegationHints: string[];
};

export class TechnicalReviewAgent implements Agent {
	readonly metadata: AgentMetadata;

	constructor(
		private readonly profile: TechnicalReviewProfile,
		private readonly eventBus: EventBus,
	) {
		this.metadata = {
			name: profile.name,
			description: profile.description,
			capabilities: profile.capabilities,
			examples: [`@${profile.name} revise este projeto`, `@${profile.name} aponte riscos tecnicos`],
			source: 'static',
		};
	}

	async handle(event: EventEnvelope): Promise<void> {
		const payload = event.payload as Record<string, unknown>;
		const instruction = typeof payload['content'] === 'string' ? payload['content'] : '';

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
				result: this.buildReview(instruction),
			},
			createdAt: new Date().toISOString(),
		});
	}

	private buildReview(instruction: string): string {
		return [
			`${this.metadata.name}: analise tecnica inicial.`,
			'',
			`Pedido: ${instruction || 'revisao geral'}.`,
			'',
			'Focos:',
			...this.profile.focusAreas.map(area => `- ${area}`),
			'',
			'Rubrica:',
			...this.profile.rubric.map(item => `- ${item}`),
			'',
			'Escopo sugerido de arquivos:',
			...this.profile.evidenceHints.map(hint => `- ${hint}`),
			'',
			'Achados:',
			'- Severidade: info',
			`  Evidencia: ${this.profile.evidenceHints.join(', ')}`,
			'  Recomendacao: coletar contexto Git/testes e aprofundar nos arquivos do escopo antes de alterar codigo.',
			'',
			'Delegacao cruzada sugerida:',
			...this.profile.delegationHints.map(hint => `- ${hint}`),
		].join('\n');
	}
}

export function createTechnicalReviewProfiles(): TechnicalReviewProfile[] {
	return [
		{
			name: 'backend-agent',
			description: 'Analisa APIs, services, regras de negocio, contratos e persistencia backend.',
			capabilities: ['backend.review', 'api.contracts', 'business.rules', 'persistence.review'],
			focusAreas: [
				'rotas e gateways',
				'services e regras de negocio',
				'contratos de dominio',
				'persistencia e erros',
			],
			evidenceHints: ['src/gateway', 'src/services', 'src/domain', 'src/store'],
			rubric: [
				'contratos estaveis',
				'tratamento de erro',
				'limites de autorizacao',
				'persistencia consistente',
			],
			delegationHints: [
				'Acionar dba-agent para risco de dados.',
				'Acionar security-agent para auth/autorizacao.',
			],
		},
		{
			name: 'frontend-agent',
			description: 'Analisa UI web, componentes, estado, integracao e acessibilidade.',
			capabilities: ['frontend.review', 'ui.state', 'accessibility', 'api.integration'],
			focusAreas: [
				'componentes visuais',
				'estado e eventos de UI',
				'integracao com APIs',
				'acessibilidade',
			],
			evidenceHints: ['src/ui', 'src/components', 'rotas REST/WebSocket expostas'],
			rubric: [
				'estado previsivel',
				'feedback visual',
				'acessibilidade basica',
				'contratos de API claros',
			],
			delegationHints: [
				'Acionar backend-agent para contratos REST/WebSocket.',
				'Acionar security-agent para tokens no browser.',
			],
		},
		{
			name: 'mobile-agent',
			description: 'Analisa React Native/Expo, navegacao, estado e comportamento mobile.',
			capabilities: ['mobile.review', 'react-native', 'expo', 'navigation'],
			focusAreas: [
				'navegacao mobile',
				'estado offline/online',
				'integracao com gateways',
				'restricoes de dispositivo',
			],
			evidenceHints: ['app mobile', 'Expo config', 'contratos REST/WebSocket'],
			rubric: [
				'navegacao consistente',
				'resiliencia offline',
				'uso seguro de storage',
				'limites de rede',
			],
			delegationHints: [
				'Acionar backend-agent para contratos.',
				'Acionar devops-release-agent para distribuicao.',
			],
		},
		{
			name: 'dba-agent',
			description: 'Analisa schema, queries, indices, migrations e riscos de dados.',
			capabilities: ['database.review', 'schema.review', 'query.review', 'migration.risk'],
			focusAreas: [
				'schemas e indices',
				'migrations',
				'consultas de eventos',
				'retencao e auditoria de dados',
			],
			evidenceHints: ['src/store', 'sqlite migrations', 'data/events.jsonl'],
			rubric: [
				'integridade de schema',
				'indices adequados',
				'migracoes reversiveis',
				'retencao auditavel',
			],
			delegationHints: [
				'Acionar backend-agent para uso de queries.',
				'Acionar security-agent para dados sensiveis.',
			],
		},
		{
			name: 'devops-release-agent',
			description: 'Analisa build, deploy, ambiente, rollback e confiabilidade operacional.',
			capabilities: ['devops.review', 'release.risk', 'environment.config', 'rollback.planning'],
			focusAreas: [
				'scripts de build',
				'variaveis de ambiente',
				'observabilidade',
				'rollback e operacao',
			],
			evidenceHints: ['package.json', '.env.example', 'docs/security.md', 'logs operacionais'],
			rubric: ['build reproduzivel', 'env documentado', 'observabilidade minima', 'rollback claro'],
			delegationHints: [
				'Acionar security-agent para checklist seguro.',
				'Acionar git-agent para diff/status.',
			],
		},
	];
}
