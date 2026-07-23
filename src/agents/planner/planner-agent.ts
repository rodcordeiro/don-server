// src/agents/planner/planner-agent.ts

import { type EventBus } from '../../core/events/event-bus';
import type { Agent, AgentMetadata } from '../../core/agents/agent';
import { type AgentRegistry } from '../../core/agents/agent-registry';
import { type ProviderRegistry } from '../../core/providers/provider-registry';
import type { EventEnvelope } from '../../core/events/event-envelope';
import type { ExecutionPlan, ExecutionStep } from '../../domain';
import { parseExecutionPlan } from './execution-plan-validator';
import { buildPlannerPrompt, PLANNER_PROMPT_VERSION } from './planner-prompt-builder';

export class PlannerAgent implements Agent {
	metadata: AgentMetadata = {
		name: 'planner-agent',
		description: 'Planeja tarefas, escolhe agentes e delega subtarefas.',
		capabilities: [
			'analisar pedido do usuario',
			'selecionar agentes',
			'criar subtarefas',
			'delegar execucao',
		],
		examples: [
			'@planner levante o backlog pendente deste projeto',
			'@planner revise o projeto e rode os testes',
			'@planner qual o status do projeto e quais tarefas estao pendentes',
			'@planner estruture as próximas tarefas do projeto e delegue para os agentes apropriados',
			'@planner, organize as tarefas do projeto e consolide os resultados para o usuario',
			'preciso de ajuda para organizar as tarefas do projeto @planner',
		],
	};

	constructor(
		private readonly eventBus: EventBus,
		private readonly registry: AgentRegistry,
		private readonly providerRegistry: ProviderRegistry,
	) {}

	async handle(event: EventEnvelope) {
		const startedAt = Date.now();
		const payload = event.payload as Record<string, unknown>;
		const content = typeof payload['content'] === 'string' ? payload['content'] : '';

		await this.say(event, 'Vou analisar quais agentes devem ser acionados.');

		const plan = await this.createPlan(content);
		const orderedSteps = orderStepsByDependencies(plan.steps);

		await this.say(event, `Vou acionar: ${orderedSteps.map(step => step.target).join(', ')}.`);

		for (const step of orderedSteps) {
			await this.dispatch(event, step);
		}

		await this.say(
			event,
			`Metricas do Planner: prompt=${PLANNER_PROMPT_VERSION}; steps=${orderedSteps.length}; durationMs=${Date.now() - startedAt}.`,
		);
	}

	private async createPlan(userRequest: string): Promise<ExecutionPlan> {
		const deterministicPlan = this.createDeterministicPlan(userRequest);

		if (deterministicPlan) {
			return deterministicPlan;
		}

		const catalog = this.registry.getCatalog().filter(agent => agent.name !== this.metadata.name);
		return await this.createModelPlan(userRequest, catalog);
	}

	private async createModelPlan(
		userRequest: string,
		catalog: ReturnType<AgentRegistry['getCatalog']>,
	) {
		const availableAgents = new Set(catalog.map(agent => agent.name));
		const systemPrompt = buildPlannerPrompt(catalog);
		let lastError: unknown;

		for (let attempt = 1; attempt <= 2; attempt += 1) {
			try {
				const response = await this.providerRegistry.chat({
					...this.metadata.llm,
					format: 'json',
					messages: [
						{ role: 'system', content: systemPrompt },
						{
							role: 'user',
							content:
								attempt === 1
									? userRequest
									: `${userRequest}\n\nReplaneje retornando JSON valido e steps nao vazios.`,
						},
					],
				});

				return parseExecutionPlan(response, availableAgents);
			} catch (error) {
				lastError = error;
			}
		}

		throw lastError instanceof Error
			? lastError
			: new Error('Planner nao conseguiu gerar plano valido.');
	}

	private createDeterministicPlan(userRequest: string): ExecutionPlan | undefined {
		const normalized = userRequest.toLowerCase();

		if (!normalized.includes('backlog')) {
			const technicalTarget = selectTechnicalTarget(normalized);

			if (!technicalTarget) {
				return undefined;
			}

			const steps: ExecutionStep[] = [
				{
					id: 'technical-1',
					target: technicalTarget,
					instruction: userRequest,
					reason: 'Pedido menciona analise tecnica de dominio.',
					score: 0.9,
				},
			];

			if (mentionsGit(normalized) && technicalTarget !== 'git-agent') {
				steps.push({
					id: 'git-1',
					target: 'git-agent',
					instruction: userRequest,
					reason: 'Pedido tambem precisa de contexto Git read-only.',
					score: 0.8,
				});
			}

			return { steps };
		}

		return {
			steps: [
				{
					id: 'backlog-1',
					target: 'backlog-agent',
					instruction: userRequest,
					reason: 'Pedido menciona backlog do projeto.',
					score: 0.95,
				},
				{
					id: 'summary-1',
					target: 'summary-agent',
					instruction: 'Consolide o resultado do levantamento de backlog para o usuario.',
					reason: 'Pedido de backlog precisa de resposta final resumida.',
					score: 0.7,
					dependsOn: ['backlog-1'],
				},
			],
		};
	}

	private async dispatch(parentEvent: EventEnvelope, step: ExecutionStep) {
		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: parentEvent.correlationId,

			conversationId: parentEvent.conversationId,
			...(parentEvent.projectId !== undefined ? { projectId: parentEvent.projectId } : {}),
			rootTaskId: parentEvent.rootTaskId,
			taskId: crypto.randomUUID(),
			parentTaskId: parentEvent.taskId,
			...(parentEvent.actor !== undefined ? { actor: parentEvent.actor } : {}),

			type: 'agent.command',
			source: this.metadata.name,
			target: step.target,

			payload: {
				content: step.instruction,
				reason: step.reason,
				stepId: step.id,
			},

			createdAt: new Date().toISOString(),
		});
	}

	private async say(parentEvent: EventEnvelope, content: string) {
		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: parentEvent.correlationId,

			conversationId: parentEvent.conversationId,
			...(parentEvent.projectId !== undefined ? { projectId: parentEvent.projectId } : {}),
			rootTaskId: parentEvent.rootTaskId,
			taskId: parentEvent.taskId,
			...(parentEvent.parentTaskId !== undefined ? { parentTaskId: parentEvent.parentTaskId } : {}),
			...(parentEvent.actor !== undefined ? { actor: parentEvent.actor } : {}),

			type: 'agent.message',
			source: this.metadata.name,

			payload: {
				content,
			},

			createdAt: new Date().toISOString(),
		});
	}
}

function mentionsGit(normalizedRequest: string): boolean {
	return normalizedRequest.includes('git') || normalizedRequest.includes('diff');
}

function orderStepsByDependencies(steps: ExecutionStep[]): ExecutionStep[] {
	const remaining = new Map(steps.map(step => [step.id, step]));
	const ordered: ExecutionStep[] = [];
	const resolved = new Set<string>();

	while (remaining.size > 0) {
		const ready = [...remaining.values()].filter(step => {
			return (step.dependsOn ?? []).every(dependency => resolved.has(dependency));
		});

		if (ready.length === 0) {
			throw new Error('Plano contem dependencias circulares ou inexistentes.');
		}

		for (const step of ready.sort((left, right) => (right.score ?? 0) - (left.score ?? 0))) {
			ordered.push(step);
			resolved.add(step.id);
			remaining.delete(step.id);
		}
	}

	return ordered;
}

function selectTechnicalTarget(normalizedRequest: string): string | undefined {
	if (normalizedRequest.includes('backend') || normalizedRequest.includes('api')) {
		return 'backend-agent';
	}

	if (
		normalizedRequest.includes('seguranca') ||
		normalizedRequest.includes('security') ||
		normalizedRequest.includes('auth') ||
		normalizedRequest.includes('token') ||
		normalizedRequest.includes('secret')
	) {
		return 'security-agent';
	}

	if (
		normalizedRequest.includes('rabbit') ||
		normalizedRequest.includes('fila') ||
		normalizedRequest.includes('queue')
	) {
		return 'rabbit-agent';
	}

	if (normalizedRequest.includes('frontend') || normalizedRequest.includes('ui')) {
		return 'frontend-agent';
	}

	if (normalizedRequest.includes('mobile') || normalizedRequest.includes('react native')) {
		return 'mobile-agent';
	}

	if (
		normalizedRequest.includes('banco') ||
		normalizedRequest.includes('database') ||
		normalizedRequest.includes('sql')
	) {
		return 'dba-agent';
	}

	if (
		normalizedRequest.includes('devops') ||
		normalizedRequest.includes('deploy') ||
		normalizedRequest.includes('release')
	) {
		return 'devops-release-agent';
	}

	if (mentionsGit(normalizedRequest)) {
		return 'git-agent';
	}

	return undefined;
}
