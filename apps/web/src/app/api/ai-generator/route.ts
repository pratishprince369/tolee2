import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, projectType } = await request.json();
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required.' }, { status: 400 });
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    if (apiKey) {
      try {
        const systemPrompt = `You are a futuristic, premium AI copywriter for Tolee World.
Your task is to generate high-converting, professional, and engaging copy/details for a creator project.
Project Channel: ${projectType} (can be WEBSITE, BLOG, RESTAURANT, or STORE)
User prompt: "${prompt}"

Provide content appropriate for the channel. E.g.:
- If WEBSITE: Write title and text block content (sections, headlines, descriptions).
- If BLOG: Write a complete SEO-optimized blog article with headers, introduction, and conclusion.
- If RESTAURANT: Suggest a list of signature dishes with description and prices, and a tagline.
- If STORE: Suggest a list of trending products with specs and prices, and a promotion copy.

Format your response as a clean, markdown-friendly text structure. Do not output JSON wrappers, just the raw copy ready to be read/copied by the user.`;

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta/llama-3.1-70b-instruct',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500
          })
        });

        if (response.ok) {
          const resData = await response.json();
          const generatedText = resData?.choices?.[0]?.message?.content || '';
          if (generatedText) {
            return NextResponse.json({ success: true, text: generatedText });
          }
        }
      } catch (err) {
        console.error('NVIDIA AI Generator API call failed, falling back to mock templates:', err);
      }
    }

    // Fallback template builder if API key is not present or query failed
    let fallbackText = '';
    const cleanPrompt = prompt.toLowerCase();

    if (projectType === 'WEBSITE') {
      fallbackText = `# Welcome to our Premium Services\n\nGenerated for: "${prompt}"\n\n## About Us\nWe provide high-quality localized services customized to your requirements. Our mission is to combine craftsmanship with speed and reliability.\n\n## Our Services\n- **Consultation & Planning**: 30-minute kick-off discussion.\n- **Implementation**: Executing your vision with precision.\n- **Support & Handover**: Continuous updates and post-delivery support.\n\n## Why Choose Us\n- Real-time client support\n- Expert localized talent\n- Trusted community verification on Tolee\n\nContact us today to schedule your first booking!`;
    } else if (projectType === 'BLOG') {
      fallbackText = `# The Future of Local Creator Economies\n\nGenerated for: "${prompt}"\n\n## Introduction\nIn today's digital landscape, local businesses and creators need direct-to-consumer portals without paying heavy commissions to intermediary aggregates. Tolee World represents this paradigm shift.\n\n## The Power of Community Distribution\nSocial networks like Tolee allow creators to distribute their micro-websites and storefronts directly inside community feeds. This creates a high-trust loop where your neighbors are your first brand evangelists.\n\n## Key Takeaways\n1. Own your audience and slug (tolee.in/your-brand).\n2. Leverage AI assistants to create high-converting copy in minutes.\n3. Publish updates directly to your joined Tolee groups for organic, zero-ad-cost traffic.\n\n## Conclusion\nWhether you are a makeup artist, a chef, or an e-commerce retailer, starting your presence inside a verified neighborhood circle guarantees early adoption and higher trust.`;
    } else if (projectType === 'RESTAURANT') {
      fallbackText = `# Signature Menu Suggestions\n\nGenerated for: "${prompt}"\n\n## Main Dishes\n- **Fusion Paneer Tikka Wrap** - ₹249\n  *Marinated cottage cheese cubes grilled with local spices, wrapped in organic flatbread.*\n- **Tolee Special Spicy Burger** - ₹199\n  *Double crispy vegetable patty with melted Cheddar and chef's secret spicy house sauce.*\n- **Farmhouse Loaded Pizza (Large)** - ₹499\n  *Fresh dough topped with mushrooms, baby corn, olives, red paprika, and premium mozzarella.*\n\n## Beverages & Desserts\n- **Fresh Mint Mojito** - ₹120\n  *Refreshing cold blend of mint leaves, lemon juice, soda, and sweet cane sugar.*\n- **Molten Chocolate Lava Cup** - ₹150\n  *Rich cocoa cake with a warm, liquid chocolate center served with vanilla drizzle.*`;
    } else if (projectType === 'STORE') {
      fallbackText = `# Featured Products Catalog\n\nGenerated for: "${prompt}"\n\n## Trending Products\n- **Eco-Friendly Wireless Charger** - ₹899\n  *15W fast wireless charging pad made from 100% sustainable bamboo wood. Fits perfectly on any desk.*\n- **Ergonomic Leather Desk Mat** - ₹1,299\n  *Premium water-resistant vegan leather pad with anti-slip base. Ideal size for keyboard and mouse.*\n- **Futuristic Bluetooth Earbuds** - ₹1,799\n  *Active noise-cancelling earbuds with 24-hour battery backup and sleek metallic case.*`;
    } else {
      fallbackText = `Generated template content for prompt: "${prompt}"\n\nThis content is designed to represent premium copy for your creator ecosystem. Feel free to copy and edit it in your canvas.`;
    }

    return NextResponse.json({ success: true, text: fallbackText });

  } catch (error: any) {
    console.error('API Error in /api/ai-generator:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
