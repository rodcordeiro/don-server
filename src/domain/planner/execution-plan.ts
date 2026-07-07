export type ExecutionStep = {
  id: string;
  target: string;
  instruction: string;
  reason: string;
  dependsOn?: string[];
};

export type ExecutionPlan = {
  steps: ExecutionStep[];
};
