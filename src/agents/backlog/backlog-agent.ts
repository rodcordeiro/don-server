// src/agents/backlog/backlog-agent.ts

import type { Agent, AgentMetadata } from '../../core/agents/agent';
import { type EventBus } from '../../core/events/event-bus';
import type { EventEnvelope } from '../../core/events/event-envelope';
import type { ProviderRegistry } from '../../core/providers/provider-registry';
import { BacklogIntentInterpreter, type BacklogIntent } from './backlog-intent';
import {
	BacklogSource,
	type BacklogMutationResult,
	type BacklogSprint,
	type BacklogTask,
} from './backlog-source';

export class BacklogAgent implements Agent {
	metadata: AgentMetadata = {
		name: 'backlog-agent',
		description: 'Consulta backlog, tarefas pendentes, status e prioridades.',
		capabilities: [
			'listar backlog',
			'identificar tarefas pendentes',
			'agrupar por status',
			'resumir prioridades',
			'interpretar recortes de backlog',
			'adicionar tarefa ao backlog',
			'concluir tarefa do backlog',
			'editar tarefa do backlog',
			'remover tarefa do backlog',
		],
		examples: [
			'Levante tarefas pendentes',
			'Liste backlog aberto',
			'Mostre itens nao concluidos',
			'Conclua AG-003.4',
			'Adicione AG-003.9 na Sprint 11 titulo: ...; entregavel: ...',
		],
	};
	private readonly intentInterpreter: BacklogIntentInterpreter;

	constructor(
		private readonly eventBus: EventBus,
		private readonly backlogSource = new BacklogSource(),
		providerRegistry?: ProviderRegistry,
	) {
		this.intentInterpreter = new BacklogIntentInterpreter(providerRegistry);
	}

	async handle(event: EventEnvelope) {
		const sprints = await this.backlogSource.read();
		const content = readInstructionContent(event);
		const intentResult = await this.intentInterpreter.interpret(content, getAllTasks(sprints));
		const result = await this.executeIntent(intentResult.intent, sprints);

		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: event.correlationId,

			conversationId: event.conversationId,
			rootTaskId: event.rootTaskId,
			taskId: event.taskId,
			...(event.parentTaskId !== undefined ? { parentTaskId: event.parentTaskId } : {}),
			...(event.actor !== undefined ? { actor: event.actor } : {}),

			type: 'agent.result',
			source: this.metadata.name,

			payload: {
				status: 'completed',
				result: [
					`BacklogAgent (${intentResult.interpreter}): ${describeIntent(intentResult.intent)}.`,
					'',
					result,
				].join('\n'),
			},

			createdAt: new Date().toISOString(),
		});
	}

	private async executeIntent(intent: BacklogIntent, sprints: BacklogSprint[]): Promise<string> {
		if (intent.action === 'add') {
			return formatMutationResult(
				await this.backlogSource.addTask({
					sprint: intent.sprint,
					id: intent.id,
					title: intent.title,
					status: intent.status ?? 'Pendente',
					deliverable: intent.deliverable,
				}),
			);
		}

		if (intent.action === 'complete') {
			return formatMutationResult(
				await this.backlogSource.updateTask(intent.id, {
					status: 'Concluido',
				}),
			);
		}

		if (intent.action === 'edit') {
			if (!intent.title && !intent.status && !intent.deliverable) {
				throw new Error(`Edicao de ${intent.id} sem campos alteraveis.`);
			}

			return formatMutationResult(
				await this.backlogSource.updateTask(intent.id, {
					...(intent.title !== undefined ? { title: intent.title } : {}),
					...(intent.status !== undefined ? { status: intent.status } : {}),
					...(intent.deliverable !== undefined ? { deliverable: intent.deliverable } : {}),
				}),
			);
		}

		if (intent.action === 'remove') {
			return formatMutationResult(await this.backlogSource.removeTask(intent.id));
		}

		return formatQueryResult(filterTasks(sprints, intent), intent, getNextSprint(sprints));
	}
}

function readInstructionContent(event: EventEnvelope): string {
	const payload = event.payload as Record<string, unknown>;

	return typeof payload['content'] === 'string' ? payload['content'] : '';
}

function getAllTasks(sprints: BacklogSprint[]): BacklogTask[] {
	return sprints.flatMap(sprint => sprint.tasks);
}

function getOpenTasks(sprints: BacklogSprint[]): BacklogTask[] {
	return sprints.flatMap(sprint =>
		sprint.tasks.filter(task => task.status === 'Pendente' || task.status === 'Parcial'),
	);
}

function filterTasks(
	sprints: BacklogSprint[],
	intent: Extract<BacklogIntent, { action: 'query' }>,
) {
	const tasks = getAllTasks(sprints).filter(task => {
		if (intent.id && task.id.toUpperCase() !== intent.id.toUpperCase()) {
			return false;
		}

		if (intent.status && task.status.toLowerCase() !== intent.status.toLowerCase()) {
			return false;
		}

		if (intent.sprint && !task.sprint.toLowerCase().startsWith(intent.sprint.toLowerCase())) {
			return false;
		}

		return true;
	});

	return tasks.length > 0 || intent.id || intent.status || intent.sprint
		? tasks
		: getOpenTasks(sprints);
}

function getNextSprint(sprints: BacklogSprint[]): BacklogSprint | undefined {
	return sprints.find(sprint =>
		sprint.tasks.some(task => task.status === 'Pendente' || task.status === 'Parcial'),
	);
}

function formatQueryResult(
	tasks: BacklogTask[],
	intent: Extract<BacklogIntent, { action: 'query' }>,
	nextSprint: BacklogSprint | undefined,
): string {
	const isDefaultOpenQuery = !intent.id && !intent.status && !intent.sprint;

	if (tasks.length === 0) {
		return isDefaultOpenQuery
			? 'Backlog sem tarefas pendentes ou parciais.'
			: 'Nenhuma tarefa encontrada para o recorte solicitado.';
	}

	if (!isDefaultOpenQuery) {
		return [
			`Backlog real: ${tasks.length} tarefas encontradas para o recorte solicitado.`,
			'',
			...tasks.map(task => `- ${formatTask(task)} (${task.sprint})`),
		].join('\n');
	}

	const lines = [`Backlog real: ${tasks.length} tarefas pendentes/parciais encontradas.`, ''];

	if (nextSprint) {
		lines.push(
			`Proxima sprint: ${nextSprint.title}`,
			'',
			'Tarefas da proxima sprint:',
			...nextSprint.tasks
				.filter(task => task.status === 'Pendente' || task.status === 'Parcial')
				.map(task => `- ${task.id} (${task.status}): ${task.title} - ${task.deliverable}`),
		);
	} else {
		lines.push('Proxima sprint: nao identificada.');
	}

	return lines.join('\n');
}

function formatMutationResult(result: BacklogMutationResult): string {
	const lines = [result.summary];

	if (result.before) {
		lines.push(`Antes: ${formatTask(result.before)}`);
	}

	if (result.after) {
		lines.push(`Depois: ${formatTask(result.after)}`);
	}

	return lines.join('\n');
}

function formatTask(task: BacklogTask): string {
	return `${task.id} (${task.status}) ${task.title} - ${task.deliverable}`;
}

function describeIntent(intent: BacklogIntent): string {
	if (intent.action === 'query') {
		return `consulta${intent.id ? ` por ${intent.id}` : ''}`;
	}

	if (intent.action === 'add') {
		return `adicao de ${intent.id}`;
	}

	if (intent.action === 'complete') {
		return `conclusao de ${intent.id}`;
	}

	if (intent.action === 'edit') {
		return `edicao de ${intent.id}`;
	}

	return `remocao de ${intent.id}`;
}
