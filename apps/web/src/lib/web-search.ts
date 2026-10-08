import https from 'https';

export interface WebSearchResult {
  title: string;
  snippet: string;
  url?: string;
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
 * Fallback: Quick Wikipedia OpenSearch / Summary API for people, places, concepts
 */
async function searchWikipediaSummary(query: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const cleanTerm = query
        .replace(/kon hai|kaun hai|who is|kya hai|what is|batao|tell me about/gi, '')
        .trim();
      if (!cleanTerm) return resolve('');

      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTerm)}&utf8=&format=json&srlimit=2`;
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent': 'ToleeApp/1.0 (https://tolee.in; contact@tolee.in)',
          },
          timeout: 2500,
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
              resolve(snippets.join('\n'));
            } catch {
              resolve('');
            }
          });
        }
      );
      req.on('timeout', () => { req.destroy(); resolve(''); });
      req.on('error', () => resolve(''));
    } catch {
      resolve('');
    }
  });
}

/**
 * 🌐 Lightweight Live Internet Search Utility
 * Multi-source: DuckDuckGo HTML zero-key search + Wikipedia fallback with strict timeout.
 * Returns concise verified web snippets to eliminate knowledge cutoffs and hallucinations.
 */
export async function searchLiveWeb(query: string, maxResults: number = 3): Promise<string> {
  const q = (query || '').trim();
  if (!q) return '';

  const ddgResults = await new Promise<string>((resolve) => {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
          timeout: 3000,
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
              const regex = new RegExp('<a class="result__snippet[^>]*>([\\s\\S]*?)<\\/a>', 'g');
              const snippets: string[] = [];
              let match: RegExpExecArray | null;
              while ((match = regex.exec(html)) !== null && snippets.length < maxResults) {
                const cleaned = decodeHtmlEntities(
                  match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
                );
                if (cleaned && cleaned.length > 15) {
                  snippets.push(cleaned);
                }
              }
              resolve(snippets.join('\n'));
            } catch {
              resolve('');
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve('');
      });

      req.on('error', () => {
        resolve('');
      });
    } catch {
      resolve('');
    }
  });

  if (ddgResults && ddgResults.trim().length > 20) {
    return ddgResults;
  }

  // Fallback to Wikipedia Summary API if DDG returned empty
  try {
    const wikiResults = await searchWikipediaSummary(q);
    if (wikiResults && wikiResults.trim().length > 20) {
      return wikiResults;
    }
  } catch {}

  return ddgResults;
}

/**
 * Check if a query requires live web verification (people, facts, current affairs, rates, weather, sports, recent events)
 */
export function requiresLiveWebSearch(message: string): boolean {
  const lower = (message || '').toLowerCase().trim();
  if (!lower) return false;

  // Question words inquiring about people, things, or places
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
    'election', 'chunav', 'narendra modi', 'biden', 'trump', 'rupawate'
  ];

  return isQuestion || liveKeywords.some((kw) => lower.includes(kw));
}
