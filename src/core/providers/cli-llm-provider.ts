import { spawn } from 'node:child_process';
import { cwd } from 'node:process';
import type { ChatMessage, LlmChatParams, LlmProvider } from './llm-provider';

export type CliLlmProviderOptions = {
	name: string;
	command: string;
	args?: string[] | undefined;
	cwd?: string | undefined;
	timeoutMs?: number | undefined;
	maxOutputBytes?: number | undefined;
};

export class CliLlmProvider implements LlmProvider {
	name: string;
	private readonly command: string;
	private readonly args: string[];
	private readonly cwd: string;
	private readonly timeoutMs: number;
	private readonly maxOutputBytes: number;

	constructor(options: CliLlmProviderOptions) {
		this.name = options.name;
		this.command = options.command;
		this.args = options.args ?? [];
		this.cwd = options.cwd ?? cwd();
		this.timeoutMs = options.timeoutMs ?? 60_000;
		this.maxOutputBytes = options.maxOutputBytes ?? 256_000;
	}

	async chat(params: LlmChatParams): Promise<string> {
		const prompt = buildPrompt(params.messages, params.format);
		const args = this.args.map(arg => {
			return arg.replaceAll('{{prompt}}', prompt).replaceAll('{{model}}', params.model);
		});
		const writesPromptToArgs = this.args.some(arg => arg.includes('{{prompt}}'));
		const output = await this.run(args, writesPromptToArgs ? undefined : prompt);

		return params.format === 'json' ? normalizeJsonResponse(output) : output.trim();
	}

	private async run(args: string[], stdin: string | undefined): Promise<string> {
		return await new Promise((resolve, reject) => {
			const child = spawn(this.command, args, {
				cwd: this.cwd,
				shell: false,
				windowsHide: true,
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			const stdout: Buffer[] = [];
			const stderr: Buffer[] = [];
			let settled = false;

			const timeout = setTimeout(() => {
				settled = true;
				child.kill('SIGTERM');
				reject(new Error(`Timeout do provider CLI excedido (${this.timeoutMs}ms).`));
			}, this.timeoutMs);

			child.stdout.on('data', (chunk: Buffer) => {
				if (settled) {
					return;
				}

				stdout.push(chunk);
				if (Buffer.concat(stdout).byteLength > this.maxOutputBytes) {
					settled = true;
					clearTimeout(timeout);
					child.kill('SIGTERM');
					reject(new Error(`Saida do provider CLI excedeu ${this.maxOutputBytes} bytes.`));
				}
			});

			child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
			child.on('error', error => {
				if (!settled) {
					settled = true;
					clearTimeout(timeout);
					reject(error);
				}
			});
			child.on('close', exitCode => {
				if (settled) {
					return;
				}

				settled = true;
				clearTimeout(timeout);

				if (exitCode !== 0) {
					reject(
						new Error(
							`Provider CLI finalizado com exit code ${exitCode}: ${Buffer.concat(stderr).toString('utf8').trim()}`,
						),
					);
					return;
				}

				resolve(Buffer.concat(stdout).toString('utf8'));
			});

			if (stdin !== undefined) {
				child.stdin.end(stdin);
			} else {
				child.stdin.end();
			}
		});
	}
}

function buildPrompt(messages: ChatMessage[], format: 'json' | undefined): string {
	const lines = messages.map(message => `${message.role.toUpperCase()}:\n${message.content}`);

	if (format === 'json') {
		lines.push('Responda apenas JSON valido, sem markdown.');
	}

	return lines.join('\n\n');
}

function normalizeJsonResponse(output: string): string {
	const trimmed = output.trim();
	const parsed = parseJson(trimmed) ?? parseJson(extractFencedJson(trimmed));

	if (!parsed) {
		throw new Error('Provider CLI nao retornou JSON valido.');
	}

	return JSON.stringify(parsed.value);
}

function parseJson(content: string | undefined): { value: unknown } | undefined {
	if (!content) {
		return undefined;
	}

	try {
		return { value: JSON.parse(content) as unknown };
	} catch {
		return undefined;
	}
}

function extractFencedJson(content: string): string | undefined {
	const match = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
	return match?.[1]?.trim();
}
