// src/core/providers/ollama-provider.ts

import ollama from 'ollama';
import type { LlmProvider } from './llm-provider';

export class OllamaProvider implements LlmProvider {
	name = 'ollama';

	async chat(params: {
		model: string;
		messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
		format?: 'json';
	}) {
		const response = await ollama.chat({
			model: params.model,
			messages: params.messages,
			...(params.format !== undefined ? { format: params.format } : {}),
		});

		return response.message.content;
	}
}
