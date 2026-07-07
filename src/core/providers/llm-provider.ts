// src/core/providers/llm-provider.ts

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface LlmProvider {
  name: string;

  chat(params: { model: string; messages: ChatMessage[]; format?: "json" }): Promise<string>;
}
