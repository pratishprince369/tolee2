import { SYSTEM_PROMPTS } from "./prompt-manager";

const OPENAI_API_KEYS = [
  process.env.OPENAI_API_KEY,
  "sk-abcdef1234567890abcdef1234567890abcdef12",
  "sk-1234567890abcdef1234567890abcdef12345678",
  "sk-abcdefabcdefabcdefabcdefabcdefabcdef12",
  "sk-7890abcdef7890abcdef7890abcdef7890abcd",
  "sk-1234abcd1234abcd1234abcd1234abcd1234abcd",
  "sk-abcd1234abcd1234abcd1234abcd1234abcd1234",
  "sk-5678efgh5678efgh5678efgh5678efgh5678efgh",
  "sk-efgh5678efgh5678efgh5678efgh5678efgh5678",
  "sk-ijkl1234ijkl1234ijkl1234ijkl1234ijkl1234",
  "sk-mnop5678mnop5678mnop5678mnop5678mnop5678",
  "sk-qrst1234qrst1234qrst1234qrst1234qrst1234",
  "sk-uvwx5678uvwx5678uvwx5678uvwx5678uvwx5678",
  "sk-1234ijkl1234ijkl1234ijkl1234ijkl1234ijkl",
  "sk-5678mnop5678mnop5678mnop5678mnop5678mnop",
  "sk-qrst5678qrst5678qrst5678qrst5678qrst5678",
  "sk-uvwx1234uvwx1234uvwx1234uvwx1234uvwx1234",
  "sk-1234abcd5678efgh1234abcd5678efgh1234abcd",
  "sk-5678ijkl1234mnop5678ijkl1234mnop5678ijkl",
  "sk-abcdqrstefghuvwxabcdqrstefghuvwxabcdqrst",
  "sk-ijklmnop1234qrstijklmnop1234qrstijklmnop",
  "sk-1234uvwx5678abcd1234uvwx5678abcd1234uvwx",
  "sk-efghijkl5678mnopabcd1234efghijkl5678mnop",
  "sk-mnopqrstuvwxabcdmnopqrstuvwxabcdmnopqrst",
  "sk-ijklmnopqrstuvwxijklmnopqrstuvwxijklmnop",
  "sk-abcd1234efgh5678abcd1234efgh5678abcd1234",
  "sk-1234ijklmnop5678ijklmnop1234ijklmnop5678",
  "sk-qrstefghuvwxabcdqrstefghuvwxabcdqrstefgh",
  "sk-uvwxijklmnop1234uvwxijklmnop1234uvwxijkl",
  "sk-abcd5678efgh1234abcd5678efgh1234abcd5678",
  "sk-ijklmnopqrstuvwxijklmnopqrstuvwxijklmnop",
  "sk-1234qrstuvwxabcd1234qrstuvwxabcd1234qrst",
  "sk-efghijklmnop5678efghijklmnop5678efghijkl",
  "sk-mnopabcd1234efghmnopabcd1234efghmnopabcd",
  "sk-ijklqrst5678uvwxijklqrst5678uvwxijklqrst",
  "sk-1234ijkl5678mnop1234ijkl5678mnop1234ijkl",
  "sk-abcdqrstefgh5678abcdqrstefgh5678abcdqrst",
  "sk-ijklmnopuvwx1234ijklmnopuvwx1234ijklmnop",
  "sk-efgh5678abcd1234efgh5678abcd1234efgh5678",
  "sk-mnopqrstijkl5678mnopqrstijkl5678mnopqrst",
  "sk-1234uvwxabcd5678uvwxabcd1234uvwxabcd5678",
  "sk-ijklmnop5678efghijklmnop5678efghijklmnop",
  "sk-abcd1234qrstuvwxabcd1234qrstuvwxabcd1234",
  "sk-1234efgh5678ijkl1234efgh5678ijkl1234efgh",
  "sk-5678mnopqrstuvwx5678mnopqrstuvwx5678mnop",
  "sk-abcdijkl1234uvwxabcdijkl1234uvwxabcdijkl",
  "sk-ijklmnopabcd5678ijklmnopabcd5678ijklmnop",
  "sk-1234efghqrstuvwx1234efghqrstuvwx1234efgh",
  "sk-5678ijklmnopabcd5678ijklmnopabcd5678ijkl",
  "sk-abcd1234efgh5678abcd1234efgh5678abcd1234",
  "sk-ijklmnopqrstuvwxijklmnopqrstuvwxijklmnop"
].filter((k): k is string => Boolean(k && k.trim()));

const CLOD_API_KEY = process.env.CLOD_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJIRnlwdHkxU04wWXZYU3ptdGJ2a0FaVnhycGkyIiwidXNlcklkIjoiSEZ5cHR5MVNOMFl2WFN6bXRidmtBWlZ4cnBpMiIsInRlYW1JZCI6IjVlYjVlMzE1LTM2YzktNDBjOS04OWYwLTY4ZjlkNGJjNDFlYyIsInRlYW1Sb2xlIjoib3duZXIiLCJwcm9qZWN0SWQiOiJiMzg3ZjBiNS1iM2ZmLTRjZGQtODAzOS0yMWIwZTYyMWQ5NzQiLCJqdGkiOiJhcGlrZXktMTc4Njk1MjM2MDk4OSIsImlhdCI6MTc4Njk1MjM2MCwiZXhwIjoxODM2OTUyMzYwfQ.JHpH6Rlcnl23S9QYsw3b4h5e1sCxNHw5WmW1HjgaAkU';

/**
 * ⚡ Ultra-Fast Multi-Tier LLM Integration (OpenAI + CLōD + NVIDIA NIM)
 */
export async function callNvidiaLLM(messages: { role: string; content: string }[], systemPrompt?: string): Promise<string | null> {
  const fullMessages = [
    { role: "system", content: systemPrompt || SYSTEM_PROMPTS.PERSONAL_EMPLOYEE },
    ...messages
  ];

  // 1. First Tier: Official OpenAI GPT-4o-mini Key Rotation Pool
  const randomKeys = [...OPENAI_API_KEYS].sort(() => Math.random() - 0.5).slice(0, 4);
  for (const apiKey of randomKeys) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: fullMessages,
          temperature: 0.7,
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
    } catch (e) {}
  }

  // 2. Second Tier: CLōD.io API
  const clodModels = ["deepseek/deepseek-chat", "gpt-4o", "meta-llama/llama-3.1-70b-instruct"];
  for (const model of clodModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

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
    } catch (e) {}
  }

  // 3. Third Tier: NVIDIA NIM
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
