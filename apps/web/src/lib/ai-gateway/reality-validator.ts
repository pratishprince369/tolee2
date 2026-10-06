/**
 * 🛡️ TOLEE REALITY VALIDATOR & ANTI-HALLUCINATION GUARD
 * 
 * Golden Rule: NEVER SIMULATE REALITY.
 * - The AI must NEVER invent user counts, group memberships, notifications, messages, or posts.
 * - Any claim that an action was completed ("published", "sent", "deleted") MUST be backed by a verified execution receipt.
 * - If an LLM response claims success for an action without a valid tool receipt, this validator intercepts and corrects the response.
 */

export interface ValidationContext {
  userId: string;
  userMessage: string;
  toolUsed: string | null;
  toolResultSuccess?: boolean;
  toolReceiptId?: string | null;
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

  /**
   * Validates that an AI response does not hallucinate false completed actions
   */
  public static validate(rawReply: string, ctx: ValidationContext): ValidationOutput {
    const replyLower = rawReply.toLowerCase();

    // Check if the LLM claimed an action occurred
    const claimsActionDone = this.ACTION_VERBS.some(v => replyLower.includes(v));

    // If an action was claimed to be completed, verify tool execution
    if (claimsActionDone) {
      const wasToolActuallyRun = Boolean(ctx.toolUsed);
      const wasToolSuccessful = Boolean(ctx.toolResultSuccess);

      if (!wasToolActuallyRun || !wasToolSuccessful) {
        // Hallucination detected! Model claimed action was done, but tool wasn't run or failed.
        console.warn(`[ToleeRealityValidator] Hallucination intercepted for user: ${ctx.userId}. Model claimed action without valid tool receipt.`);

        return {
          isValid: false,
          sanitizedContent: `⚠️ **Action Verification Notice**: System ne is action ko execute karne ke liye real confirmation require kiya hai. Kripya explicit command dein taaki backend par verified operation execute ho sake.`,
          correctionNotice: 'Unverified action claim intercepted.'
        };
      }
    }

    return {
      isValid: true,
      sanitizedContent: rawReply
    };
  }
}
