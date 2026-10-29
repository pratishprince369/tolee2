import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { CamofoxBrowserService } from '@/modules/tolee-ai-agent/browser/camofox-service';
import { BrowserWorker } from '@/modules/tolee-ai-agent/browser/browser-worker';

export const dynamic = 'force-dynamic';

/**
 * 🦊 CAMOFOX BROWSER CONTROLLER API ROUTE
 * 
 * Endpoints handled via POST payload:
 * - { action: 'health' }
 * - { action: 'create_tab', url, sessionKey }
 * - { action: 'navigate', tabId, url }
 * - { action: 'snapshot', tabId, url }
 * - { action: 'click', tabId, ref }
 * - { action: 'type', tabId, ref, text }
 * - { action: 'scroll', tabId, direction, amount }
 * - { action: 'screenshot', tabId }
 * - { action: 'close_tab', tabId }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'anonymous_user';

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'health';

    // 1. Health check (no strict auth needed)
    if (action === 'health') {
      const health = await CamofoxBrowserService.checkHealth(true);
      return NextResponse.json({ success: true, ...health });
    }

    // 2. Tab Creation
    if (action === 'create_tab') {
      const targetUrl = body.url || 'about:blank';
      if (targetUrl !== 'about:blank') {
        const safety = BrowserWorker.isSafeUrl(targetUrl);
        if (!safety.safe) {
          return NextResponse.json({ success: false, error: safety.reason }, { status: 400 });
        }
      }

      const tab = await CamofoxBrowserService.createTab({
        userId,
        sessionKey: body.sessionKey,
        url: targetUrl,
      });
      return NextResponse.json({ success: true, tab });
    }

    // 3. Navigation
    if (action === 'navigate') {
      const { tabId, url } = body;
      if (!url) {
        return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 });
      }

      const navResult = await CamofoxBrowserService.navigate({
        tabId: tabId || 'default',
        url,
        userId,
      });
      return NextResponse.json(navResult);
    }

    // 4. Accessibility Snapshot (e1, e2 refs)
    if (action === 'snapshot') {
      const { tabId, url } = body;
      const snapshot = await CamofoxBrowserService.getSnapshot({
        tabId: tabId || 'default',
        url,
        userId,
      });
      return NextResponse.json({ success: true, snapshot });
    }

    // 5. Click Element
    if (action === 'click') {
      const { tabId, ref } = body;
      if (!ref) {
        return NextResponse.json({ success: false, error: 'Element ref required' }, { status: 400 });
      }

      const clickRes = await CamofoxBrowserService.click({
        tabId: tabId || 'default',
        ref,
        userId,
      });
      return NextResponse.json(clickRes);
    }

    // 6. Type into Element
    if (action === 'type') {
      const { tabId, ref, text } = body;
      if (!ref) {
        return NextResponse.json({ success: false, error: 'Element ref required' }, { status: 400 });
      }

      const typeRes = await CamofoxBrowserService.type({
        tabId: tabId || 'default',
        ref,
        text: text || '',
        userId,
      });
      return NextResponse.json(typeRes);
    }

    // 7. Scroll
    if (action === 'scroll') {
      const { tabId, direction, amount } = body;
      const scrollRes = await CamofoxBrowserService.scroll({
        tabId: tabId || 'default',
        direction: direction === 'up' ? 'up' : 'down',
        amount: Number(amount) || 500,
        userId,
      });
      return NextResponse.json(scrollRes);
    }

    // 8. Screenshot
    if (action === 'screenshot') {
      const { tabId } = body;
      const shotRes = await CamofoxBrowserService.screenshot({
        tabId: tabId || 'default',
        userId,
      });
      return NextResponse.json(shotRes);
    }

    // 9. Close Tab
    if (action === 'close_tab') {
      const { tabId } = body;
      if (tabId) {
        await CamofoxBrowserService.closeTab({ tabId, userId });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: `Unknown action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
