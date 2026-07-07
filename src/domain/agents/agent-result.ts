export type AgentResult<TData = unknown> = {
	success: boolean;
	message?: string;
	data?: TData;
	error?: string;
};
