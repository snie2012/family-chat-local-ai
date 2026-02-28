import { Ollama } from "ollama";
import { env } from "../config/env";

const ollama = new Ollama({ host: env.OLLAMA_HOST });

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type StreamChunk =
  | { type: "thinking"; content: string }
  | { type: "content"; content: string };

export async function* streamChat(
  messages: OllamaMessage[],
  options?: { think?: boolean; model?: string }
): AsyncGenerator<StreamChunk> {
  const think = options?.think ?? false;

  // Only pass think:true when think mode is on — some models (e.g. qwen3:4b-instruct)
  // don't support the think parameter at all and will error if it's set.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream: AsyncIterable<any> = await (ollama.chat as any)({
    model: options?.model ?? env.OLLAMA_MODEL,
    messages,
    stream: true,
    ...(think ? { think: true } : {}),
  });

  for await (const part of stream) {
    const thinking: string | undefined = part.message?.thinking;
    if (thinking && think) {
      yield { type: "thinking", content: thinking };
    }
    const content: string | undefined = part.message?.content;
    if (content) {
      yield { type: "content", content };
    }
  }
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    await ollama.list();
    return true;
  } catch {
    return false;
  }
}

export async function listAvailableModels(): Promise<string[]> {
  try {
    const response = await ollama.list();
    return response.models.map((m) => m.name);
  } catch {
    return [];
  }
}
