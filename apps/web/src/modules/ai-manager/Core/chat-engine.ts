import { SYSTEM_PROMPTS } from './prompt-manager';

export async function callNvidiaLLM(messages: { role: string; content: string }[], systemPrompt?: string) {
  const apiKey = process.env.NVIDIA_API_KEY || "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";

  try {
    const fullMessages = [
      { role: "system", content: systemPrompt || SYSTEM_PROMPTS.PERSONAL_EMPLOYEE },
      ...messages
    ];

    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: fullMessages,
        temperature: 0.6,
        top_p: 0.9,
        max_tokens: 1024
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("NVIDIA LLM API returned error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("Failed to connect to NVIDIA LLM API:", error);
    return null;
  }
}
