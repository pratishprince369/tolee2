import { SYSTEM_PROMPTS } from './prompt-manager';

// Safe 5-Key Environment Variable Rotation Pool
export function getLLMKeyPool(): string[] {
  const keys = [
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
    "meta/llama-3.3-70b-instruct",
    "meta/llama-3.2-11b-vision-instruct",
    "nvidia/nemotron-3-ultra-550b-a55b",
    "mistralai/mixtral-8x7b-instruct-v0.1",
    "stepfun-ai/step-3.7-flash",
    "nvidia/nemotron-mini-4b-instruct",
    "meta/llama-3.1-70b-instruct"
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
