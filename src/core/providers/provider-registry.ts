import type { LlmProvider } from "./llm-provider";

export class ProviderRegistry {
  private readonly providers = new Map<string, LlmProvider>();

  register(provider: LlmProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): LlmProvider | undefined {
    return this.providers.get(name);
  }
}
