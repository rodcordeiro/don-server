import { spawn } from 'node:child_process';
import type { ToolResult } from '../domain';
import type { Tool, ToolMetadata } from '../core/tools';

export type ShellToolInput = {
	command: string;
	args?: string[];
	dryRun?: boolean;
};

type ShellToolOutput = {
	command: string;
	args: string[];
	dryRun: boolean;
	stdout?: string;
	stderr?: string;
	exitCode?: number | null;
};

export class ShellTool implements Tool<ShellToolInput, ShellToolOutput> {
	readonly metadata: ToolMetadata = {
		name: 'shell-tool',
		description: 'Executa comandos permitidos explicitamente ou simula execucao em dry-run.',
		capabilities: ['shell.dry-run', 'shell.allowlist'],
		examples: ['Simular pnpm build', 'Executar comando previamente permitido'],
	};

	constructor(private readonly allowedCommands: readonly string[] = []) {}

	async execute(input: ShellToolInput): Promise<ToolResult<ShellToolOutput>> {
		const args = input.args ?? [];
		const dryRun = input.dryRun ?? true;

		if (dryRun) {
			return {
				success: true,
				output: {
					command: input.command,
					args,
					dryRun: true,
				},
			};
		}

		if (!this.allowedCommands.includes(input.command)) {
			return {
				success: false,
				error: `Comando nao permitido: ${input.command}`,
				output: {
					command: input.command,
					args,
					dryRun: false,
				},
			};
		}

		return await this.runCommand(input.command, args);
	}

	private async runCommand(command: string, args: string[]): Promise<ToolResult<ShellToolOutput>> {
		return await new Promise(resolve => {
			const child = spawn(command, args, {
				shell: false,
				windowsHide: true,
			});
			const stdout: string[] = [];
			const stderr: string[] = [];

			child.stdout.setEncoding('utf8');
			child.stderr.setEncoding('utf8');
			child.stdout.on('data', (chunk: string) => stdout.push(chunk));
			child.stderr.on('data', (chunk: string) => stderr.push(chunk));
			child.on('error', error => {
				resolve({
					success: false,
					error: error.message,
					output: {
						command,
						args,
						dryRun: false,
					},
				});
			});
			child.on('close', exitCode => {
				const output: ShellToolOutput = {
					command,
					args,
					dryRun: false,
					stdout: stdout.join(''),
					stderr: stderr.join(''),
					exitCode,
				};

				resolve({
					success: exitCode === 0,
					...(exitCode === 0 ? {} : { error: `Comando finalizado com exit code ${exitCode}.` }),
					output,
				});
			});
		});
	}
}
