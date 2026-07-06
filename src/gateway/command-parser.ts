// src/gateway/command-parser.ts

import { AgentRegistry } from "../core/agents/agent-registry";

export type ParsedCommand = {
  target: string;
  content: string;
};

export function parseCommand(
  input: string,
  registry: AgentRegistry
): ParsedCommand {
  const match = input.match(/^@([\w-]+),?\s+(.+)$/);

  if (!match) {
    return {
      target: "planner-agent",
      content: input
    };
  }

  const [, mention, content] = match;

  const possibleNames = [
    mention,
    `${mention}-agent`
  ];

  const target = possibleNames.find(name => registry.has(name));

  return {
    target: target ?? "planner-agent",
    content
  };
}