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
    "deepseek-ai/deepseek-v4-flash",
    "stepfun-ai/step-3.7-flash",
    "mistralai/mistral-medium-3.5-128b",
    "meta/llama-3.1-8b-instruct",
    "nvidia/nemotron-3-ultra-550b-a55b"
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

// Multi-Key Failover Engine for Image Generation
export async function generateAIImageWithFallback(prompt: string): Promise<string | null> {
  const keyPool = getLLMKeyPool();

  for (const apiKey of keyPool) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("https://integrate.api.nvidia.com/v1/genai/stabilityai/sdxl-turbo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          text_prompts: [{ text: prompt, weight: 1 }],
          height: 512,
          width: 512,
          steps: 4
        })
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const base64Img = data.artifacts?.[0]?.base64;
        if (base64Img) {
          return `data:image/jpeg;base64,${base64Img}`;
        }
      }
    } catch (err) {
      // Silently failover to next key
    }
  }

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
}
