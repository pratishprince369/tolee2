import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Enterprise Security Headers
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob: https:; media-src 'self' https: blob:; connect-src 'self' https: wss: ws:; frame-ancestors 'none';",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(self)",
};

// Route prefixes requiring authentication
const authRoutes = [
  "/feed",
  "/chat",
  "/notifications",
  "/create-tolee",
  "/settings",
  "/ads-manager",
  "/ai-manager",
  "/my-tolees",
  "/creator-dashboard",
  "/marketplace/create",
  "/marketplace/edit",
];

// Routes that MUST NOT be indexed by search engines or AI bots
const noindexRoutes = [
  "/api",
  "/graphql",
  "/rest",
  "/rpc",
  "/server",
  "/backend",
  "/internal",
  "/functions",
  "/webhook",
  "/auth",
  "/socket",
  "/admin",
  "/super-admin",
  "/dashboard",
  "/settings",
  "/chat",
  "/messages",
  "/ads",
  "/ai-manager",
  "/notifications",
  "/my-tolees",
  "/creator-dashboard",
  "/create-tolee",
  "/marketplace/create",
  "/marketplace/edit",
  "/auth/forgot-password",
  "/forgot-password",
  "/auth/signin",
  "/auth/signup",
  "/auth/verify-email",
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  
  // Local development & Capacitor mobile app origins
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("https://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin === "capacitor://localhost" ||
    origin === "http://localhost"
  ) {
    return true;
  }

  // Tolee Production and Staging domains
  if (
    origin === "https://tolee.in" ||
    origin.endsWith(".tolee.in") ||
    origin.endsWith(".vercel.app")
  ) {
    return true;
  }

  return false;
}

// Wrap standard NextAuth withAuth middleware
const authMiddleware = withAuth(
  function middleware(req) {
    const response = NextResponse.next();
    // Inject all security headers
    Object.entries(securityHeaders).forEach(([key, val]) => {
      response.headers.set(key, val);
    });

    // Check if the current route should be blocked from indexing
    const { pathname } = req.nextUrl;
    const isNoindexRoute = noindexRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
    if (isNoindexRoute) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet, noimageindex");
    }

    return response;
  },
  {
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export default function middleware(req: NextRequest, event: any) {
  const { pathname } = req.nextUrl;

  // Handle preflight OPTIONS requests cleanly
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin") || "";
    const response = new NextResponse(null, { status: 204 });

    if (isAllowedOrigin(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    response.headers.set("Access-Control-Max-Age", "86400");
    return response;
  }

  // 1. If it's a private auth-required route, delegate to NextAuth withAuth
  const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
  if (isAuthRoute) {
    return (authMiddleware as any)(req, event);
  }

  // 2. For all other routes (APIs, public routes, landing), apply security headers, CORS & Robots tags
  const response = NextResponse.next();
  Object.entries(securityHeaders).forEach(([key, val]) => {
    response.headers.set(key, val);
  });

  const isNoindexRoute = noindexRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
  if (isNoindexRoute) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet, noimageindex");
  }

  const origin = req.headers.get("origin") || "";
  if (isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  return response;
}

export const config = {
  // Capture all routes including API routes to apply security headers and CORS
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static assets)
     * - _next/image (Next.js image optimization)
     * - favicon.ico (standard favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
