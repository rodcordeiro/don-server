import OpenAI from 'openai';
import type { LlmChatParams, LlmProvider } from './llm-provider';

export class OpenAIProvider implements LlmProvider {
	name = 'openai';
	private readonly client: OpenAI | undefined;

	constructor(apiKey = process.env['OPENAI_API_KEY']) {
		this.client = apiKey?.trim() ? new OpenAI({ apiKey }) : undefined;
	}

	async chat(params: LlmChatParams): Promise<string> {
		if (!this.client) {
			throw new Error('OPENAI_API_KEY nao configurado.');
		}

		const response = await this.client.chat.completions.create({
			model: params.model,
			messages: params.messages,
			...(params.format === 'json' ? { response_format: { type: 'json_object' as const } } : {}),
		});

		return response.choices[0]?.message.content ?? '';
	}
}
