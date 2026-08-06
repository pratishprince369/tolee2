import { prisma } from '@/lib/prisma';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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';

interface NewsAIPayload {
  headline: string;
  content: string;
  mediaUrls?: string | null;
}

export async function runNewsAIPipeline(data: NewsAIPayload) {
  const headline = data.headline;
  let originalContent = data.content;

  // Defaults
  let optimizedContent = originalContent;
  let category = 'General News';
  let summary = '';
  let metaDescription = '';
  let keywords = '';
  let tags = '';
  let altText = '';
  let clean = true;
  let moderationReason = '';

  const callNIM = async (prompt: string, temperature = 0.2): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NVIDIA_API_KEY}`
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-70b-instruct',
          messages: [
            {
              role: 'system',
              content: 'You are an advanced AI assistant specialized in news editing, publishing, content moderation, SEO/AEO/GEO optimization, and metadata generation.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature,
          max_tokens: 1500
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`NVIDIA NIM API returned status ${response.status}`);
      }

      const resData = await response.json();
      return resData?.choices?.[0]?.message?.content || '';
    } catch (err) {
      console.error('NIM call failed or timed out:', err);
      return '';
    }
  };

  // 1. Content Safety / Moderation Check
  try {
    const moderationPrompt = `Scan the following news article. Respond strictly in JSON format {"clean": true, "reason": ""} or {"clean": false, "reason": "reason for flagging"} if it contains hate speech, drugs, pornography, escort/scam services, extreme violence, or toxic/offensive language.\n\nHeadline: ${headline}\nContent: ${originalContent}`;
    const modResponseText = await callNIM(moderationPrompt);
    if (modResponseText) {
      const cleanJson = modResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      clean = parsed.clean !== false;
      moderationReason = parsed.reason || '';
    }
  } catch (e) {
    console.error('Moderation parsing failed:', e);
  }

  // 2. SEO, AEO & GEO content optimization (Improve readability, sentence structure, natural keyword incorporation)
  try {
    const optimizePrompt = `Optimize the following news article for readability, keyword flow, sentence quality, and search engine/AI engine optimization (SEO/AEO/GEO). Fix any grammatical errors and improve flow without changing the original meaning, facts, or names. Retain a professional journalistic style.\n\nOriginal Headline: ${headline}\nOriginal Content: ${originalContent}\n\nRespond strictly with the optimized content and nothing else. Do not add metadata, explanations, markdown quotes or preamble.`;
    const optResult = await callNIM(optimizePrompt, 0.5);
    if (optResult && optResult.trim().length > 50) {
      optimizedContent = optResult.trim();
    }
  } catch (e) {
    console.error('Content optimization failed:', e);
  }

  // 3. Category Detection
  try {
    const categoryPrompt = `Determine the single best category for the news article below.\nAvailable categories: Politics, Business, Technology, Sports, Real Estate, Local News, Lifestyle, Entertainment, Education, Health, Travel.\n\nHeadline: ${headline}\nContent: ${optimizedContent}\n\nRespond STRICTLY with one of the category names above, and nothing else. If confidence is low, respond with 'General News'.`;
    const catResult = await callNIM(categoryPrompt);
    const cleanedCat = catResult.trim().replace(/[.\s]+$/, '');
    const validCategories = [
      'Politics', 'Business', 'Technology', 'Sports', 'Real Estate', 
      'Local News', 'Lifestyle', 'Entertainment', 'Education', 'Health', 'Travel'
    ];
    if (validCategories.some(c => c.toLowerCase() === cleanedCat.toLowerCase())) {
      category = validCategories.find(c => c.toLowerCase() === cleanedCat.toLowerCase()) || 'General News';
    }
  } catch (e) {
    console.error('Category detection failed:', e);
  }

  // 4. AI 2-sentence Summary
  try {
    const summaryPrompt = `Write an engaging 2-sentence summary hook for this news article. Respond strictly with the summary sentences, no preamble or quotes.\n\nHeadline: ${headline}\nContent: ${optimizedContent}`;
    const sumResult = await callNIM(summaryPrompt, 0.4);
    if (sumResult) {
      summary = sumResult.trim().replace(/^"/, '').replace(/"$/, '');
    }
  } catch (e) {
    console.error('Summary generation failed:', e);
  }

  // 5. SEO Metadata (Meta description, Keywords, Tags)
  try {
    const seoPrompt = `Based on this news article, generate an SEO-friendly meta description (120-150 chars), comma-separated focus keywords, and comma-separated tags.\n\nHeadline: ${headline}\nContent: ${optimizedContent}\n\nRespond strictly in JSON format:\n{\n  "metaDescription": "Concise summary",\n  "keywords": "keyword1, keyword2",\n  "tags": "tag1, tag2"\n}\nDo not wrap in markdown or add extra text.`;
    const seoResultText = await callNIM(seoPrompt);
    if (seoResultText) {
      const cleanJson = seoResultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      metaDescription = parsed.metaDescription || '';
      keywords = parsed.keywords || '';
      tags = parsed.tags || '';
    }
  } catch (e) {
    console.error('SEO metadata generation failed:', e);
  }

  // 6. Image Alt Text
  try {
    const altPrompt = `Based on the news headline: "${headline}" and summary: "${summary}", generate a concise, SEO-friendly descriptive alt text for the featured cover image. Respond strictly with the alt text and nothing else.`;
    const altResult = await callNIM(altPrompt);
    if (altResult) {
      altText = altResult.trim().replace(/^"/, '').replace(/"$/, '');
    }
  } catch (e) {
    console.error('Alt text generation failed:', e);
  }

  // 7. Calculate estimated reading time (assume avg 200 words per minute)
  const wordCount = optimizedContent.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // 8. Featured Image Cover Select
  // Since we accept multiple media URLs, the cover image is the first one in the list.
  const coverImage = data.mediaUrls ? data.mediaUrls.split(/,(?=https?:\/\/)/)[0] : null;

  // Construct scoreAnalysis JSON string
  const scoreAnalysis = JSON.stringify({
    altText,
    moderation: {
      clean,
      reason: moderationReason
    },
    seoOptimized: true,
    coverImageSelected: coverImage,
    originalContentLength: originalContent.length,
    optimizedContentLength: optimizedContent.length,
  });

  return {
    category,
    summary,
    content: optimizedContent,
    metaDescription,
    keywords,
    tags,
    readingTime,
    scoreAnalysis,
    clean,
    moderationReason
  };
}
