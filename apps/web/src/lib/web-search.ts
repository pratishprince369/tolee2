import https from 'https';

export interface WebSearchResult {
  title: string;
  snippet: string;
  url?: string;
}

export interface GroundingSearchResult {
  hasEvidence: boolean;
  snippets: string[];
  contextText: string;
  sources: string[];
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Clean search query by removing conversational filler
 */
export function extractCleanSearchTerm(query: string): string {
  let cleaned = query
    .replace(/kon hai|kaun hai|kon hain|kaun hain|who is|who was|kya hai|what is|unake bare me batao|unke bare me batao|inake bare me batao|inke bare me batao|batao|bataiye|tell me about|info about|details of|ke bare me|kon aahe|kon aahet|baddal mahiti|mahiti sanga|baddal sanga/gi, '')
    .replace(/[?।!.,]/g, '')
    .trim();

  // Normalize Hinglish common roles/offices to clear search queries
  if (/\bpm\b/i.test(cleaned) || /prime minister/i.test(cleaned)) {
    if (/india|bharat/i.test(cleaned)) return 'prime minister of india';
  }
  if (/\bcm\b/i.test(cleaned) || /chief minister/i.test(cleaned)) {
    if (/maharashtra/i.test(cleaned)) return 'chief minister of maharashtra';
    if (/up|uttar pradesh/i.test(cleaned)) return 'chief minister of uttar pradesh';
    if (/delhi/i.test(cleaned)) return 'chief minister of delhi';
  }

  cleaned = cleaned
    .replace(/\bpm\b/gi, 'prime minister')
    .replace(/\bcm\b/gi, 'chief minister')
    .replace(/\bka\b|\bki\b|\bke\b/gi, 'of');

  return cleaned.trim();
}

/**
 * Check if the input message is inquiring about an obscure or private person
 */
export function isPersonQuery(message: string): boolean {
  const lower = (message || '').toLowerCase().trim();
  if (!lower) return false;

  // Public offices and broad institutional roles are NOT obscure private person queries
  const publicOfficeKeywords = [
    'pm', 'prime minister', 'president', 'cm', 'chief minister', 'governor', 'minister',
    'ceo', 'founder', 'captain', 'leader', 'pradhan mantri', 'rashtrapati', 'mukhya mantri'
  ];
  if (publicOfficeKeywords.some((kw) => lower.includes(kw))) {
    return false;
  }

  const personTriggers = [
    'kon hai', 'kaun hai', 'kon hain', 'kaun hain', 'who is', 'who was',
    'unake bare me', 'unke bare me', 'inake bare me', 'inke bare me',
    'kiska name', 'kiska naam', 'biography', 'profile',
    'politician', 'cricketer', 'actor', 'minister', 'kon aahe', 'kon aahet'
  ];

  return personTriggers.some((t) => lower.includes(t));
}

/**
 * Robust Wikipedia OpenSearch & Extract API for verified encyclopedic facts
 */
async function searchWikipediaSummary(query: string): Promise<{ text: string; source: string }> {
  return new Promise((resolve) => {
    try {
      const cleanTerm = extractCleanSearchTerm(query);
      if (!cleanTerm) return resolve({ text: '', source: '' });

      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTerm)}&utf8=&format=json&srlimit=3`;
      const req = https.get(
        searchUrl,
        {
          headers: {
            'User-Agent': 'ToleeApp/1.0 (https://tolee.in; contact@tolee.in)',
          },
          timeout: 4000,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => { data += c; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const searchResults = json?.query?.search || [];
              if (searchResults.length === 0) {
                return resolve({ text: '', source: '' });
              }

              const topTitle = searchResults[0].title;

              // Fetch exact introductory extract for top matching title
              const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(topTitle)}&format=json`;
              const req2 = https.get(
                extractUrl,
                {
                  headers: {
                    'User-Agent': 'ToleeApp/1.0 (https://tolee.in; contact@tolee.in)',
                  },
                  timeout: 3500,
                },
                (res2) => {
                  let data2 = '';
                  res2.on('data', (c2) => { data2 += c2; });
                  res2.on('end', () => {
                    try {
                      const pages = JSON.parse(data2)?.query?.pages || {};
                      const page: any = Object.values(pages)[0];
                      const extract = (page?.extract || '').trim();
                      if (extract && extract.length > 30) {
                        return resolve({
                          text: extract,
                          source: `Wikipedia (${topTitle})`,
                        });
                      }
                    } catch {}

                    // Fallback to snippets
                    const snippets = searchResults.map((r: any) => {
                      const text = (r.snippet || '').replace(/<[^>]+>/g, '').trim();
                      return decodeHtmlEntities(text);
                    }).filter(Boolean);
                    resolve({
                      text: snippets.join('\n'),
                      source: `Wikipedia (${topTitle})`,
                    });
                  });
                }
              );
              req2.on('error', () => resolve({ text: '', source: '' }));
              req2.on('timeout', () => { req2.destroy(); resolve({ text: '', source: '' }); });
            } catch {
              resolve({ text: '', source: '' });
            }
          });
        }
      );
      req.on('timeout', () => { req.destroy(); resolve({ text: '', source: '' }); });
      req.on('error', () => resolve({ text: '', source: '' }));
    } catch {
      resolve({ text: '', source: '' });
    }
  });
}

/**
 * 🌐 Lightweight Live Internet Search Utility
 * Multi-source: DuckDuckGo HTML zero-key search + Wikipedia fallback with strict timeout.
 * Returns concise verified web snippets to eliminate knowledge cutoffs and hallucinations.
 */
export async function searchLiveWeb(query: string, maxResults: number = 4): Promise<string> {
  const result = await searchAndGroundQuery(query, maxResults);
  return result.contextText;
}

/**
 * Enhanced structured search that returns verified evidence state & snippets
 */
export async function searchAndGroundQuery(query: string, maxResults: number = 4): Promise<GroundingSearchResult> {
  const q = (query || '').trim();
  if (!q) {
    return { hasEvidence: false, snippets: [], contextText: '', sources: [] };
  }

  const cleanTerm = extractCleanSearchTerm(q);

  // 🚀 1. High-Precision Dedicated AI Search (Tavily API - Recommended for Vercel)
  if (process.env.TAVILY_API_KEY) {
    try {
      const tavilyRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: cleanTerm || q,
          search_depth: 'basic',
          max_results: maxResults,
        }),
      });
      if (tavilyRes.ok) {
        const data = await tavilyRes.json();
        if (data.results && data.results.length > 0) {
          const snippets = data.results.map((r: any) => `${r.title}: ${r.content}`);
          const sources = data.results.map((r: any) => r.url);
          return {
            hasEvidence: true,
            snippets,
            contextText: snippets.join('\n\n'),
            sources,
          };
        }
      }
    } catch (err: any) {
      console.warn('[WebSearch] Tavily fallback to DuckDuckGo:', err?.message);
    }
  }

  // 🚀 2. Google Search Provider (Serper API)
  if (process.env.SERPER_API_KEY) {
    try {
      const serperRes = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: cleanTerm || q, num: maxResults }),
      });
      if (serperRes.ok) {
        const data = await serperRes.json();
        const snippets: string[] = [];
        const sources: string[] = [];
        if (data.organic && data.organic.length > 0) {
          for (const item of data.organic.slice(0, maxResults)) {
            snippets.push(`${item.title}: ${item.snippet}`);
            sources.push(item.link);
          }
          return {
            hasEvidence: true,
            snippets,
            contextText: snippets.join('\n\n'),
            sources,
          };
        }
      }
    } catch (err: any) {
      console.warn('[WebSearch] Serper fallback to DuckDuckGo:', err?.message);
    }
  }

  const searchQueries: string[] = [];
  if (cleanTerm && cleanTerm.length > 2) {
    searchQueries.push(cleanTerm);
  }
  if (cleanTerm !== q) {
    searchQueries.push(q);
  }
  if (isPersonQuery(q) && cleanTerm) {
    searchQueries.push(`${cleanTerm} news`);
  }

  const allSnippets: string[] = [];
  const sources: string[] = [];

  for (const queryToTry of searchQueries) {
    if (allSnippets.length >= maxResults) break;

    const ddgSnippets = await new Promise<string[]>((resolve) => {
      try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryToTry)}`;
        const req = https.get(
          url,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml',
            },
            timeout: 4500,
          },
          (res) => {
            let html = '';
            res.on('data', (chunk) => {
              html += chunk;
              if (html.length > 150000) {
                res.destroy();
              }
            });
            res.on('end', () => {
              try {
                const regex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
                const found: string[] = [];
                let match: RegExpExecArray | null;
                while ((match = regex.exec(html)) !== null && found.length < maxResults) {
                  const cleaned = decodeHtmlEntities(
                    match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
                  );
                  if (cleaned && cleaned.length > 15) {
                    found.push(cleaned);
                  }
                }
                resolve(found);
              } catch {
                resolve([]);
              }
            });
          }
        );

        req.on('timeout', () => {
          req.destroy();
          resolve([]);
        });

        req.on('error', () => {
          resolve([]);
        });
      } catch {
        resolve([]);
      }
    });

    if (ddgSnippets.length > 0) {
      allSnippets.push(...ddgSnippets);
      sources.push('DuckDuckGo Web');
    }
  }

  // Integrate Wikipedia extract for person queries or if web search had limited results
  if (isPersonQuery(q) || allSnippets.length < 2) {
    try {
      const wiki = await searchWikipediaSummary(q);
      if (wiki.text && wiki.text.length > 20) {
        // Put authoritative encyclopedic extract at the beginning
        allSnippets.unshift(wiki.text);
        if (wiki.source) sources.unshift(wiki.source);
      }
    } catch {}
  }

  const uniqueSnippets = Array.from(new Set(allSnippets)).slice(0, maxResults);
  const hasEvidence = uniqueSnippets.length > 0;

  return {
    hasEvidence,
    snippets: uniqueSnippets,
    contextText: uniqueSnippets.join('\n\n'),
    sources: Array.from(new Set(sources)),
  };
}

/**
 * Check if a query requires live web verification (people, facts, current affairs, rates, weather, sports, recent events)
 */
export function requiresLiveWebSearch(message: string): boolean {
  const lower = (message || '').toLowerCase().trim();
  if (!lower) return false;

  // Person inquiry triggers
  if (isPersonQuery(lower)) return true;

  // Question words inquiring about things, or places
  const isQuestion = 
    lower.includes('kon hai') ||
    lower.includes('kaun hai') ||
    lower.includes('who is') ||
    lower.includes('who was') ||
    lower.includes('kya hai') ||
    lower.includes('what is') ||
    lower.includes('kab') ||
    lower.includes('when') ||
    lower.includes('kaha') ||
    lower.includes('where');

  // Real-time / temporal trigger keywords
  const liveKeywords = [
    'pm of', 'president of', 'cm of', 'minister', 'ceo of',
    'weather', 'mausam', 'temperature', 'taapman',
    'score', 'ipl', 'match', 'winner', 'who won', 'jeet', 'jeeta',
    'rate', 'price', 'dollar', 'gold', 'petrol', 'diesel', 'stock',
    'today', 'aaj', 'aaj ka', 'current', 'latest', 'hal hi me', 'abhi ka',
    '2024', '2025', '2026', 'news', 'breaking', 'taaza', 'taaza khabar',
    'election', 'chunav', 'narendra modi', 'biden', 'trump'
  ];

  return isQuestion || liveKeywords.some((kw) => lower.includes(kw));
}
