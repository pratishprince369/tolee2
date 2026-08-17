import { NewsArticleItem } from '@/lib/newsAutoPublisher';

const CLOD_API_KEY = process.env.CLOD_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJIRnlwdHkxU04wWXZYU3ptdGJ2a0FaVnhycGkyIiwidXNlcklkIjoiSEZ5cHR5MVNOMFl2WFN6bXRidmtBWlZ4cnBpMiIsInRlYW1JZCI6IjVlYjVlMzE1LTM2YzktNDBjOS04OWYwLTY4ZjlkNGJjNDFlYyIsInRlYW1Sb2xlIjoib3duZXIiLCJwcm9qZWN0SWQiOiJiMzg3ZjBiNS1iM2ZmLTRjZGQtODAzOS0yMWIwZTYyMWQ5NzQiLCJqdGkiOiJhcGlrZXktMTc4Njk1MjM2MDk4OSIsImlhdCI6MTc4Njk1MjM2MCwiZXhwIjoxODM2OTUyMzYwfQ.JHpH6Rlcnl23S9QYsw3b4h5e1sCxNHw5WmW1HjgaAkU';

const NVIDIA_API_KEYS = [
  process.env.NVIDIA_API_KEY || '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',
  process.env.NVIDIA_API_KEY_2 || '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',
  process.env.NVIDIA_API_KEY_3 || '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',
  process.env.NVIDIA_API_KEY_4 || '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',
  process.env.NVIDIA_API_KEY_5 || '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'
];

/**
 * Generates fresh AI breaking news articles targeted by category & language
 */
export async function generateAINewsArticle(
  category: string,
  lang: 'hi' | 'mr' | 'en',
  logs: string[]
): Promise<NewsArticleItem | null> {
  const prompt = lang === 'hi' 
    ? `आप एक वरिष्ठ पत्रकार हैं। श्रेणी: "${category}" पर 1 ताज़ा, प्रामाणिक और आकर्षक समाचार रिपोर्ट हिंदी में तैयार करें। JSON फ़ॉर्मेट में दें: {"headline": "...", "description": "..."}`
    : lang === 'mr'
    ? `तुम्ही एक वरिष्ठ पत्रकार आहात. श्रेणी: "${category}" वर 1 ताज्या, महत्त्वाच्या आणि सत्य बातमीचा मसुदा मराठीत तयार करा. JSON फॉरमॅटमध्ये द्या: {"headline": "...", "description": "..."}`
    : `You are a senior news journalist. Create 1 fresh, engaging, breaking news article for category: "${category}". Output JSON format: {"headline": "...", "description": "..."}`;

  // 1. Try CLōD.io API (High Speed Multi-Model)
  try {
    const res = await fetch('https://api.clod.io/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLOD_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (res.ok) {
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '';
      const jsonMatch = reply.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.headline && parsed.headline.length > 10) {
          logs.push(`[CLOD AI NEWS] Generated fresh ${lang.toUpperCase()} article for ${category}: "${parsed.headline.slice(0, 40)}..."`);
          return {
            headline: parsed.headline,
            description: parsed.description || parsed.headline,
            language: lang
          };
        }
      }
    }
  } catch (clodErr: any) {
    logs.push(`[CLOD AI NEWS Notice] ${clodErr.message}`);
  }

  // 2. Failover: Try NVIDIA NIM API
  const apiKey = NVIDIA_API_KEYS[Math.floor(Math.random() * NVIDIA_API_KEYS.length)];
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON
    const jsonMatch = reply.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.headline && parsed.headline.length > 10) {
        logs.push(`[NVIDIA AI GENERATOR] Successfully generated fresh ${lang.toUpperCase()} article for ${category}: "${parsed.headline.slice(0, 40)}..."`);
        return {
          headline: parsed.headline,
          description: parsed.description || parsed.headline,
          language: lang
        };
      }
    }
  } catch (err: any) {
    logs.push(`[NVIDIA AI GENERATOR] Notice: ${err.message}`);
  }

  return null;
}
