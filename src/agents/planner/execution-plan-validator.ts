import type { ExecutionPlan, ExecutionStep } from "../../domain";

export function parseExecutionPlan(response: string, availableAgents: Set<string>): ExecutionPlan {
  let parsed: unknown;

  try {
    parsed = JSON.parse(response);
  } catch {
    throw new Error("Planner retornou JSON invalido.");
  }

  return validateExecutionPlan(parsed, availableAgents);
}

function validateExecutionPlan(input: unknown, availableAgents: Set<string>): ExecutionPlan {
  if (!isRecord(input) || !Array.isArray(input["steps"])) {
    throw new Error("ExecutionPlan deve conter um array de steps.");
  }

  if (input["steps"].length === 0) {
    throw new Error("ExecutionPlan nao pode ter steps vazios.");
  }

  const steps = input["steps"].map((step, index) =>
    validateExecutionStep(step, index, availableAgents),
  );

  return { steps };
}

function validateExecutionStep(
  input: unknown,
  index: number,
  availableAgents: Set<string>,
): ExecutionStep {
  if (!isRecord(input)) {
    throw new Error(`Step ${index + 1} deve ser um objeto.`);
  }

  const id = readRequiredString(input, "id", index);
  const target = readRequiredString(input, "target", index);
  const instruction = readRequiredString(input, "instruction", index);
  const reason = readRequiredString(input, "reason", index);

  if (!availableAgents.has(target)) {
    throw new Error(`Step ${index + 1} referencia agente inexistente: ${target}.`);
  }

  const dependsOn = input["dependsOn"];

  return {
    id,
    target,
    instruction,
    reason,
    ...(Array.isArray(dependsOn) ? { dependsOn: dependsOn.filter(isString) } : {}),
  };
}

function readRequiredString(input: Record<string, unknown>, field: string, index: number): string {
  const value = input[field];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Step ${index + 1} deve conter ${field}.`);
  }

  return value;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

function isString(input: unknown): input is string {
  return typeof input === "string";
}
