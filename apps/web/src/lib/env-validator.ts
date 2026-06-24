/**
 * Production-Grade Environment Variable Validator
 *
 * Validates ALL required environment variables at server startup.
 * If any critical variable is missing in production, the server will
 * refuse to start with a clear error message — preventing silent security failures.
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  secret?: boolean; // If true, value is never logged
}

const ENV_VARS: EnvVar[] = [
  // Database
  { name: 'DATABASE_URL', required: true, description: 'NeonDB PostgreSQL connection string', secret: true },

  // NextAuth
  { name: 'NEXTAUTH_SECRET', required: true, description: 'NextAuth signing secret (min 32 chars)', secret: true },
  { name: 'NEXTAUTH_URL', required: true, description: 'Full public URL of the application' },

  // Super Admin
  { name: 'SUPER_ADMIN_JWT_SECRET', required: true, description: 'Super admin JWT signing secret', secret: true },
  { name: 'SUPER_ADMIN_EMAIL', required: true, description: 'Super admin login email', secret: true },

  // Google OAuth
  { name: 'GOOGLE_CLIENT_ID', required: true, description: 'Google OAuth Client ID' },
  { name: 'GOOGLE_CLIENT_SECRET', required: true, description: 'Google OAuth Client Secret', secret: true },
  { name: 'GOOGLE_PROJECT_NUMBER', required: true, description: 'Google/Firebase project number for token audience verification' },

  // Cloudinary
  { name: 'CLOUDINARY_CLOUD_NAME', required: true, description: 'Cloudinary cloud name' },
  { name: 'CLOUDINARY_API_KEY', required: true, description: 'Cloudinary API key' },
  { name: 'CLOUDINARY_API_SECRET', required: true, description: 'Cloudinary API secret', secret: true },

  // AI APIs
  { name: 'NVIDIA_API_KEY', required: true, description: 'NVIDIA NIM API key for AI generation', secret: true },
  { name: 'NVIDIA_PAGE_ELEMENTS_KEY', required: false, description: 'NVIDIA Page Elements API key', secret: true },
  { name: 'NVIDIA_RERANK_KEY', required: false, description: 'NVIDIA Rerank API key', secret: true },
  { name: 'NVIDIA_RERANK_VL_KEY', required: false, description: 'NVIDIA Rerank VL API key', secret: true },

  // Firebase (client-side — optional but warn if missing)
  { name: 'NEXT_PUBLIC_FIREBASE_API_KEY', required: false, description: 'Firebase client API key (public, by design)' },
  { name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', required: false, description: 'Firebase project ID (public, by design)' },

  // Mux Configuration (Client-side)
  { name: 'NEXT_PUBLIC_MUX_ENV_KEY', required: false, description: 'Mux Data Environment Key for analytics tracking' },

  // Optional — warn if missing
  { name: 'SMTP_HOST', required: false, description: 'SMTP server host for transactional emails' },
  { name: 'SMTP_USER', required: false, description: 'SMTP username' },
  { name: 'SMTP_PASS', required: false, description: 'SMTP password', secret: true },
  { name: 'MODELSLAB_API_KEY', required: false, description: 'ModelsLab API key for video generation', secret: true },
  { name: 'MONITORING_ALERTS_WEBHOOK', required: false, description: 'Slack/Teams webhook URL for error alerts' },
  { name: 'PIXABAY_API_KEY', required: false, description: 'Pixabay API key for dynamic simulated video posts', secret: true },
  { name: 'PEXELS_API_KEY', required: false, description: 'Pexels API key for dynamic simulated images & videos', secret: true },
];

export function validateEnvironment(): void {
  // Only run full validation in server contexts
  if (typeof window !== 'undefined') return;

  const isProduction = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value || value.trim() === '') {
      if (envVar.required) {
        missing.push(`  ❌ ${envVar.name} — ${envVar.description}`);
      } else {
        warnings.push(`  ⚠️  ${envVar.name} — ${envVar.description} (optional)`);
      }
    } else {
      // Extra validation for specific vars
      if (envVar.name === 'NEXTAUTH_SECRET' && value.length < 32) {
        missing.push(`  ❌ ${envVar.name} — Must be at least 32 characters long (currently ${value.length})`);
      }
    }
  }

  // Log warnings (non-blocking)
  if (warnings.length > 0) {
    console.warn(
      `\n[ENV] ⚠️  Optional environment variables not set:\n${warnings.join('\n')}\n`
    );
  }

  // Block startup if required vars are missing (strict in production)
  if (missing.length > 0) {
    const message = `\n${'='.repeat(60)}\n[ENV] 🚨 CRITICAL: Missing required environment variables:\n${missing.join('\n')}\n\nAdd these to your .env file. See .env.example for reference.\n${'='.repeat(60)}\n`;

    if (isProduction) {
      // Hard fail in production — do NOT start the server
      throw new Error(message);
    } else {
      // Soft warn in development to not break local setup
      console.error(message);
    }
  }

  if (missing.length === 0) {
    console.log(`[ENV] ✅ All required environment variables validated (${ENV_VARS.filter(e => e.required).length} checked).`);
  }
}

/**
 * Safe getter — throws at call site if env var is missing (for server-side use)
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `[Security] Required environment variable "${name}" is not set. ` +
      `Check your .env file and Vercel/deployment configuration.`
    );
  }
  return value;
}
