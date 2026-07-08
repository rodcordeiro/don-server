import type { ToolResult } from '../../domain';

export type ToolMetadata = {
	name: string;
	description: string;
	capabilities?: string[];
	examples?: string[];
};

export interface Tool<TInput = unknown, TOutput = unknown> {
	metadata: ToolMetadata;

	execute(input: TInput): Promise<ToolResult<TOutput>>;
}
