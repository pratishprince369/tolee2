import { SYSTEM_PROMPTS } from './prompt-manager';

export async function callNvidiaLLM(messages: { role: string; content: string }[], systemPrompt?: string) {
  const apiKey = process.env.NVIDIA_API_KEY || "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";

  // Fast high-performance models in priority order
  const models = [
    "mistralai/mistral-medium-3.5-128b",
    "meta/llama-3.1-8b-instruct",
    "meta/llama-3.3-70b-instruct"
  ];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const fullMessages = [
        { role: "system", content: systemPrompt || SYSTEM_PROMPTS.PERSONAL_EMPLOYEE },
        ...messages
      ];

      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: fullMessages,
          temperature: 0.5,
          top_p: 0.9,
          max_tokens: 512
        })
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (error: any) {
      console.warn(`Model ${model} timed out or failed, trying fallback...`);
    }
  }

  return null;
}
