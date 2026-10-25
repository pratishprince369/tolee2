import { NextRequest, NextResponse } from 'next/server';
import { BrowserWorker, BrowserDiagnosticResult } from '@/modules/tolee-ai-agent/browser/browser-worker';
import https from 'https';
import http from 'http';
import { URL } from 'url';

function buildErrorHtml(targetUrl: string, diagnostic: BrowserDiagnosticResult): string {
  let host = targetUrl;
  try {
    host = new URL(targetUrl).hostname;
  } catch {}

  const stateTitle =
    diagnostic.state === 'BOT_PROTECTION_BLOCK'
      ? 'Security Service Block (WAF)'
      : diagnostic.state === 'CAPTCHA_REQUIRED'
      ? 'Interactive Challenge Required'
      : diagnostic.state === 'LOGIN_REQUIRED'
      ? 'Authentication Required'
      : diagnostic.state === 'NAVIGATION_TIMEOUT'
      ? 'Connection Timed Out'
      : diagnostic.state === 'DNS_OR_NETWORK_ERROR'
      ? 'Domain Not Found (DNS Error)'
      : diagnostic.state === 'CONNECTION_REFUSED'
      ? 'Connection Refused by Server'
      : diagnostic.state === 'ACCESS_DENIED'
      ? 'Access Forbidden (403)'
      : 'Unable to Load Page';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Browser Notice · ${host}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #090d16;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 32px;
      max-width: 520px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 16px;
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
      color: #ffffff;
    }
    p {
      margin: 0 0 20px;
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .url {
      background: #0b0f19;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      color: #38bdf8;
      word-break: break-all;
      margin-bottom: 24px;
      border: 1px solid #1e293b;
    }
    .actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      border: none;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
    }
    .btn-secondary:hover {
      background: #334155;
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${diagnostic.state.replace(/_/g, ' ')}</div>
    <h2>${stateTitle}</h2>
    <p>${diagnostic.blockReason || diagnostic.reason || 'This website cannot be previewed in the embedded browser.'}</p>
    <div class="url">${targetUrl}</div>
    <div class="actions">
      <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
        Open in Regular Browser ↗
      </a>
      <button onclick="window.location.reload()" class="btn btn-secondary">
        Retry ↻
      </button>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 🌐 Tolee Real Live Browser Secure Proxy
 * Loads real target websites inside the Tolee right-side LiveBrowserOperatorCanvas iframe.
 * 
 * Security:
 * - Validates URL with BrowserWorker.isSafeUrl (SSRF Guard: blocks loopbacks, private IPs, cloud metadata)
 * - Classifies into 15 discrete diagnostic states using BrowserWorker.classifyBrowserDiagnostic
 * - Strips X-Frame-Options and Content-Security-Policy to allow embedded sandboxed preview
 * - Injects <base href="..."> so stylesheets, fonts, and assets load from the origin
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // 1. SSRF Safety Check
  const safety = BrowserWorker.isSafeUrl(targetUrl);
  if (!safety.safe) {
    const diagnostic = BrowserWorker.classifyBrowserDiagnostic({
      statusCode: 403,
      targetUrl,
      error: { message: `SSRF Security Error: ${safety.reason}` },
    });
    return new NextResponse(buildErrorHtml(targetUrl, diagnostic), {
      status: 403,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'x-tolee-diagnostic-state': 'ACCESS_DENIED',
        'x-tolee-browser-blocked': 'true',
        'x-tolee-block-reason': safety.reason || 'SSRF_BLOCKED',
      },
    });
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const client = parsedTarget.protocol === 'https:' ? https : http;

    return await new Promise<NextResponse>((resolve) => {
      const proxyReq = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
            'Cache-Control': 'no-cache',
          },
          timeout: 8000,
        },
        (proxyRes) => {
          // Handle redirects (up to 1 hop)
          if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            try {
              const redirectUrl = new URL(proxyRes.headers.location, targetUrl).toString();
              const redirectSafety = BrowserWorker.isSafeUrl(redirectUrl);
              if (redirectSafety.safe) {
                return resolve(
                  NextResponse.redirect(new URL(`/api/browser/proxy?url=${encodeURIComponent(redirectUrl)}`, request.url))
                );
              }
            } catch {}
          }

          let data = '';
          proxyRes.setEncoding('utf8');
          proxyRes.on('data', (chunk) => {
            if (data.length < 500000) {
              data += chunk;
            }
          });

          proxyRes.on('end', () => {
            const origin = parsedTarget.origin;
            let modifiedHtml = data;

            // Classify diagnostics using the 15-state engine
            const diagnostic = BrowserWorker.classifyBrowserDiagnostic({
              statusCode: proxyRes.statusCode || 200,
              headers: proxyRes.headers as Record<string, any>,
              body: data,
              targetUrl,
              finalUrl: proxyRes.headers.location || targetUrl,
            });

            // Inject base href tag if HTML
            if (proxyRes.headers['content-type']?.includes('text/html') || data.includes('<html')) {
              modifiedHtml = modifiedHtml.replace(/<base[^>]*>/gi, '');
              const baseTag = `<base href="${origin}/">\n<meta name="referrer" content="no-referrer">\n`;
              if (modifiedHtml.includes('<head>')) {
                modifiedHtml = modifiedHtml.replace('<head>', `<head>\n${baseTag}`);
              } else if (modifiedHtml.includes('<head ')) {
                modifiedHtml = modifiedHtml.replace(/<head[^>]*>/i, `$& \n${baseTag}`);
              } else {
                modifiedHtml = baseTag + modifiedHtml;
              }

              // Strip aggressive framing busters
              modifiedHtml = modifiedHtml.replace(/if\s*\(top\s*!==\s*self\)\s*top\.location\s*=\s*self\.location;?/gi, '');
            }

            const responseHeaders = new Headers();
            responseHeaders.set('Content-Type', proxyRes.headers['content-type'] || 'text/html; charset=utf-8');
            responseHeaders.set('Cache-Control', 'no-store, max-age=0');
            responseHeaders.set('x-tolee-diagnostic-state', diagnostic.state);
            responseHeaders.set('x-tolee-browser-blocked', diagnostic.isBlocked ? 'true' : 'false');
            if (diagnostic.blockReason) {
              responseHeaders.set('x-tolee-block-reason', diagnostic.blockReason);
            }
            if (diagnostic.suggestedAction) {
              responseHeaders.set('x-tolee-suggested-action', diagnostic.suggestedAction);
            }
            // Remove frame blocking headers
            responseHeaders.delete('x-frame-options');
            responseHeaders.delete('content-security-policy');

            resolve(
              new NextResponse(modifiedHtml, {
                status: proxyRes.statusCode || 200,
                headers: responseHeaders,
              })
            );
          });
        }
      );

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        const diagnostic = BrowserWorker.classifyBrowserDiagnostic({
          error: { code: 'ETIMEDOUT', message: 'Navigation timed out' },
          targetUrl,
        });
        resolve(
          new NextResponse(buildErrorHtml(targetUrl, diagnostic), {
            status: 504,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'x-tolee-diagnostic-state': 'NAVIGATION_TIMEOUT',
              'x-tolee-browser-blocked': 'false',
              'x-tolee-suggested-action': 'retry',
            },
          })
        );
      });

      proxyReq.on('error', (err) => {
        const diagnostic = BrowserWorker.classifyBrowserDiagnostic({
          error: err,
          targetUrl,
        });
        resolve(
          new NextResponse(buildErrorHtml(targetUrl, diagnostic), {
            status: 502,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'x-tolee-diagnostic-state': diagnostic.state,
              'x-tolee-browser-blocked': diagnostic.isBlocked ? 'true' : 'false',
              'x-tolee-suggested-action': diagnostic.suggestedAction,
            },
          })
        );
      });
    });
  } catch (err: any) {
    const diagnostic = BrowserWorker.classifyBrowserDiagnostic({
      error: err,
      targetUrl,
    });
    return new NextResponse(buildErrorHtml(targetUrl, diagnostic), {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'x-tolee-diagnostic-state': diagnostic.state,
        'x-tolee-browser-blocked': 'false',
      },
    });
  }
}
