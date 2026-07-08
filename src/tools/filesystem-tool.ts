import { promises as fs } from 'node:fs';
import { resolve, relative } from 'node:path';
import type { ToolResult } from '../domain';
import type { Tool, ToolMetadata } from '../core/tools';

type FilesystemToolInput =
	| {
			operation: 'list';
			path?: string;
	  }
	| {
			operation: 'read';
			path: string;
	  };

type FilesystemToolOutput =
	| {
			operation: 'list';
			path: string;
			entries: Array<{
				name: string;
				type: 'file' | 'directory' | 'other';
			}>;
	  }
	| {
			operation: 'read';
			path: string;
			content: string;
	  };

export class FilesystemTool implements Tool<FilesystemToolInput, FilesystemToolOutput> {
	readonly metadata: ToolMetadata = {
		name: 'filesystem-tool',
		description: 'Lista diretorios e le arquivos dentro de uma raiz permitida.',
		capabilities: ['filesystem.list', 'filesystem.read'],
		examples: ['Listar docs', 'Ler docs/backlog.md'],
	};

	constructor(private readonly allowedRoot = process.cwd()) {}

	async execute(input: FilesystemToolInput): Promise<ToolResult<FilesystemToolOutput>> {
		const targetPath = this.resolveAllowedPath(input.path ?? '.');

		if (input.operation === 'list') {
			const entries = await fs.readdir(targetPath, { withFileTypes: true });

			return {
				success: true,
				output: {
					operation: 'list',
					path: this.toRelativePath(targetPath),
					entries: entries.map(entry => ({
						name: entry.name,
						type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
					})),
				},
			};
		}

		const content = await fs.readFile(targetPath, 'utf8');

		return {
			success: true,
			output: {
				operation: 'read',
				path: this.toRelativePath(targetPath),
				content,
			},
		};
	}

	private resolveAllowedPath(path: string): string {
		const root = resolve(this.allowedRoot);
		const targetPath = resolve(root, path);
		const relativePath = relative(root, targetPath);

		if (relativePath.startsWith('..') || relativePath === '..' || relativePath.includes(':')) {
			throw new Error(`Caminho fora da raiz permitida: ${path}`);
		}

		return targetPath;
	}

	private toRelativePath(path: string): string {
		const relativePath = relative(resolve(this.allowedRoot), path);

		return relativePath || '.';
	}
}
