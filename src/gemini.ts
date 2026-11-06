import { askGeminiWithIntent } from "./geminiService";

export async function askGemini(userMessage: string, productListContext: string): Promise<string> {
  const result = await askGeminiWithIntent(userMessage, productListContext);
  return result.reply;
}
