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
    const claimsActionDone = this.ACTION_VERBS.some(v => replyLower.includes(v));
    if (claimsActionDone) {
      const wasToolActuallyRun = Boolean(ctx.toolUsed);
      const wasToolSuccessful = Boolean(ctx.toolResultSuccess);

      if (!wasToolActuallyRun || !wasToolSuccessful) {
        console.warn(`[ToleeRealityValidator] Action hallucination intercepted. Claim without valid receipt.`);
        return {
          isValid: false,
          sanitizedContent: `⚠️ **Action Verification Notice**: System ne is action ko execute karne ke liye real confirmation require kiya hai. Kripya explicit command dein taaki backend par verified operation execute ho sake.`,
          correctionNotice: 'Unverified action claim intercepted.'
        };
      }
    }

    // 2. Real-Person Grounding Verification
    if (isPersonQuery(ctx.userMessage)) {
      const evidenceLower = (ctx.searchEvidence || '').toLowerCase();

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
      sanitizedContent: rawReply
    };
  }
}
