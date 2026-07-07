export type ToolResult<TOutput = unknown> = {
	success: boolean;
	output?: TOutput;
	error?: string;
	metadata?: Record<string, unknown>;
};
