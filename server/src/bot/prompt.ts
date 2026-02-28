import { env } from "../config/env";
import { OllamaMessage } from "../services/llm.service";

interface MessageContext {
  body: string;
  sender: { displayName: string; isBot: boolean };
}

export function buildPrompt(history: MessageContext[]): OllamaMessage[] {
  const messages: OllamaMessage[] = [
    {
      role: "system",
      content: env.BOT_SYSTEM_PROMPT,
    },
  ];

  for (const msg of history) {
    messages.push({
      role: msg.sender.isBot ? "assistant" : "user",
      content: msg.sender.isBot
        ? msg.body
        : `${msg.sender.displayName}: ${msg.body}`,
    });
  }

  return messages;
}
