// src/agents/backlog/backlog-agent.ts

import type { Agent, AgentMetadata } from '../../core/agents/agent';
import { type EventBus } from '../../core/events/event-bus';
import type { EventEnvelope } from '../../core/events/event-envelope';
import { BacklogSource, type BacklogSprint, type BacklogTask } from './backlog-source';

export class BacklogAgent implements Agent {
	metadata: AgentMetadata = {
		name: 'backlog-agent',
		description: 'Consulta backlog, tarefas pendentes, status e prioridades.',
		capabilities: [
			'listar backlog',
			'identificar tarefas pendentes',
			'agrupar por status',
			'resumir prioridades',
		],
		examples: ['Levante tarefas pendentes', 'Liste backlog aberto', 'Mostre itens nao concluidos'],
	};

	constructor(
		private readonly eventBus: EventBus,
		private readonly backlogSource = new BacklogSource(),
	) {}

	async handle(event: EventEnvelope) {
		const sprints = await this.backlogSource.read();
		const pendingTasks = getOpenTasks(sprints);
		const nextSprint = getNextSprint(sprints);

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
				result: formatBacklogResult(pendingTasks, nextSprint),
			},

			createdAt: new Date().toISOString(),
		});
	}
}

function getOpenTasks(sprints: BacklogSprint[]): BacklogTask[] {
	return sprints.flatMap(sprint =>
		sprint.tasks.filter(task => task.status === 'Pendente' || task.status === 'Parcial'),
	);
}

function getNextSprint(sprints: BacklogSprint[]): BacklogSprint | undefined {
	return sprints.find(sprint =>
		sprint.tasks.some(task => task.status === 'Pendente' || task.status === 'Parcial'),
	);
}

function formatBacklogResult(
	pendingTasks: BacklogTask[],
	nextSprint: BacklogSprint | undefined,
): string {
	if (pendingTasks.length === 0) {
		return 'Backlog sem tarefas pendentes ou parciais.';
	}

	const lines = [
		`Backlog real: ${pendingTasks.length} tarefas pendentes/parciais encontradas.`,
		'',
		nextSprint ? `Proxima sprint: ${nextSprint.title}` : 'Proxima sprint: nao identificada.',
	];

	if (nextSprint) {
		lines.push(
			'',
			'Tarefas da proxima sprint:',
			...nextSprint.tasks
				.filter(task => task.status === 'Pendente' || task.status === 'Parcial')
				.map(task => `- ${task.id} (${task.status}): ${task.title} - ${task.deliverable}`),
		);
	}

	return lines.join('\n');
}
