import { spawn } from 'node:child_process';
import type { Tool, ToolMetadata } from '../core/tools';
import type { ToolResult } from '../domain';

export type GitToolInput =
	| {
			operation: 'status';
	  }
	| {
			operation: 'diff';
			cached?: boolean;
	  };

export type GitToolOutput = {
	operation: GitToolInput['operation'];
	stdout: string;
	stderr: string;
};

export class GitTool implements Tool<GitToolInput, GitToolOutput> {
	readonly metadata: ToolMetadata = {
		name: 'git-tool',
		description: 'Consulta status e diff do repositorio sem executar operacoes de escrita.',
		capabilities: ['git.status', 'git.diff.readonly'],
		examples: ['Consultar git status', 'Resumir git diff'],
	};

	async execute(input: GitToolInput): Promise<ToolResult<GitToolOutput>> {
		const args =
			input.operation === 'status'
				? ['status', '--short', '--branch']
				: ['diff', ...(input.cached ? ['--cached'] : [])];
		const result = await runGit(args);

		return {
			success: result.exitCode === 0,
			...(result.exitCode === 0 ? {} : { error: `git ${args.join(' ')} falhou.` }),
			output: {
				operation: input.operation,
				stdout: result.stdout,
				stderr: result.stderr,
			},
		};
	}
}

function runGit(
	args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
	return new Promise(resolve => {
		const child = spawn('git', args, {
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
				stdout: '',
				stderr: error.message,
				exitCode: 1,
			});
		});
		child.on('close', exitCode => {
			resolve({
				stdout: stdout.join(''),
				stderr: stderr.join(''),
				exitCode,
			});
		});
	});
}
