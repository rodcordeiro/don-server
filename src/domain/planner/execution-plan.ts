export type ExecutionStep = {
	id: string;
	target: string;
	instruction: string;
	reason: string;
	score?: number;
	dependsOn?: string[];
};

export type ExecutionPlan = {
	steps: ExecutionStep[];
};
