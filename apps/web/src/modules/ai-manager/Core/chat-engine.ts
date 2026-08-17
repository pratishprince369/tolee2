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

const CLOD_API_KEY = process.env.CLOD_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJIRnlwdHkxU04wWXZYU3ptdGJ2a0FaVnhycGkyIiwidXNlcklkIjoiSEZ5cHR5MVNOMFl2WFN6bXRidmtBWlZ4cnBpMiIsInRlYW1JZCI6IjVlYjVlMzE1LTM2YzktNDBjOS04OWYwLTY4ZjlkNGJjNDFlYyIsInRlYW1Sb2xlIjoib3duZXIiLCJwcm9qZWN0SWQiOiJiMzg3ZjBiNS1iM2ZmLTRjZGQtODAzOS0yMWIwZTYyMWQ5NzQiLCJqdGkiOiJhcGlrZXktMTc4Njk1MjM2MDk4OSIsImlhdCI6MTc4Njk1MjM2MCwiZXhwIjoxODM2OTUyMzYwfQ.JHpH6Rlcnl23S9QYsw3b4h5e1sCxNHw5WmW1HjgaAkU';

// Multi-Key & Multi-Model High Speed Failover Engine (CLōD API + NVIDIA NIM)
export async function callNvidiaLLM(messages: { role: string; content: string }[], systemPrompt?: string) {
  const fullMessages = [
    { role: "system", content: systemPrompt || SYSTEM_PROMPTS.PERSONAL_EMPLOYEE },
    ...messages
  ];

  // 1. First Priority: Try CLōD.io API (High Speed GPT-4o / DeepSeek / Llama)
  const clodModels = ["deepseek/deepseek-chat", "gpt-4o", "meta-llama/llama-3.1-70b-instruct"];
  for (const model of clodModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch("https://api.clod.io/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CLOD_API_KEY}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: fullMessages,
          temperature: 0.6,
          max_tokens: 750
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
    } catch (e) {
      // Failover to next CLōD model or NVIDIA
    }
  }

  // 2. Second Priority Failover: NVIDIA NIM Key Pool
  const keyPool = getLLMKeyPool();
  const models = [
    "nvidia/nemotron-4-340b-instruct",
    "nvidia/nemotron-3-ultra-550b-a55b",
    "nvidia/nemotron-mini-4b-instruct",
    "meta/llama-3.3-70b-instruct",
    "google/gemma-4-31b-it",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b"
  ];

  for (const apiKey of keyPool) {
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for ultra speed

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

// High-Speed Photorealistic AI Image Generation Engine (Fooocus V2 Prompt Expander + NVIDIA NIM + FLUX.1 Realism)
export async function generateAIImageWithFallback(prompt: string): Promise<string> {
  const cleanPrompt = prompt ? prompt.trim() : 'Inspiring social media graphic poster, 8k resolution, photorealistic';
  
  // Fooocus V2 Midjourney Prompt Expansion
  const fooocusExpandedPrompt = `${cleanPrompt}, highly detailed, cinematic lighting, masterpiece, 8k resolution, photorealistic, sharp focus, intricate details, depth of field, award winning photography`;
  const encoded = encodeURIComponent(fooocusExpandedPrompt);

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
          prompt: fooocusExpandedPrompt,
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
