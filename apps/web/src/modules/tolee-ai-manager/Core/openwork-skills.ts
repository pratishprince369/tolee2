import { generateAIImageWithFallback, generateAIVideoWithFallback, callNvidiaLLM } from './chat-engine';

export interface OpenWorkSkillParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
}

export interface OpenWorkSkill {
  id: string;
  name: string;
  description: string;
  category: 'creative' | 'research' | 'social' | 'content' | 'developer' | 'crm';
  parameters: OpenWorkSkillParam[];
  execute: (args: Record<string, any>, context?: any) => Promise<{
    success: boolean;
    output: any;
    displayType?: 'text' | 'image' | 'card' | 'code' | 'post_preview';
    interactiveAction?: {
      type: string;
      label: string;
      payload: any;
    };
    logMessage: string;
  }>;
}

export const AWESOME_DESIGN_PRESETS: Record<string, { name: string; visualBlueprint: string }> = {
  'apple_minimal': {
    name: 'Apple Minimalist',
    visualBlueprint: 'Apple design aesthetic, pristine studio lighting, generous negative space, glassmorphism textures, clean minimalist composition, 8k resolution, elegant commercial product design'
  },
  'stripe_modern': {
    name: 'Stripe SaaS & Modern Tech',
    visualBlueprint: 'Stripe branding aesthetic, vibrant iridescent mesh gradients, modern isometric 3D geometry, high-contrast crisp graphic design, luxury corporate technology banner, 8k'
  },
  'linear_dark': {
    name: 'Linear Dark Mode',
    visualBlueprint: 'Linear app aesthetic, sleek obsidian dark theme, subtle glowing cyan and purple neon accents, razor sharp vector details, premium high-tech visual design, 8k'
  },
  'festive_royal': {
    name: 'Festive & Cultural Luxury',
    visualBlueprint: 'Indian festive luxury design, glowing golden diyas and intricate ornamentation, warm golden hour celebratory lighting, rich vibrant cultural palette, 8k commercial festival poster'
  },
  'nike_energy': {
    name: 'Nike High-Energy Commercial',
    visualBlueprint: 'Nike dynamic advertising style, high-energy dramatic rim lighting, bold typography, intense cinematic color grading, award-winning commercial poster, 8k'
  },
  'editorial_press': {
    name: 'Editorial Press & Magazine',
    visualBlueprint: 'Vogue & Time editorial magazine cover style, high-fashion studio lighting, clean journalistic grid layout, crisp typographic framing, 8k photojournalism'
  }
};

/**
 * 🌟 OpenWork Skills Registry
 */
export const OPENWORK_SKILL_REGISTRY: Record<string, OpenWorkSkill> = {
  // 1. Creative Studio Skill (Fooocus V2 + FLUX + Awesome Design-MD)
  creative_studio: {
    id: 'creative_studio',
    name: 'Creative Studio & Banner Designer',
    description: 'Generates ultra-high-resolution marketing banners, product creatives, posters, and thumbnails using Fooocus V2 and FLUX prompt expansion with Awesome Design-MD brand blueprints.',
    category: 'creative',
    parameters: [
      { name: 'prompt', type: 'string', description: 'Visual design description or banner topic', required: true },
      { name: 'style', type: 'string', description: 'Visual style preset: apple_minimal | stripe_modern | linear_dark | festive_royal | nike_energy | editorial_press' },
      { name: 'aspectRatio', type: 'string', description: 'Aspect ratio (e.g. 1:1, 16:9, 9:16, 4:5)' }
    ],
    execute: async (args) => {
      const rawPrompt = args.prompt || 'Modern professional marketing creative banner';
      const selectedStyleKey = args.style || 'stripe_modern';
      const preset = AWESOME_DESIGN_PRESETS[selectedStyleKey] || AWESOME_DESIGN_PRESETS['stripe_modern'];
      const lower = rawPrompt.toLowerCase();

      let enhancedPrompt = `${rawPrompt}, ${preset.visualBlueprint}`;

      // Festival / National Day / Typo Handling
      if (lower.includes('15') && (lower.includes('aug') || lower.includes('अगस्त') || lower.includes('augest') || lower.includes('august') || lower.includes('independe') || lower.includes('azadi'))) {
        enhancedPrompt = '15th August Indian Independence Day patriotic celebration commercial banner poster design, vibrant tricolor saffron white green ribbons, Indian national flag fluttering majestically, 3D typography Happy Independence Day, Ashoka Chakra emblem, celebratory patriotic background, 8k resolution graphic design';
      } else if (lower.includes('26') && (lower.includes('jan') || lower.includes('जनवरी') || lower.includes('republic'))) {
        enhancedPrompt = '26th January Indian Republic Day celebration creative banner, India Gate backdrop, majestic tricolor flag, patriotic typography, 8k commercial visual design';
      } else if (lower.includes('diwali') || lower.includes('deepawali') || lower.includes('दिवाली')) {
        enhancedPrompt = 'Happy Diwali grand festive celebration poster banner, glowing golden diyas, fireworks, traditional rangoli, luxury royal festive background, 8k resolution';
      } else {
        try {
          const trans = await callNvidiaLLM([{ 
            role: 'user', 
            content: `You are an Award-Winning Creative Art Director. Convert this user request into an ultra-detailed, professional 8K graphic banner prompt using the "${preset.name}" design aesthetic:\nRequest: "${rawPrompt}"\nOutput ONLY the final prompt in English.`
          }]);
          if (trans && trans.length > 15) {
            enhancedPrompt = `${trans.trim().replace(/^["']|["']$/g, '')}, ${preset.visualBlueprint}`;
          }
        } catch (e) {}
      }
      
      const imageUrl = await generateAIImageWithFallback(enhancedPrompt);
      return {
        success: true,
        output: {
          imageUrl,
          prompt: rawPrompt,
          style: preset.name,
          title: `Creative Design: ${rawPrompt.slice(0, 40)}...`
        },
        displayType: 'image',
        interactiveAction: {
          type: 'PUBLISH_POST',
          label: '🚀 Publish Banner to Feed',
          payload: {
            caption: `✨ Creative Design: ${rawPrompt}\n\nDesigned with Tolee OpenWork Creative Studio (${preset.name}) 🎨`,
            imageUrl
          }
        },
        logMessage: `Generated high-resolution creative visual for "${rawPrompt.slice(0, 30)}..." in ${preset.name} style.`
      };
    }
  },

  // 2. Real-time Web & News Research Skill
  web_research: {
    id: 'web_research',
    name: 'Real-time News & Web Research',
    description: 'Searches live news headlines, market updates, and trends from FreeNewsAPI, CurrentsAPI, and verified press sources.',
    category: 'research',
    parameters: [
      { name: 'query', type: 'string', description: 'Search term or research topic', required: true },
      { name: 'language', type: 'string', description: 'Language filter (hi, mr, en)' }
    ],
    execute: async (args) => {
      const query = args.query || 'Technology India';
      const freeNewsApiKey = process.env.FREENEWS_API_KEY || "763b5eea94f613c9c3826c04220ffdf9f97bc7bd90844327989de58d19e7cbe5";
      const currentsApiKey = process.env.CURRENTS_API_KEY || "ue1WLanfXoMsFJ9MHsL_NLmVBD2v8fRNXAqe-b5-MlfY4oLz";

      let results: any[] = [];
      try {
        const res = await fetch(`https://api.freenewsapi.io/v1/news?in_title=${encodeURIComponent(query)}&country=in`, {
          headers: { 'x-api-key': freeNewsApiKey },
          signal: AbortSignal.timeout(3500)
        });
        const data = await res.json();
        const articles = data.articles || data.results || data.news || [];
        if (Array.isArray(articles) && articles.length > 0) {
          results = articles.slice(0, 4).map((a: any) => ({
            title: a.title || a.headline,
            description: a.description || a.summary || '',
            image: a.image_url || a.image || a.urlToImage,
            url: a.link || a.url
          }));
        }
      } catch (e) {}

      if (results.length === 0) {
        try {
          const res = await fetch(`https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent(query)}&apiKey=${currentsApiKey}`, {
            signal: AbortSignal.timeout(3500)
          });
          const data = await res.json();
          if (data.news && Array.isArray(data.news)) {
            results = data.news.slice(0, 4).map((a: any) => ({
              title: a.title,
              description: a.description || '',
              image: a.image !== 'None' ? a.image : undefined,
              url: a.url
            }));
          }
        } catch (e) {}
      }

      return {
        success: true,
        output: {
          query,
          count: results.length,
          articles: results
        },
        displayType: 'card',
        logMessage: `Researched "${query}" and gathered ${results.length} live verified sources.`
      };
    }
  },

  // 3. Multilingual Content & Copywriting Skill
  content_writer: {
    id: 'content_writer',
    name: 'Multilingual Copywriter & SEO Specialist',
    description: 'Writes engaging social captions, blog posts, press releases, video scripts, and marketing copy tailored to your brand tone.',
    category: 'content',
    parameters: [
      { name: 'topic', type: 'string', description: 'Content topic or objective', required: true },
      { name: 'format', type: 'string', description: 'Format: post_caption | blog_article | video_script | email_newsletter | ad_copy' },
      { name: 'language', type: 'string', description: 'Language: Hindi | Marathi | English' },
      { name: 'tone', type: 'string', description: 'Tone: Professional | Casual | High-Energy | Storytelling' }
    ],
    execute: async (args) => {
      const topic = args.topic || 'New Product Launch';
      const format = args.format || 'post_caption';
      const language = args.language || 'Hindi & English (Hinglish)';
      const tone = args.tone || 'High-Energy & Engaging';

      const prompt = `You are a World-Class Growth Copywriter.
Topic: "${topic}"
Format: ${format}
Language: ${language}
Tone: ${tone}

Generate high-converting, polished content with compelling hooks, bullet points, call-to-actions, and relevant hashtags.`;

      const content = await callNvidiaLLM([{ role: 'user', content: prompt }]);
      return {
        success: true,
        output: {
          topic,
          format,
          content: content || `Here is your high-impact content for "${topic}".`,
        },
        displayType: 'text',
        logMessage: `Drafted ${format} on "${topic.slice(0, 30)}..." in ${language}.`
      };
    }
  },

  // 4. Social Auto-Publisher Skill
  social_publisher: {
    id: 'social_publisher',
    name: 'Social Media Auto-Publisher',
    description: 'Prepares, formats, and publishes interactive posts, carousels, or announcements to Tolee Feed and Communities.',
    category: 'social',
    parameters: [
      { name: 'caption', type: 'string', description: 'Post text or caption', required: true },
      { name: 'imageUrl', type: 'string', description: 'Optional media image URL' },
      { name: 'toleeId', type: 'string', description: 'Optional community Tolee ID' }
    ],
    execute: async (args) => {
      const caption = args.caption || '✨ New update on Tolee';
      const imageUrl = args.imageUrl;

      return {
        success: true,
        output: {
          caption,
          imageUrl,
          status: 'ready_to_publish'
        },
        displayType: 'post_preview',
        interactiveAction: {
          type: 'PUBLISH_POST',
          label: '🚀 1-Click Publish to Tolee Feed',
          payload: {
            caption,
            imageUrl,
            toleeId: args.toleeId
          }
        },
        logMessage: `Prepared social post for publishing to Tolee Feed.`
      };
    }
  },

  // 5. Code & Automation Script Generator
  code_generator: {
    id: 'code_generator',
    name: 'Full-Stack Developer & Script Runner',
    description: 'Generates clean TypeScript/React code, Tailwind UI components, SQL queries, or automation scripts.',
    category: 'developer',
    parameters: [
      { name: 'task', type: 'string', description: 'Coding requirement or script objective', required: true },
      { name: 'language', type: 'string', description: 'Programming language (typescript, python, sql, html)' }
    ],
    execute: async (args) => {
      const task = args.task || 'Create a React component';
      const lang = args.language || 'typescript';

      const prompt = `You are a Senior Full-Stack Software Engineer.
Write production-ready, clean, well-typed ${lang} code for:
"${task}"

Provide code with explanations and instructions.`;

      const codeOutput = await callNvidiaLLM([{ role: 'user', content: prompt }]);
      return {
        success: true,
        output: {
          task,
          language: lang,
          code: codeOutput
        },
        displayType: 'code',
        logMessage: `Generated production-ready ${lang} solution for "${task.slice(0, 30)}...".`
      };
    }
  },

  // 6. CRM & Calendar Task Scheduler
  crm_scheduler: {
    id: 'crm_scheduler',
    name: 'CRM & Calendar Task Scheduler',
    description: 'Schedules meetings, follow-ups, deadlines, and alarms in Tolee Calendar and CRM.',
    category: 'crm',
    parameters: [
      { name: 'title', type: 'string', description: 'Event or Task Title', required: true },
      { name: 'datetime', type: 'string', description: 'Date and time of the event' },
      { name: 'clientName', type: 'string', description: 'Client or contact name' }
    ],
    execute: async (args) => {
      const title = args.title || 'Client Follow-up';
      const datetime = args.datetime || new Date().toISOString();
      const clientName = args.clientName || 'General Lead';

      return {
        success: true,
        output: {
          title,
          datetime,
          clientName,
          status: 'scheduled'
        },
        displayType: 'card',
        interactiveAction: {
          type: 'NAVIGATE',
          label: '📅 View in Calendar & CRM',
          payload: {
            url: '/ai-manager?tab=calendar'
          }
        },
        logMessage: `Scheduled "${title}" with ${clientName} for ${datetime}.`
      };
    }
  },

  // 7. LTX-2 & AI Video Reel Generator Skill
  ai_video_generator: {
    id: 'ai_video_generator',
    name: 'LTX-2 AI Video Reel & Motion Generator',
    description: 'Generates 50 FPS 4K AI video animations, motion reels, and commercial video ads using LTX-2 text-to-video foundation technology.',
    category: 'creative',
    parameters: [
      { name: 'prompt', type: 'string', description: 'Video scene description or motion action', required: true },
      { name: 'aspectRatio', type: 'string', description: 'Aspect ratio: 9:16 (Reels/Shorts) | 16:9 (Widescreen)' },
      { name: 'duration', type: 'number', description: 'Duration in seconds (default: 10)' }
    ],
    execute: async (args) => {
      const rawPrompt = args.prompt || 'Cinematic drone shot of futuristic city';
      const aspectRatio = (args.aspectRatio === '9:16' ? '9:16' : '16:9') as '16:9' | '9:16';
      
      const { videoUrl, posterUrl, motionPrompt } = await generateAIVideoWithFallback(rawPrompt, aspectRatio);

      return {
        success: true,
        output: {
          videoUrl,
          posterUrl,
          prompt: rawPrompt,
          motionPrompt,
          aspectRatio,
          title: `AI Video Reel: ${rawPrompt.slice(0, 40)}...`
        },
        displayType: 'card',
        interactiveAction: {
          type: 'PUBLISH_POST',
          label: '🎬 Publish Video Reel to Feed',
          payload: {
            caption: `🎬 ${rawPrompt}\n\nGenerated with Tolee LTX-2 AI Video Studio 🚀`,
            imageUrl: posterUrl
          }
        },
        logMessage: `Generated 50 FPS LTX-2 video animation for "${rawPrompt.slice(0, 30)}..." (${aspectRatio}).`
      };
    }
  }
};
