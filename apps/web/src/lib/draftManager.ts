export interface DraftItem {
  id: string;
  postType: 'regular' | 'win' | 'news' | 'reel' | 'screen';
  headline?: string;
  content: string;
  summary?: string;
  category?: string;
  mediaList?: { type: 'image' | 'video'; url: string }[];
  selectedTolees?: string[];
  toleeId?: string;
  toleeName?: string;
  toleeSlug?: string;
  createdAt: string;
  updatedAt: string;
}

export const MAX_DRAFTS_LIMIT = 3;

function getStorageKey(userId?: string | null): string {
  return userId ? `tolee_user_drafts_${userId}` : 'tolee_user_drafts_guest';
}

export function getDrafts(userId?: string | null): DraftItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: DraftItem[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read drafts:', err);
    return [];
  }
}

export function saveDraft(
  userId: string | null | undefined, 
  draftData: Partial<DraftItem>
): { success: boolean; error?: string; drafts: DraftItem[] } {
  if (typeof window === 'undefined') return { success: false, error: 'SSR environment', drafts: [] };
  
  try {
    const key = getStorageKey(userId);
    const existing = getDrafts(userId);

    // If updating an existing draft
    if (draftData.id) {
      const idx = existing.findIndex(d => d.id === draftData.id);
      if (idx !== -1) {
        existing[idx] = {
          ...existing[idx],
          ...draftData,
          updatedAt: new Date().toISOString()
        } as DraftItem;
        localStorage.setItem(key, JSON.stringify(existing));
        window.dispatchEvent(new Event('tolee_drafts_updated'));
        return { success: true, drafts: existing };
      }
    }

    // Check Max Limit of 3 drafts
    if (existing.length >= MAX_DRAFTS_LIMIT) {
      return { 
        success: false, 
        error: `Draft queue is full (Max ${MAX_DRAFTS_LIMIT} drafts). Please publish or delete older drafts first.`,
        drafts: existing 
      };
    }

    const newDraft: DraftItem = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      postType: draftData.postType || 'regular',
      headline: draftData.headline || '',
      content: draftData.content || '',
      summary: draftData.summary || '',
      category: draftData.category || '',
      mediaList: draftData.mediaList || [],
      selectedTolees: draftData.selectedTolees || [],
      toleeId: draftData.toleeId || '',
      toleeName: draftData.toleeName || '',
      toleeSlug: draftData.toleeSlug || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newDraft, ...existing];
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new Event('tolee_drafts_updated'));
    return { success: true, drafts: updated };
  } catch (err: any) {
    console.error('Failed to save draft:', err);
    return { success: false, error: err.message || 'Failed to save draft', drafts: getDrafts(userId) };
  }
}

export function deleteDraft(userId: string | null | undefined, draftId: string): DraftItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getStorageKey(userId);
    const existing = getDrafts(userId);
    const updated = existing.filter(d => d.id !== draftId);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new Event('tolee_drafts_updated'));
    return updated;
  } catch (err) {
    console.error('Failed to delete draft:', err);
    return getDrafts(userId);
  }
}

export function clearAllDrafts(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey(userId);
    localStorage.removeItem(key);
    window.dispatchEvent(new Event('tolee_drafts_updated'));
  } catch (err) {
    console.error('Failed to clear drafts:', err);
  }
}
