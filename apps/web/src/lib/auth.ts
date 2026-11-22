import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { autoJoinDefaultTolees } from "./autoJoinTolees";
import { attributeReferralOnSignup } from "./referralService";


// Base adapter with bulletproof overrides for OAuth user creation & account linking
const baseAdapter = PrismaAdapter(prisma);
const customAdapter = {
  ...baseAdapter,
  async createUser(data: any) {
    try {
      const email = data.email?.toLowerCase().trim();
      const safeName = (data.name && String(data.name).trim())
        ? String(data.name).trim()
        : (email ? email.split('@')[0] : 'Tolee User');

      // Generate a collision-free username
      let baseUsername = (email ? email.split('@')[0] : safeName)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      if (!baseUsername || baseUsername.length < 3) {
        baseUsername = 'user_' + Math.random().toString(36).slice(-6);
      }
      let candidate = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username: candidate } })) {
        candidate = `${baseUsername}${counter++}`;
      }

      const createdUser = await prisma.user.create({
        data: {
          email,
          name: safeName,
          username: candidate,
          image: data.image || null,
          email_verified: true,
          emailVerified: data.emailVerified || new Date(),
          email_verified_at: new Date(),
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
          lastLoginIp: "OAuth Direct",
          lastLoginDevice: "Google OAuth",
        }
      });

      try {
        await autoJoinDefaultTolees(createdUser.id, 5);
      } catch (joinErr) {
        console.error("[Auth] Auto-join default tolees failed:", joinErr);
      }

      try {
        await prisma.notification.create({
          data: {
            userId: createdUser.id,
            type: 'welcome',
            message: 'Welcome to Tolee! We have automatically joined you to 5 top communities so you can immediately create and share posts, reels, and updates.',
            link: '/feed'
          }
        });
      } catch (notifErr) {
        console.error("[Auth] Welcome notification failed:", notifErr);
      }

      return createdUser;
    } catch (err) {
      console.error("[Auth Adapter] Error in createUser, attempting fallback:", err);
      return await prisma.user.create({
        data: {
          email: data.email,
          name: data.name || (data.email ? data.email.split('@')[0] : 'Tolee User'),
          image: data.image || null,
          email_verified: true,
          emailVerified: new Date(),
        }
      });
    }
  },
  async linkAccount(data: any) {
    try {
      const accountData: any = {
        userId: data.userId,
        type: data.type,
        provider: data.provider,
        providerAccountId: String(data.providerAccountId),
      };

      if (data.refresh_token !== undefined) accountData.refresh_token = data.refresh_token;
      if (data.access_token !== undefined) accountData.access_token = data.access_token;
      if (data.expires_at !== undefined && data.expires_at !== null) {
        accountData.expires_at = typeof data.expires_at === 'number' ? data.expires_at : parseInt(String(data.expires_at), 10);
      } else if (data.expires_in !== undefined && data.expires_in !== null) {
        accountData.expires_at = Math.floor(Date.now() / 1000) + parseInt(String(data.expires_in), 10);
      }
      if (data.token_type !== undefined) accountData.token_type = data.token_type;
      if (data.scope !== undefined) accountData.scope = data.scope;
      if (data.id_token !== undefined) accountData.id_token = data.id_token;
      if (data.session_state !== undefined) accountData.session_state = data.session_state;

      return await prisma.account.create({
        data: accountData
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const existing = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: data.provider,
              providerAccountId: String(data.providerAccountId),
            }
          }
        });
        if (existing) return existing;
      }
      console.error("[Auth Adapter] Error in linkAccount:", err);
      throw err;
    }
  },
  async getUserByAccount(provider_providerAccountId: { provider: string; providerAccountId: string }) {
    try {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: provider_providerAccountId.provider,
            providerAccountId: String(provider_providerAccountId.providerAccountId),
          }
        },
        include: { user: true },
      });
      return account?.user ?? null;
    } catch (err) {
      console.error("[Auth Adapter] Error in getUserByAccount:", err);
      return null;
    }
  },
  async getUserByEmail(email: string) {
    if (!email) return null;
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });
    } catch (err) {
      console.error("[Auth Adapter] Error in getUserByEmail:", err);
      return null;
    }
  }
};

export const authOptions: NextAuthOptions = {
  adapter: customAdapter as any,
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
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
      profile(profile) {
        const email = profile.email?.toLowerCase().trim();
        const safeName = profile.name || profile.given_name || (email ? email.split("@")[0] : "Tolee User");
        return {
          id: profile.sub,
          name: safeName,
          email: email,
          image: profile.picture || null,
        };
      },
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
            if (!payload.email || !payload.aud || (!payload.aud.startsWith("968015582251") && !payload.aud.startsWith("146580226228"))) {
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
              // Generate collision-free username for new user
              let baseUsername = (email ? email.split('@')[0] : (name || 'user')).toLowerCase().replace(/[^a-z0-9_]/g, '');
              if (baseUsername.length < 3) baseUsername = 'user_' + Math.random().toString(36).slice(-6);
              let candidate = baseUsername;
              let counter = 1;
              while (await prisma.user.findUnique({ where: { username: candidate } })) {
                candidate = `${baseUsername}${counter++}`;
              }

              // Create user if they don't exist
              user = await prisma.user.create({
                data: {
                  email,
                  name,
                  username: candidate,
                  image,
                  emailVerified: new Date(),
                  email_verified: true,
                  email_verified_at: new Date(),
                }
              });

              // Automatically join new user to 5 default top groups so they can post immediately
              try {
                await autoJoinDefaultTolees(user.id, 5);
              } catch (joinErr) {
                console.error("[Auth] Auto-join default tolees failed:", joinErr);
              }

              // Create welcome onboarding notification
              await prisma.notification.create({
                data: {
                  userId: user.id,
                  type: 'welcome',
                  message: 'Welcome to Tolee! We have automatically joined you to 5 top communities so you can immediately create and share posts, reels, and updates.',
                  link: '/feed'
                }
              });

              // Unwanted promotional notification disabled per Phase 2 cleanup
              // Only "Get 10% Sharing" referral promotional notification is retained
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
                  lastActiveAt: new Date(),
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
            email: cleanEmail
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
              lastActiveAt: new Date(),
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
        // Guarantee lastLoginAt and lastActiveAt on user creation
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            lastActiveAt: new Date()
          }
        }).catch(() => {});

        // Ensure new OAuth users always get a clean, collision-free username
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true, email: true, name: true }
        });

        if (existingUser && !existingUser.username) {
          let base = '';
          if (existingUser.email) {
            base = existingUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
          }
          if (!base && existingUser.name) {
            base = existingUser.name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          }
          if (!base || base.length < 3) {
            base = 'user_' + user.id.slice(-6).toLowerCase();
          }

          let candidate = base;
          let counter = 1;
          let taken = true;
          while (taken) {
            const check = await prisma.user.findUnique({ where: { username: candidate } });
            if (!check) {
              taken = false;
            } else {
              candidate = base + counter;
              counter++;
            }
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { username: candidate }
          }).catch(() => {});
        }

        await autoJoinDefaultTolees(user.id, 5);

        const welcomeNotif = await prisma.notification.findFirst({
          where: { userId: user.id, type: 'welcome' }
        });
        if (!welcomeNotif) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'welcome',
              message: 'Welcome to Tolee! We have automatically joined you to 5 top communities so you can immediately create and share posts, reels, and updates.',
              link: '/feed'
            }
          });
        }
      } catch (err) {
        console.error("Error auto-joining and creating welcome notification in createUser event:", err);
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

      // --- REFERRAL ATTRIBUTION TRACKING (SIGNUP/LOGIN) ---
      try {
        const cookieStore = cookies();
        const referralCode = cookieStore.get("tolee_referral_code")?.value;
        if (referralCode) {
          const headersList = headers();
          const userAgent = headersList.get("user-agent") || "";
          const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || "";
          await attributeReferralOnSignup({
            refereeId: user.id,
            referralCode,
            userAgent,
            ipAddress
          });
          try {
            cookieStore.delete("tolee_referral_code");
          } catch (_) {}
        }
      } catch (refErr) {
        console.error("[NextAuth Referral Tracking Notice]:", refErr);
      }

      // Record login activity for non-credential standard provider logins (e.g. Google OAuth)
      if (account?.provider !== 'credentials') {
        try {
          const userIdentifier = user?.id ? { id: user.id } : (user?.email ? { email: user.email } : null);
          if (userIdentifier) {
            await prisma.user.updateMany({
              where: userIdentifier,
              data: {
                lastLoginAt: new Date(),
                lastActiveAt: new Date(),
                lastLoginIp: "OAuth Direct",
                lastLoginDevice: `${account?.provider ? account.provider.charAt(0).toUpperCase() + account.provider.slice(1) : 'Google'} OAuth Session`,
                email_verified: true,
                emailVerified: new Date()
              }
            });
          }
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
          }).catch(() => {});
          // Log login analytics event
          await prisma.analyticsEvent.create({
            data: {
              sessionId,
              eventType: 'login',
              path: '/auth/signin',
              details: JSON.stringify({ userId: user.id })
            }
          }).catch(() => {});
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
        (session.user as any).ageVerified = (token.ageVerified as boolean) ?? false;
        session.user.image = token.image as string;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.image = (user as any).image || (user as any).avatar;
        
        // Safely fetch dbUser with fallback so field schema changes never crash auth
        let dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true, ageVerified: true }
        }).catch(async () => {
          return await prisma.user.findUnique({
            where: { id: user.id },
            select: { username: true }
          }).catch(() => null);
        });

        let assignedUsername = dbUser?.username || null;

        // If new OAuth user doesn't have a username yet, generate one immediately
        if (!assignedUsername && user.id) {
          try {
            let base = '';
            if (user.email) {
              base = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
            }
            if (!base && (user as any).name) {
              base = (user as any).name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            }
            if (!base || base.length < 3) {
              base = 'user_' + user.id.slice(-6).toLowerCase();
            }

            let candidate = base;
            let counter = 1;
            let taken = true;
            while (taken) {
              const check = await prisma.user.findUnique({ where: { username: candidate } });
              if (!check) {
                taken = false;
              } else {
                candidate = `${base}${counter++}`;
              }
            }

            await prisma.user.update({
              where: { id: user.id },
              data: {
                username: candidate,
                email_verified: true,
                emailVerified: new Date()
              }
            }).catch(() => {});

            assignedUsername = candidate;
          } catch (unameErr) {
            console.error("Failed to auto-assign username on OAuth JWT:", unameErr);
          }
        }

        token.username = assignedUsername;
        token.ageVerified = (dbUser as any)?.ageVerified ?? false;
      }
      if (trigger === "update") {
        if (session?.image) {
          token.image = session.image;
        }
        if (session?.username !== undefined) {
          token.username = session.username;
        }
        if (session?.ageVerified !== undefined) {
          token.ageVerified = session.ageVerified;
        }
      }

      // Keep active authenticated users' login and activity timestamp updated (throttled every 15 min)
      const now = Date.now();
      const lastPing = (token.lastActivePing as number) || 0;
      if (token.id && now - lastPing > 15 * 60 * 1000) {
        token.lastActivePing = now;
        prisma.user.update({
          where: { id: token.id as string },
          data: {
            lastActiveAt: new Date(),
            lastLoginAt: new Date()
          }
        }).catch(() => {});
      }

      return token;
    }
  }
};
