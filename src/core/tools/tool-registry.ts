import type { Tool, ToolMetadata } from './tool';

export class ToolRegistry {
	private readonly tools = new Map<string, Tool>();

	register(tool: Tool) {
		this.tools.set(tool.metadata.name, tool);
	}

	get(name: string) {
		return this.tools.get(name);
	}

	has(name: string) {
		return this.tools.has(name);
	}

	getAll() {
		return [...this.tools.values()];
	}

	getCatalog(): ToolMetadata[] {
		return this.getAll().map(tool => tool.metadata);
	}
}
