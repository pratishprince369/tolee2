import { SYSTEM_PROMPTS } from "./prompt-manager";

/**
 * ⚡ Ultra-Fast NVIDIA NIM LLM Integration
 */
export async function callNvidiaLLM(messages: { role: string; content: string }[], systemPrompt?: string): Promise<string | null> {
  const keyPool = [
    process.env.NVIDIA_LLM_KEY || "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",
    "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",
    "nvapi-gN_5g0_Y_H8n1v6b0g1_2_3_4_5_6_7_8_9"
  ];

  const models = [
    "nvidia/nemotron-4-mini-15b-instruct",
    "meta/llama-3.1-70b-instruct",
    "nvidia/nemotron-3-ultra-550b-a55b",
    "meta/llama-3.3-70b-instruct"
  ];

  for (const apiKey of keyPool) {
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

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
        // Silently failover
      }
    }
  }

  return null;
}

/**
 * 🎨 4K HD Photorealistic AI Image Generation Engine (SD 3.5 Large / Flux.1 Schnell + Pollinations Flux Realism 4K Failover)
 */
export async function generateAIImageWithFallback(prompt: string): Promise<string> {
  const cleanPrompt = prompt ? prompt.trim() : 'Inspiring social media graphic poster, 8k resolution, photorealistic studio quality';
  
  // Enhance prompt for maximum visual fidelity & photorealism
  const enhancedPrompt = `${cleanPrompt}, masterpiece, highly detailed, photorealistic 8k HD resolution, professional studio lighting, cinematic composition, award winning visual quality`;
  const encoded = encodeURIComponent(enhancedPrompt);

  const sdKey = process.env.NVIDIA_SD35_KEY || "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";
  const fluxKey = process.env.NVIDIA_FLUX_SCHNELL_KEY || "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";

  // 1. Try NVIDIA NIM Stability AI SD 3.5 Large & Black Forest Labs FLUX.1 Schnell
  const providers = [
    {
      key: sdKey,
      endpoint: "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3.5-large",
      body: {
        prompt: enhancedPrompt,
        mode: "text-to-image",
        aspect_ratio: "1:1",
        output_format: "png",
        seed: Math.floor(Math.random() * 1000000)
      }
    },
    {
      key: fluxKey,
      endpoint: "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell",
      body: {
        prompt: enhancedPrompt,
        mode: "base"
      }
    }
  ];

  for (const item of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(item.endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${item.key}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify(item.body)
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
      // Failover to ultra high quality Pollinations FLUX Realism
    }
  }

  // 2. High-Fidelity 4K FLUX Realism Cloud Failover
  const seed = Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encoded}?model=flux-realism&enhance=true&width=1080&height=1080&seed=${seed}&nologo=true`;
}
