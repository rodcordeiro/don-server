// src/core/providers/llm-provider.ts

export type ChatMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

export type LlmChatParams = {
	model: string;
	messages: ChatMessage[];
	format?: 'json';
};

export interface LlmProvider {
	name: string;

	chat(params: LlmChatParams): Promise<string>;
}
