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
    "nvidia/nemotron-4-340b-instruct",
    "nvidia/nemotron-3-ultra-550b-a55b",
    "nvidia/nemotron-mini-4b-instruct",
    "meta/llama-3.3-70b-instruct",
    "google/gemma-4-31b-it"
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

// High-Speed Photorealistic AI Image Generation Engine (NVIDIA NIM SD 3.5 Large & FLUX.1 Schnell + Cloud Failover)
export async function generateAIImageWithFallback(prompt: string): Promise<string> {
  const cleanPrompt = prompt ? prompt.trim() : 'Inspiring social media graphic poster, 8k resolution, photorealistic';
  const encoded = encodeURIComponent(cleanPrompt);

  const sdKey = process.env.NVIDIA_SD35_KEY || "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";
  const fluxKey = process.env.NVIDIA_FLUX_SCHNELL_KEY || "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";

  // Try NVIDIA NIM Stability AI SD 3.5 Large / FLUX.1 Schnell with 3.5s timeout
  for (const item of [
    { key: sdKey, endpoint: "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3.5-large" },
    { key: fluxKey, endpoint: "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell" }
  ]) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(item.endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${item.key}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: cleanPrompt,
          mode: "base"
        })
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const b64 = data.image || data.artifacts?.[0]?.base64 || data.b64_json;
        if (b64) {
          return `data:image/png;base64,${b64}`;
        }
      }
    } catch (err: any) {
      // Failover silently to next model / cloud API
    }
  }

  // Photorealistic DALL-E 3 Grade FLUX.1 Realism Cloud Engine Failover
  return `https://image.pollinations.ai/prompt/${encoded}?model=flux-realism&enhance=true&width=1080&height=1080&nologo=true`;
}
