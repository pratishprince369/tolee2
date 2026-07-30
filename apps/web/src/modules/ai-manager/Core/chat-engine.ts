import { SYSTEM_PROMPTS } from './prompt-manager';

// Key Rotation Pool for LLMs
export function getLLMKeyPool(): string[] {
  const keys = [
    process.env.NVIDIA_API_KEY,
    process.env.NVIDIA_API_KEY_2,
    process.env.NVIDIA_API_KEY_3,
    process.env.NVIDIA_API_KEY_4,
    process.env.NVIDIA_API_KEY_5,
    "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",
    "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"
  ];
  return Array.from(new Set(keys.filter((k): k is string => Boolean(k && k.trim()))));
}

// Multi-Key Failover Engine for LLM Chat
export async function callNvidiaLLM(messages: { role: string; content: string }[], systemPrompt?: string) {
  const keyPool = getLLMKeyPool();
  const models = [
    "mistralai/mistral-medium-3.5-128b",
    "meta/llama-3.1-8b-instruct",
    "meta/llama-3.3-70b-instruct"
  ];

  for (const apiKey of keyPool) {
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
          if (content) {
            return content;
          }
        } else {
          console.warn(`[LLM Failover] Key ending with ...${apiKey.slice(-6)} returned ${res.status}. Switching to next key/model...`);
        }
      } catch (error: any) {
        console.warn(`[LLM Failover] Key ending with ...${apiKey.slice(-6)} timed out or failed. Trying next key in pool...`);
      }
    }
  }

  return null;
}

// Multi-Key Failover Engine for Image Generation
export async function generateAIImageWithFallback(prompt: string): Promise<string | null> {
  const keyPool = getLLMKeyPool();

  // 1. Try NVIDIA Image Generation Endpoint with Key Rotation Pool
  for (const apiKey of keyPool) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

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
      console.warn(`[Image Failover] Key ...${apiKey.slice(-6)} failed for image generation. Trying next key...`);
    }
  }

  // 2. High-Speed Fallback Image Service
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
}
