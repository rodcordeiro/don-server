import type { LlmChatParams, LlmProvider } from './llm-provider';

export type ProviderRegistryOptions = {
	defaultProviderName?: string;
	defaultModel?: string;
	fallbackProviderName?: string;
	fallbackModel?: string;
};

export type LlmSelection = {
	providerName?: string;
	model?: string;
};

export type LlmChatRequest = Omit<LlmChatParams, 'model'> & LlmSelection;

export class ProviderRegistry {
	private readonly providers = new Map<string, LlmProvider>();

	constructor(private readonly options: ProviderRegistryOptions = {}) {}

	register(provider: LlmProvider): void {
		this.providers.set(provider.name, provider);
	}

	get(name: string): LlmProvider | undefined {
		return this.providers.get(name);
	}

	async chat(request: LlmChatRequest): Promise<string> {
		const primary = this.resolve(request.providerName, request.model);

		try {
			return await primary.provider.chat({
				model: primary.model,
				messages: request.messages,
				...(request.format !== undefined ? { format: request.format } : {}),
			});
		} catch (error) {
			const fallback = this.resolveFallback(primary.provider.name);

			if (!fallback) {
				throw error;
			}

			return await fallback.provider.chat({
				model: fallback.model,
				messages: request.messages,
				...(request.format !== undefined ? { format: request.format } : {}),
			});
		}
	}

	private resolve(providerName?: string, model?: string): { provider: LlmProvider; model: string } {
		const resolvedProviderName = providerName ?? this.options.defaultProviderName ?? 'ollama';
		const provider = this.providers.get(resolvedProviderName);

		if (!provider) {
			throw new Error(`Provider nao encontrado: ${resolvedProviderName}.`);
		}

		return {
			provider,
			model: model ?? this.options.defaultModel ?? 'llama3.1',
		};
	}

	private resolveFallback(
		primaryProviderName: string,
	): { provider: LlmProvider; model: string } | undefined {
		const fallbackProviderName = this.options.fallbackProviderName;

		if (!fallbackProviderName || fallbackProviderName === primaryProviderName) {
			return undefined;
		}

		const provider = this.providers.get(fallbackProviderName);

		if (!provider) {
			return undefined;
		}

		return {
			provider,
			model: this.options.fallbackModel ?? this.options.defaultModel ?? 'llama3.1',
		};
	}
}
