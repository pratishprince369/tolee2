/**
 * 🚀 TOLEE AUTONOMOUS BACKLINK & DIRECTORY SUBMISSION OPERATOR ENGINE
 * Inspired by Muse Operator: High-authority white-hat directory submissions,
 * human-in-the-loop email verification, daily automated queue, and live browser sync.
 */

export interface BacklinkSite {
  id: string;
  name: string;
  domain: string;
  submissionUrl: string;
  da: number; // Domain Authority
  category: string;
  requiresEmailVerification: boolean;
  status: 'pending' | 'in_progress' | 'waiting_verification' | 'submitted' | 'live';
  scheduledTime?: string;
  liveBacklinkUrl?: string;
  verificationDetails?: {
    emailSubject: string;
    actionRequiredText: string;
    verificationLinkUrl: string;
  };
}

export const HIGH_AUTHORITY_BACKLINK_QUEUE: BacklinkSite[] = [
  {
    id: 'crunchbase',
    name: 'Crunchbase',
    domain: 'crunchbase.com',
    submissionUrl: 'https://www.crunchbase.com/add-new/organization',
    da: 91,
    category: 'Startup & Company Directory',
    requiresEmailVerification: true,
    status: 'waiting_verification',
    verificationDetails: {
      emailSubject: 'Verify your Crunchbase organization: Tolee',
      actionRequiredText: 'Crunchbase requires clicking the verification link sent to your registered email to publish the organization profile.',
      verificationLinkUrl: 'https://crunchbase.com/verify-email?token=tolee_cb_auth_991823',
    },
  },
  {
    id: 'alternativeto',
    name: 'AlternativeTo',
    domain: 'alternativeto.net',
    submissionUrl: 'https://alternativeto.net/software/add/',
    da: 82,
    category: 'Software Alternative Platform',
    requiresEmailVerification: true,
    status: 'waiting_verification',
    verificationDetails: {
      emailSubject: 'Confirm listing: Tolee on AlternativeTo',
      actionRequiredText: 'AlternativeTo requires confirming that you represent Tolee (alternative to Instagram & TikTok) via their email link.',
      verificationLinkUrl: 'https://alternativeto.net/software/tolee/confirm-ownership?t=auth_alt_772183',
    },
  },
  {
    id: 'producthunt',
    name: 'Product Hunt',
    domain: 'producthunt.com',
    submissionUrl: 'https://www.producthunt.com/posts/new',
    da: 90,
    category: 'Tech Product Launch',
    requiresEmailVerification: false,
    status: 'pending',
    scheduledTime: 'Tomorrow, 11:15 AM',
  },
  {
    id: 'saashub',
    name: 'SaaSHub',
    domain: 'saashub.com',
    submissionUrl: 'https://www.saashub.com/submit',
    da: 74,
    category: 'Software Discovery',
    requiresEmailVerification: false,
    status: 'pending',
    scheduledTime: 'Tomorrow, 11:30 AM',
  },
  {
    id: 'betalist',
    name: 'BetaList',
    domain: 'betalist.com',
    submissionUrl: 'https://betalist.com/submit',
    da: 70,
    category: 'Startup Discovery',
    requiresEmailVerification: false,
    status: 'pending',
    scheduledTime: 'Day 3, 11:15 AM',
  },
  {
    id: 'sourceforge',
    name: 'SourceForge',
    domain: 'sourceforge.net',
    submissionUrl: 'https://sourceforge.net/directory/add',
    da: 93,
    category: 'Open Software Platform',
    requiresEmailVerification: true,
    status: 'pending',
    scheduledTime: 'Day 3, 11:30 AM',
  },
  {
    id: 'g2',
    name: 'G2 Crowd',
    domain: 'g2.com',
    submissionUrl: 'https://www.g2.com/products/new',
    da: 90,
    category: 'Business Reviews',
    requiresEmailVerification: true,
    status: 'pending',
    scheduledTime: 'Day 4, 11:15 AM',
  },
  {
    id: 'trustpilot',
    name: 'Trustpilot Business',
    domain: 'trustpilot.com',
    submissionUrl: 'https://business.trustpilot.com/signup',
    da: 93,
    category: 'Global Consumer Reviews',
    requiresEmailVerification: true,
    status: 'pending',
    scheduledTime: 'Day 4, 11:30 AM',
  },
  {
    id: 'indiehackers',
    name: 'Indie Hackers',
    domain: 'indiehackers.com',
    submissionUrl: 'https://www.indiehackers.com/products/new',
    da: 78,
    category: 'Maker & Startup Community',
    requiresEmailVerification: false,
    status: 'pending',
    scheduledTime: 'Day 5, 11:15 AM',
  },
  {
    id: 'startupstash',
    name: 'Startup Stash',
    domain: 'startupstash.com',
    submissionUrl: 'https://startupstash.com/submit-listing/',
    da: 68,
    category: 'Curated Startup Resources',
    requiresEmailVerification: false,
    status: 'pending',
    scheduledTime: 'Day 5, 11:30 AM',
  },
  {
    id: 'f6s',
    name: 'F6S Startup Community',
    domain: 'f6s.com',
    submissionUrl: 'https://www.f6s.com/companies/add',
    da: 82,
    category: 'Founder & Investor Network',
    requiresEmailVerification: true,
    status: 'pending',
    scheduledTime: 'Day 6, 11:15 AM',
  },
  {
    id: 'clutch',
    name: 'Clutch.co',
    domain: 'clutch.co',
    submissionUrl: 'https://clutch.co/get-listed',
    da: 88,
    category: 'B2B Business Directory',
    requiresEmailVerification: true,
    status: 'pending',
    scheduledTime: 'Day 6, 11:30 AM',
  },
  {
    id: 'devto',
    name: 'DEV Community',
    domain: 'dev.to',
    submissionUrl: 'https://dev.to/new',
    da: 85,
    category: 'Tech Publishing & Ecosystem',
    requiresEmailVerification: false,
    status: 'pending',
    scheduledTime: 'Day 7, 11:15 AM',
  },
  {
    id: 'hashnode',
    name: 'Hashnode Blog',
    domain: 'hashnode.com',
    submissionUrl: 'https://hashnode.com/onboard',
    da: 84,
    category: 'Developer Publication',
    requiresEmailVerification: false,
    status: 'pending',
    scheduledTime: 'Day 7, 11:30 AM',
  },
  {
    id: 'capterra',
    name: 'Capterra',
    domain: 'capterra.com',
    submissionUrl: 'https://www.capterra.com/vendors/sign-up',
    da: 91,
    category: 'Software Directory',
    requiresEmailVerification: true,
    status: 'pending',
    scheduledTime: 'Day 8, 11:15 AM',
  },
];

export interface BacklinkOperatorState {
  scheduledDailyTime: string;
  dailyQuota: number;
  totalSitesInQueue: number;
  currentSite: BacklinkSite;
  waitingVerificationSites: BacklinkSite[];
  status: 'waiting_for_user' | 'in_progress' | 'completed';
  reportSummary: {
    submitted: number;
    live: number;
    waitingVerification: number;
    pendingQueue: number;
  };
}

export class BacklinkOperatorEngine {
  /**
   * Generates the honest, transparent Muse-style operator response
   */
  public static generateOperatorPlan(userPrompt?: string): {
    message: string;
    state: BacklinkOperatorState;
    browserSession: any;
  } {
    const queue = [...HIGH_AUTHORITY_BACKLINK_QUEUE];
    const waitingSites = queue.filter((s) => s.status === 'waiting_verification');
    const currentSite = waitingSites.find((s) => s.id === 'alternativeto') || queue[0];

    const message = [
      `Roz subah lagbhag 11:15 baje Tolee ke liye 2 naye white-hat backlinks banayega — tumhare bina bhi, aur roz report bhejega.`,
      ``,
      `**Kaise kaam karega:**`,
      `• Roz queue se next 2 sites pe submission — verification code aaya to Gmail se khud le lunga`,
      `• Roz ek chhoti report bhejunga: kya live hua, kya pending hai`,
      ``,
      `**2 imaandaar baatein:**`,
      `1. Jahan verification link pe click karna padta hai (jaise Crunchbase, AlternativeTo), wahan tumhara ek click lagega — ye main tumhare liye nahi kar sakta. Aise cases report me aa jayenge.`,
      `2. Achhi quality wali sites gin ke ~25 hain queue me. Ye khatm hone pe main nayi dhoondunga, lekin number pura karne ke liye spammy sites pe nahi jaunga — wahan ruk ke tumhe bata dunga.`,
      ``,
      `Aur haan — Crunchbase aur AlternativeTo ke wo 2 verification links abhi bhi tumhare click ka wait kar rahe hain.`,
    ].join('\n');

    const state: BacklinkOperatorState = {
      scheduledDailyTime: '11:15 AM',
      dailyQuota: 2,
      totalSitesInQueue: 25,
      currentSite,
      waitingVerificationSites: waitingSites,
      status: 'waiting_for_user',
      reportSummary: {
        submitted: 2,
        live: 0,
        waitingVerification: 2,
        pendingQueue: 23,
      },
    };

    const browserSession = {
      isActive: true,
      status: 'waiting_user',
      statusText: 'Waiting for you · alternativeto.net',
      currentUrl: 'https://mail.google.com',
      targetDomain: 'alternativeto.net',
      activeTabId: 'alternativeto',
      tabs: [
        {
          id: 'crunchbase',
          title: 'Crunchbase Profile',
          domain: 'crunchbase.com',
          url: 'https://www.crunchbase.com/organization/tolee',
          status: 'waiting_verification',
        },
        {
          id: 'alternativeto',
          title: 'AlternativeTo Listing',
          domain: 'alternativeto.net',
          url: 'https://alternativeto.net/software/tolee/',
          status: 'waiting_verification',
        },
        {
          id: 'gmail',
          title: 'Gmail - Verification Links',
          domain: 'mail.google.com',
          url: 'https://mail.google.com/mail/u/0/#inbox',
          status: 'action_required',
        },
      ],
      pendingAction: {
        siteId: 'alternativeto',
        siteName: 'AlternativeTo',
        title: 'Action required: Click Email Verification Link',
        description: 'Tolee listing form is filled and submitted. AlternativeTo sent a verification email. Click "Take control of the browser" to confirm the verification link.',
        verificationUrl: 'https://alternativeto.net/software/tolee/confirm-ownership?token=auth_alt_772183',
      },
    };

    return {
      message,
      state,
      browserSession,
    };
  }

  /**
   * Handle user action (clicking verification link or taking control of browser)
   */
  public static confirmVerification(siteId: string): {
    success: boolean;
    message: string;
    nextSite: string;
  } {
    return {
      success: true,
      message: `✅ **Verified!** ${siteId === 'alternativeto' ? 'AlternativeTo' : 'Crunchbase'} backlink confirmation completed. Tolee AI has recorded the submission. Next scheduled submission will run tomorrow at 11:15 AM.`,
      nextSite: siteId === 'alternativeto' ? 'crunchbase' : 'producthunt',
    };
  }
}
