import { spawn } from 'node:child_process';
import type { Agent, AgentMetadata } from '../../core/agents/agent';
import type { EventBus } from '../../core/events/event-bus';
import type { EventEnvelope } from '../../core/events/event-envelope';
import type { ExternalAgentDefinition } from '../../domain';

export class ExternalAgent implements Agent {
	readonly metadata: AgentMetadata;

	constructor(
		private readonly definition: ExternalAgentDefinition,
		private readonly eventBus: EventBus,
	) {
		this.metadata = {
			name: definition.name,
			description: definition.description,
			...(definition.capabilities !== undefined ? { capabilities: definition.capabilities } : {}),
			...(definition.examples !== undefined ? { examples: definition.examples } : {}),
			...(definition.limits !== undefined ? { limits: definition.limits } : {}),
			source: 'external',
		};
	}

	async handle(event: EventEnvelope): Promise<void> {
		const result =
			this.definition.transport.type === 'http'
				? await this.callHttp(event)
				: await this.callCli(event);

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
				result,
			},
			createdAt: new Date().toISOString(),
		});
	}

	private async callHttp(event: EventEnvelope): Promise<string> {
		if (this.definition.transport.type !== 'http') {
			throw new Error('Transporte externo HTTP nao configurado.');
		}

		const response = await fetch(this.definition.transport.url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({ event }),
		});

		if (!response.ok) {
			throw new Error(`Agente externo HTTP retornou ${response.status}.`);
		}

		const payload = (await response.json()) as unknown;
		return readExternalResult(payload);
	}

	private async callCli(event: EventEnvelope): Promise<string> {
		if (this.definition.transport.type !== 'cli') {
			throw new Error('Transporte externo CLI nao configurado.');
		}

		return await new Promise((resolve, reject) => {
			const child = spawn(this.definition.transport.command, this.definition.transport.args ?? [], {
				shell: false,
				windowsHide: true,
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			const stdout: Buffer[] = [];
			const stderr: Buffer[] = [];

			child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
			child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
			child.stdin.on('error', error => {
				if (!isBrokenPipe(error)) {
					reject(error);
				}
			});
			child.on('error', reject);
			child.on('close', exitCode => {
				if (exitCode !== 0) {
					reject(
						new Error(
							`Agente externo CLI finalizado com exit code ${exitCode}: ${Buffer.concat(stderr).toString('utf8').trim()}`,
						),
					);
					return;
				}

				resolve(Buffer.concat(stdout).toString('utf8').trim());
			});

			child.stdin.end(JSON.stringify({ event }));
		});
	}
}

function readExternalResult(payload: unknown): string {
	if (typeof payload === 'string') {
		return payload;
	}

	if (!payload || typeof payload !== 'object') {
		return JSON.stringify(payload);
	}

	const record = payload as Record<string, unknown>;

	if (typeof record['result'] === 'string') {
		return record['result'];
	}

	return JSON.stringify(payload);
}

function isBrokenPipe(error: Error): boolean {
	return 'code' in error && error.code === 'EPIPE';
}
