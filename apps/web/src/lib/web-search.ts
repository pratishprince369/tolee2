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
  return query
    .replace(/kon hai|kaun hai|who is|who was|kya hai|what is|unake bare me batao|unke bare me batao|inake bare me batao|inke bare me batao|batao|bataiye|tell me about|info about|details of|ke bare me/gi, '')
    .replace(/[?।!.,]/g, '')
    .trim();
}

/**
 * Check if the input message is inquiring about a real person
 */
export function isPersonQuery(message: string): boolean {
  const lower = (message || '').toLowerCase().trim();
  if (!lower) return false;

  const personTriggers = [
    'kon hai', 'kaun hai', 'who is', 'who was',
    'unake bare me', 'unke bare me', 'inake bare me', 'inke bare me',
    'kiska name', 'kiska naam', 'biography', 'profile',
    'politician', 'cricketer', 'actor', 'minister', 'ceo', 'founder'
  ];

  return personTriggers.some((t) => lower.includes(t));
}

/**
 * Quick Wikipedia OpenSearch / Summary API for people, places, concepts
 */
async function searchWikipediaSummary(query: string): Promise<{ text: string; source: string }> {
  return new Promise((resolve) => {
    try {
      const cleanTerm = extractCleanSearchTerm(query);
      if (!cleanTerm) return resolve({ text: '', source: '' });

      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTerm)}&utf8=&format=json&srlimit=3`;
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent': 'ToleeApp/1.0 (https://tolee.in; contact@tolee.in)',
          },
          timeout: 4500,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => { data += c; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const searchResults = json?.query?.search || [];
              const snippets = searchResults.map((r: any) => {
                const text = (r.snippet || '').replace(/<[^>]+>/g, '').trim();
                return decodeHtmlEntities(text);
              }).filter(Boolean);
              resolve({
                text: snippets.join('\n'),
                source: searchResults.length > 0 ? `Wikipedia (${searchResults[0].title})` : ''
              });
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
  const searchQueries = [q];
  if (cleanTerm && cleanTerm !== q && cleanTerm.length > 2) {
    searchQueries.push(cleanTerm);
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

  // Fallback to Wikipedia Summary API if web search had limited results
  if (allSnippets.length < 2) {
    try {
      const wiki = await searchWikipediaSummary(q);
      if (wiki.text && wiki.text.length > 20) {
        allSnippets.push(wiki.text);
        if (wiki.source) sources.push(wiki.source);
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
