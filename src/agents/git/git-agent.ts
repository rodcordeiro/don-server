import type { Agent, AgentMetadata } from '../../core/agents/agent';
import type { EventBus } from '../../core/events/event-bus';
import type { EventEnvelope } from '../../core/events/event-envelope';
import { GitTool } from '../../tools';

export class GitAgent implements Agent {
	readonly metadata: AgentMetadata = {
		name: 'git-agent',
		description: 'Consulta contexto Git read-only e centraliza permissoes de status/diff.',
		capabilities: ['git.status', 'git.diff', 'git.context'],
		examples: ['@git-agent status', '@git-agent mostre o diff'],
		source: 'static',
	};

	constructor(
		private readonly eventBus: EventBus,
		private readonly gitTool = new GitTool(),
	) {}

	async handle(event: EventEnvelope): Promise<void> {
		const payload = event.payload as Record<string, unknown>;
		const content = typeof payload['content'] === 'string' ? payload['content'].toLowerCase() : '';
		const includeDiff = content.includes('diff');
		const status = await this.gitTool.execute({ operation: 'status' });
		const diff = includeDiff ? await this.gitTool.execute({ operation: 'diff' }) : undefined;

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
				status: status.success && (diff?.success ?? true) ? 'completed' : 'failed',
				result: formatGitResult(status.output?.stdout, diff?.output?.stdout),
			},
			createdAt: new Date().toISOString(),
		});
	}
}

function formatGitResult(status: string | undefined, diff: string | undefined): string {
	return [
		'GitAgent: contexto Git read-only.',
		'',
		'Status:',
		status?.trim() || 'Sem saida de status.',
		...(diff !== undefined ? ['', 'Diff:', diff.trim() || 'Sem diff.'] : []),
	].join('\n');
}
