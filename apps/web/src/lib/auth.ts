import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";


// Ensure prisma is defined before passing to adapter
const adapter = PrismaAdapter(prisma);

export const authOptions: NextAuthOptions = {
  adapter: adapter as any,
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin", // Redirect back to signin on error
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" },
        googleIdToken: { label: "Google ID Token", type: "text" }
      },
      async authorize(credentials, req) {
        // Handle native Google Sign-in if googleIdToken is provided
        if (credentials?.googleIdToken) {
          try {
            const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credentials.googleIdToken}`);
            if (!res.ok) {
              throw new Error("Failed to verify Google ID token with Google API");
            }
            const payload = await res.json();
            
            // Verify that the audience prefix matches our Firebase/Google project
            if (!payload.email || !payload.aud || !payload.aud.startsWith("968015582251")) {
              throw new Error("Invalid Google ID token payload structure or audience mismatch");
            }

            const email = payload.email;
            const name = payload.name || email.split("@")[0];
            const image = payload.picture || null;

            // Find or create user
            let user = await prisma.user.findUnique({
              where: { email }
            });

            if (!user) {
              // Create user if they don't exist
              user = await prisma.user.create({
                data: {
                  email,
                  name,
                  image,
                  emailVerified: new Date(),
                  email_verified: true,
                  email_verified_at: new Date(),
                }
              });

              // Create welcome onboarding notification
              await prisma.notification.create({
                data: {
                  userId: user.id,
                  type: 'welcome',
                  message: 'To start sharing posts, reels, news and videos, you must first join one or more Tolees (Groups). Join communities that match your interests and start sharing with people around you.',
                  link: '/discover'
                }
              });
            }

            if (user.isSuspended) {
              throw new Error("suspended");
            }

            if (user.isBanned) {
              throw new Error("banned");
            }

            // Update login activity details dynamically
            try {
              const userAgent = req?.headers?.["user-agent"] || "Android App - Native Google Sign-In";
              const forwardedFor = req?.headers?.["x-forwarded-for"];
              const ip = typeof forwardedFor === "string" ? forwardedFor.split(",")[0] : "127.0.0.1";

              await prisma.user.update({
                where: { id: user.id },
                data: {
                  lastLoginIp: ip,
                  lastLoginAt: new Date(),
                  lastLoginDevice: "Android App - Native Google Sign-In",
                }
              });
            } catch (e) {
              console.error("Failed to update last login activity in native google authorize:", e);
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image || user.avatar,
            };
          } catch (error: any) {
            console.error("Native Google verification error:", error);
            throw new Error(error.message || "Native Google authentication failed");
          }
        }

        // Standard Email/Password Sign-In
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Bot check on standard credentials sign-in
        const cleanEmail = credentials.email.toLowerCase().trim();
        const prefix = cleanEmail.split('@')[0] || '';
        const botKeywords = process.env.NODE_ENV === 'production'
          ? ['bot', 'temp', 'fake', 'spam', 'qa-', 'qa_', 'test-', 'test_']
          : ['bot', 'temp', 'fake', 'spam'];
        if (botKeywords.some(k => prefix.includes(k))) {
          throw new Error("bot_detected");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user || !user?.passwordHash) {
          throw new Error("Invalid credentials");
        }

        if (user.isSuspended) {
          throw new Error("suspended");
        }

        if (user.isBanned) {
          throw new Error("banned");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        if (!user.email_verified) {
          throw new Error("unverified_email");
        }

        // Update login activity details dynamically for Settings login activity panel
        try {
          const userAgent = req?.headers?.["user-agent"] || "Windows Desktop - Chrome Browser";
          const forwardedFor = req?.headers?.["x-forwarded-for"];
          const ip = typeof forwardedFor === "string" ? forwardedFor.split(",")[0] : "182.72.102.50";

          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginIp: ip,
              lastLoginAt: new Date(),
              lastLoginDevice: userAgent,
            }
          });
        } catch (e) {
          console.error("Failed to update last login activity in authorize:", e);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image || user.avatar,
        };
      }
    })
  ],
  events: {
    async createUser({ user }) {
      try {
        const welcomeNotif = await prisma.notification.findFirst({
          where: { userId: user.id, type: 'welcome' }
        });
        if (!welcomeNotif) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'welcome',
              message: 'To start sharing posts, reels, news and videos, you must first join one or more Tolees (Groups). Join communities that match your interests and start sharing with people around you.',
              link: '/discover'
            }
          });
        }
      } catch (err) {
        console.error("Error creating welcome notification in createUser event:", err);
      }
    }
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user?.id) return true;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isSuspended: true, isBanned: true }
      });
      if (dbUser?.isSuspended) {
        return "/auth/signin?error=suspended";
      }
      if (dbUser?.isBanned) {
        return "/auth/signin?error=banned";
      }

      // --- FRANCHISE REFERRAL TRACKING (SIGNUP/LOGIN) ---
      try {
        const cookieStore = cookies();
        const referralCode = cookieStore.get("tolee_referral_code")?.value;
        if (referralCode && referralCode.startsWith("FRN")) {
          const existingReferral = await prisma.referral.findUnique({
            where: { refereeId: user.id }
          });
          if (!existingReferral) {
            const franchise = await prisma.franchise.findUnique({
              where: { code: referralCode }
            });
            if (franchise && franchise.status === "active") {
              const headersList = headers();
              const userAgent = headersList.get("user-agent") || "";

              let device = "Desktop";
              if (/Mobi|Android|iPhone|iPad/i.test(userAgent)) device = "Mobile";
              else if (/Tablet|iPad/i.test(userAgent)) device = "Tablet";

              // Log referral conversion
              await prisma.referral.create({
                data: {
                  referrerId: franchise.userId,
                  refereeId: user.id,
                  franchiseId: franchise.id,
                  device,
                  source: "referral_link",
                  rewardAmount: 0,
                  status: "completed"
                }
              });

              // Clean up tracking cookie
              try {
                cookieStore.delete("tolee_referral_code");
              } catch (cookieErr) {
                // Ignore cookie delete errors in some environments
              }
            }
          }
        }
      } catch (refErr) {
        console.error("[NextAuth Franchise Referral Tracking Error]:", refErr);
      }

      // Record login activity for non-credential standard provider logins (e.g. Google OAuth)
      if (account?.provider !== 'credentials') {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              lastLoginIp: "OAuth Direct",
              lastLoginDevice: `${account?.provider ? account.provider.charAt(0).toUpperCase() + account.provider.slice(1) : 'Google'} OAuth Session`
            }
          });
        } catch (e) {
          console.error("Failed to update OAuth login activity:", e);
        }
      }

      // --- CONVERSION TRACKING (LOGIN) ---
      try {
        const cookieStore = cookies();
        const sessionId = cookieStore.get('tolee_session_id')?.value;
        if (sessionId) {
          // Link user to VisitorSession
          await prisma.visitorSession.update({
            where: { sessionId },
            data: { userId: user.id }
          });
          // Log login analytics event
          await prisma.analyticsEvent.create({
            data: {
              sessionId,
              eventType: 'login',
              path: '/auth/signin',
              details: JSON.stringify({ userId: user.id })
            }
          });
        }
      } catch (trackErr) {
        console.error("Failed to track login conversion:", trackErr);
      }
      // ------------------------------------

      return true;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).username = token.username as string | null;
        session.user.image = token.image as string;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.image = (user as any).image || (user as any).avatar;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true }
        });
        token.username = dbUser?.username || null;
      }
      if (trigger === "update") {
        if (session?.image) {
          token.image = session.image;
        }
        if (session?.username !== undefined) {
          token.username = session.username;
        }
      }
      return token;
    }
  }
};
