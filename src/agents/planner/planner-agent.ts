// src/agents/planner/planner-agent.ts

import { type EventBus } from '../../core/events/event-bus';
import type { Agent, AgentMetadata } from '../../core/agents/agent';
import { type AgentRegistry } from '../../core/agents/agent-registry';
import { type ProviderRegistry } from '../../core/providers/provider-registry';
import type { EventEnvelope } from '../../core/events/event-envelope';
import type { ExecutionPlan, ExecutionStep } from '../../domain';
import { parseExecutionPlan } from './execution-plan-validator';
import { buildPlannerPrompt } from './planner-prompt-builder';

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
		const payload = event.payload as Record<string, unknown>;
		const content = typeof payload['content'] === 'string' ? payload['content'] : '';

		await this.say(event, 'Vou analisar quais agentes devem ser acionados.');

		const plan = await this.createPlan(content);

		await this.say(event, `Vou acionar: ${plan.steps.map(step => step.target).join(', ')}.`);

		for (const step of plan.steps) {
			await this.dispatch(event, step);
		}
	}

	private async createPlan(userRequest: string): Promise<ExecutionPlan> {
		const deterministicPlan = this.createDeterministicPlan(userRequest);

		if (deterministicPlan) {
			return deterministicPlan;
		}

		const catalog = this.registry.getCatalog().filter(agent => agent.name !== this.metadata.name);
		const response = await this.providerRegistry.chat({
			...this.metadata.llm,
			format: 'json',
			messages: [
				{ role: 'system', content: buildPlannerPrompt(catalog) },
				{ role: 'user', content: userRequest },
			],
		});

		return parseExecutionPlan(response, new Set(catalog.map(agent => agent.name)));
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
				},
			];

			if (mentionsGit(normalized) && technicalTarget !== 'git-agent') {
				steps.push({
					id: 'git-1',
					target: 'git-agent',
					instruction: userRequest,
					reason: 'Pedido tambem precisa de contexto Git read-only.',
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
				},
				{
					id: 'summary-1',
					target: 'summary-agent',
					instruction: 'Consolide o resultado do levantamento de backlog para o usuario.',
					reason: 'Pedido de backlog precisa de resposta final resumida.',
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

function selectTechnicalTarget(normalizedRequest: string): string | undefined {
	if (mentionsGit(normalizedRequest)) {
		return 'git-agent';
	}

	if (normalizedRequest.includes('backend') || normalizedRequest.includes('api')) {
		return 'backend-agent';
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

	return undefined;
}
