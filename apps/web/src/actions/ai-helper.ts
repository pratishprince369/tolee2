'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const CLOD_API_KEY = process.env.CLOD_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJIRnlwdHkxU04wWXZYU3ptdGJ2a0FaVnhycGkyIiwidXNlcklkIjoiSEZ5cHR5MVNOMFl2WFN6bXRidmtBWlZ4cnBpMiIsInRlYW1JZCI6IjVlYjVlMzE1LTM2YzktNDBjOS04OWYwLTY4ZjlkNGJjNDFlYyIsInRlYW1Sb2xlIjoib3duZXIiLCJwcm9qZWN0SWQiOiJiMzg3ZjBiNS1iM2ZmLTRjZGQtODAzOS0yMWIwZTYyMWQ5NzQiLCJqdGkiOiJhcGlrZXktMTc4Njk1MjM2MDk4OSIsImlhdCI6MTc4Njk1MjM2MCwiZXhwIjoxODM2OTUyMzYwfQ.JHpH6Rlcnl23S9QYsw3b4h5e1sCxNHw5WmW1HjgaAkU';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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';

export async function askAIWriter(prompt: string, contextText?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const systemPrompt = `You are a professional journalistic AI writing assistant for the Tolee News platform. 
Help the author write, rewrite, format, translate, or optimize their article. 
Keep the output professional, engaging, optimized for readers, search engines (SEO), and AI engines (AEO/GEO).
Return only the generated article content or direct response requested, without preamble, meta commentary, or markdown code wrapping.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (contextText) {
      messages.push({
        role: 'system',
        content: `Here is the current context of the article:\n${contextText}`
      });
    }

    messages.push({ role: 'user', content: prompt });

    // 1. Try CLōD API
    try {
      const clodRes = await fetch('https://api.clod.io/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CLOD_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages,
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (clodRes.ok) {
        const clodData = await clodRes.json();
        const resultText = clodData?.choices?.[0]?.message?.content || '';
        if (resultText.trim()) {
          return { success: true, text: resultText.trim() };
        }
      }
    } catch (clodErr) {
      // Failover to NVIDIA NIM
    }

    // 2. NVIDIA NIM Failover
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`AI API returned status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data?.choices?.[0]?.message?.content || '';

    return { success: true, text: resultText.trim() };
  } catch (err: any) {
    console.error('AI Writer request failed:', err);
    return { success: false, error: err.message || 'AI request failed' };
  }
}
