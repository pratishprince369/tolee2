import { SYSTEM_PROMPTS } from './prompt-manager';

// Safe Multi-Key Environment & Built-in Key Rotation Pool
export function getLLMKeyPool(): string[] {
  const keys = [
    "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", // NEW OpenAI GPT-OSS-120B Key
    "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", // NEW OpenAI GPT-OSS-20B Key
    "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", // NEW Google Gemma-4-31B Key
    "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", // OpenAI GPT-OSS-120B Key
    "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", // Google Gemma-4-31B Key
    "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", // OpenAI GPT-OSS-20B Key
    "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", // Nemotron Mini 4B Key
    process.env.NVIDIA_API_KEY,
    process.env.NVIDIA_API_KEY_2,
    process.env.NVIDIA_API_KEY_3,
    process.env.NVIDIA_API_KEY_4,
    process.env.NVIDIA_API_KEY_5
  ];
  return Array.from(new Set(keys.filter((k): k is string => Boolean(k && k.trim()))));
}

// Multi-Key & Multi-Model High Speed Failover Engine
export async function callNvidiaLLM(messages: { role: string; content: string }[], systemPrompt?: string) {
  const keyPool = getLLMKeyPool();
  const models = [
    "openai/gpt-oss-120b",
    "google/gemma-4-31b-it",
    "openai/gpt-oss-20b",
    "meta/llama-3.3-70b-instruct",
    "meta/llama-3.2-11b-vision-instruct",
    "nvidia/nemotron-3-ultra-550b-a55b",
    "mistralai/mixtral-8x7b-instruct-v0.1",
    "stepfun-ai/step-3.7-flash",
    "nvidia/nemotron-mini-4b-instruct"
  ];

  for (const apiKey of keyPool) {
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for ultra speed

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
          if (content && content.trim()) {
            return content;
          }
        }
      } catch (error: any) {
        // Silently failover to next key and model
      }
    }
  }

  return null;
}

// High-Speed Photorealistic AI Image Generation Engine (FLUX-Realism + LLM Auto-Enhance)
export async function generateAIImageWithFallback(prompt: string): Promise<string> {
  const cleanPrompt = prompt ? prompt.trim() : 'Inspiring social media graphic poster, 8k resolution, photorealistic';
  const encoded = encodeURIComponent(cleanPrompt);
  
  // Photorealistic DALL-E 3 Grade FLUX.1 Realism Engine with LLM Auto-Enhancement
  return `https://image.pollinations.ai/prompt/${encoded}?model=flux-realism&enhance=true&width=1080&height=1080&nologo=true`;
}
