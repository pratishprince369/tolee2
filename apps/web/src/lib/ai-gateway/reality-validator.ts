/**
 * 🛡️ TOLEE REALITY VALIDATOR & ANTI-HALLUCINATION GUARD
 * 
 * Golden Rules: NEVER SIMULATE REALITY & NEVER FABRICATE BIOGRAPHIES.
 * - The AI must NEVER invent user counts, group memberships, notifications, messages, or posts.
 * - The AI must NEVER invent a person's profession, identity, achievements, or employment.
 * - Any claim that an action was completed ("published", "sent", "deleted") MUST be backed by a verified execution receipt.
 * - If an LLM response makes ungrounded biographical claims without verified evidence, this validator intercepts and corrects the response.
 */

import { isPersonQuery } from '@/lib/web-search';

export interface ValidationContext {
  userId?: string;
  userMessage: string;
  toolUsed?: string | null;
  toolResultSuccess?: boolean;
  toolReceiptId?: string | null;
  searchEvidence?: string | null;
}

export interface ValidationOutput {
  isValid: boolean;
  sanitizedContent: string;
  correctionNotice?: string;
  hasHallucinationWarning?: boolean;
}

export class ToleeRealityValidator {
  private static ACTION_VERBS = [
    'post publish kar diya',
    'post published',
    'message bhej diya',
    'message sent',
    'delete kar diya',
    'deleted successfully',
    'reminder set kar diya',
    'reminder created',
    'created the post',
    'sent the message'
  ];

  private static ACTION_PATTERNS = [
    /\b(post|update|reel).*?\b(publish|published|kar diya|kar chuka|ho gaya)/i,
    /\b(message|msg).*?\b(bhej diya|sent|bheja gaya)/i,
    /\b(delete|deleted|hata diya|remove kar diya)\b/i,
    /\b(reminder|alarm).*?\b(set kar diya|create kar diya|laga diya)/i,
    /\b(successfully publish|published successfully|publish kar diya)\b/i,
  ];

  private static SUSPICIOUS_PROFESSIONS = [
    'cricketer',
    'cricket coach',
    'former cricketer',
    'footballer',
    'actor',
    'actress',
    'singer',
    'pilot',
    'doctor',
    'surgeon',
    'scientist',
    'wrestler',
    'boxer'
  ];

  /**
   * Validates that an AI response does not hallucinate false completed actions or unverified identities
   */
  public static validate(rawReply: string, ctx: ValidationContext): ValidationOutput {
    const replyLower = (rawReply || '').toLowerCase();
    const userMsgLower = (ctx.userMessage || '').toLowerCase();

    // 1. Check if the LLM claimed an action occurred without tool verification
    const claimsActionDone =
      this.ACTION_VERBS.some(v => replyLower.includes(v)) ||
      this.ACTION_PATTERNS.some(p => p.test(replyLower));

    if (claimsActionDone) {
      const wasToolActuallyRun = Boolean(ctx.toolUsed);
      const wasToolSuccessful = Boolean(ctx.toolResultSuccess);

      if (!wasToolActuallyRun || !wasToolSuccessful) {
        console.warn(`[ToleeRealityValidator] Action hallucination intercepted. Claim without valid receipt.`);
        return {
          isValid: false,
          hasHallucinationWarning: true,
          sanitizedContent: `⚠️ **Action Verification Notice**: Post abhi draft state me prepare kiya gaya hai aur user approval ke liye waiting hai. Bina explicit user confirmation/approval ke live post publish nahi kiya gaya hai.`,
          correctionNotice: 'Unverified action claim intercepted.'
        };
      }
    }

    // Clean common phonetic/tokenization anomalies in Hindi/Hinglish
    let cleanedReply = rawReply.replace(/\braja neta\b/gi, 'rajneta');

    // 1b. Anti-Simulation / Zero-Placeholder Guard (v4 Honesty Rule H-2)
    const PLACEHOLDER_PATTERNS = [
      /\[Movie Name\]/gi,
      /\[Show Time\]/gi,
      /\[Theater Name\]/gi,
      /\[Seat Availability\]/gi,
      /\[Hotel Name\]/gi,
      /\[Room Type\]/gi,
      /\[Price\]/gi,
      /\[Ticket Price\]/gi,
    ];

    for (const pat of PLACEHOLDER_PATTERNS) {
      if (pat.test(cleanedReply)) {
        console.warn(`[ToleeRealityValidator] Simulated template placeholder intercepted: ${pat}`);
        cleanedReply = cleanedReply.replace(pat, '*(Live portal selection required)*');
      }
    }

    // 2. Real-Person Grounding Verification
    if (isPersonQuery(ctx.userMessage)) {
      const evidenceLower = (ctx.searchEvidence || '').toLowerCase();

      // Fix fabricated political transitions (e.g. "X se Y mein shamil" where X is not in search evidence)
      const majorParties = [
        { regex: /bharatiya janata party\s+se\s+/gi, key: 'bharatiya janata party' },
        { regex: /bjp\s+se\s+/gi, key: 'bjp' },
        { regex: /aam aadmi party\s+se\s+/gi, key: 'aam aadmi party' },
        { regex: /aap\s+se\s+/gi, key: 'aap' },
        { regex: /shiv sena\s+se\s+/gi, key: 'shiv sena' },
        { regex: /ncp\s+se\s+/gi, key: 'ncp' },
        { regex: /bsp\s+se\s+/gi, key: 'bsp' },
      ];

      for (const party of majorParties) {
        if (party.regex.test(cleanedReply) && !evidenceLower.includes(party.key)) {
          console.warn(`[ToleeRealityValidator] Stripping ungrounded party transition '${party.key} se'`);
          cleanedReply = cleanedReply.replace(party.regex, '');
        }
      }

      // Check if the reply asserts a specific profession
      for (const prof of this.SUSPICIOUS_PROFESSIONS) {
        if (replyLower.includes(prof)) {
          // If the profession is NOT mentioned in the verified search evidence
          if (!evidenceLower.includes(prof)) {
            console.warn(`[ToleeRealityValidator] Hallucinated profession '${prof}' intercepted for query: "${ctx.userMessage}"`);

            // If evidence is available, provide verified evidence summary
            if (evidenceLower && evidenceLower.length > 30) {
              return {
                isValid: false,
                sanitizedContent: `🔍 **Verified Sources Information**:\n\nAvailable reliable sources indicate that this entity is associated with the following details:\n\n${ctx.searchEvidence}\n\n*(Note: Any unsupported claims regarding professions like ${prof} were filtered as unverified).*`,
                correctionNotice: `Unsupported claim of '${prof}' corrected to verified sources.`
              };
            }

            // If no verified evidence exists at all, communicate uncertainty
            return {
              isValid: false,
              sanitizedContent: `Mujhe reliable sources se is vyakti ki identity ya profession verify nahi ho saki. Kripya thoda aur context ya profile link share karein taaki main sahi jankari de sakun.`,
              correctionNotice: `Unverified person claim intercepted.`
            };
          }
        }
      }
    }

    return {
      isValid: true,
      sanitizedContent: cleanedReply
    };
  }
}
