import type { ToolResult } from '../../domain';
import type { EventBus } from '../events/event-bus';
import type { EventEnvelope } from '../events/event-envelope';
import type { Tool } from './tool';

export class ToolRuntime {
	constructor(private readonly eventBus: EventBus) {}

	async execute<TInput, TOutput>(
		tool: Tool<TInput, TOutput>,
		input: TInput,
		context: EventEnvelope,
	): Promise<ToolResult<TOutput>> {
		const startedAt = Date.now();

		await this.publishStarted(tool, input, context);

		try {
			const result = await tool.execute(input);
			await this.publishResult(tool, result, context, Date.now() - startedAt);
			await this.publishFinished(tool, result, context, Date.now() - startedAt);

			return result;
		} catch (error) {
			const result: ToolResult<TOutput> = {
				success: false,
				error: error instanceof Error ? error.message : 'Erro desconhecido ao executar tool.',
				metadata: {
					durationMs: Date.now() - startedAt,
				},
			};

			await this.publishResult(tool, result, context, Date.now() - startedAt);
			await this.publishError(
				tool,
				result.error ?? 'Erro desconhecido ao executar tool.',
				context,
				Date.now() - startedAt,
			);

			return result;
		}
	}

	private async publishStarted<TInput>(
		tool: Tool<TInput>,
		input: TInput,
		context: EventEnvelope,
	): Promise<void> {
		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: context.correlationId,
			conversationId: context.conversationId,
			...(context.projectId !== undefined ? { projectId: context.projectId } : {}),
			rootTaskId: context.rootTaskId,
			taskId: context.taskId,
			...(context.parentTaskId !== undefined ? { parentTaskId: context.parentTaskId } : {}),
			...(context.actor !== undefined ? { actor: context.actor } : {}),
			type: 'tool.started',
			source: 'tool-runtime',
			target: tool.metadata.name,
			payload: {
				tool: tool.metadata.name,
				input,
			},
			createdAt: new Date().toISOString(),
		});
	}

	private async publishResult<TOutput>(
		tool: Tool<unknown, TOutput>,
		result: ToolResult<TOutput>,
		context: EventEnvelope,
		durationMs: number,
	): Promise<void> {
		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: context.correlationId,
			conversationId: context.conversationId,
			...(context.projectId !== undefined ? { projectId: context.projectId } : {}),
			rootTaskId: context.rootTaskId,
			taskId: context.taskId,
			...(context.parentTaskId !== undefined ? { parentTaskId: context.parentTaskId } : {}),
			...(context.actor !== undefined ? { actor: context.actor } : {}),
			type: 'tool.result',
			source: 'tool-runtime',
			target: tool.metadata.name,
			payload: {
				...result,
				metadata: {
					...result.metadata,
					durationMs,
				},
			},
			createdAt: new Date().toISOString(),
		});
	}

	private async publishFinished<TOutput>(
		tool: Tool<unknown, TOutput>,
		result: ToolResult<TOutput>,
		context: EventEnvelope,
		durationMs: number,
	): Promise<void> {
		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: context.correlationId,
			conversationId: context.conversationId,
			...(context.projectId !== undefined ? { projectId: context.projectId } : {}),
			rootTaskId: context.rootTaskId,
			taskId: context.taskId,
			...(context.parentTaskId !== undefined ? { parentTaskId: context.parentTaskId } : {}),
			...(context.actor !== undefined ? { actor: context.actor } : {}),
			type: 'tool.finished',
			source: 'tool-runtime',
			target: tool.metadata.name,
			payload: {
				tool: tool.metadata.name,
				output: result.output,
				durationMs,
			},
			createdAt: new Date().toISOString(),
		});
	}

	private async publishError(
		tool: Tool,
		error: string,
		context: EventEnvelope,
		durationMs: number,
	): Promise<void> {
		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: context.correlationId,
			conversationId: context.conversationId,
			...(context.projectId !== undefined ? { projectId: context.projectId } : {}),
			rootTaskId: context.rootTaskId,
			taskId: context.taskId,
			...(context.parentTaskId !== undefined ? { parentTaskId: context.parentTaskId } : {}),
			...(context.actor !== undefined ? { actor: context.actor } : {}),
			type: 'tool.error',
			source: 'tool-runtime',
			target: tool.metadata.name,
			payload: {
				tool: tool.metadata.name,
				error,
				durationMs,
			},
			createdAt: new Date().toISOString(),
		});
	}
}
