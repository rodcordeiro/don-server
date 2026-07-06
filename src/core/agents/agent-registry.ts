// src/core/agents/agent-registry.ts

import type { Agent, AgentMetadata } from "./agent";

export class AgentRegistry {
  private readonly agents = new Map<string, Agent>();

  register(agent: Agent) {
    this.agents.set(agent.metadata.name, agent);
  }

  get(name: string) {
    return this.agents.get(name);
  }

  has(name: string) {
    return this.agents.has(name);
  }

  getAll() {
    return [...this.agents.values()];
  }

  getCatalog(): AgentMetadata[] {
    return this.getAll().map(agent => agent.metadata);
  }
}