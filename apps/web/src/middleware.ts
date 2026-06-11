import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Enterprise Security Headers
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob: https:; media-src 'self' https: blob:; connect-src 'self' https: wss: ws:;",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=*, microphone=*, geolocation=*",
};

// Route prefixes requiring authentication
const authRoutes = [
  "/feed",
  "/reels",
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

// Wrap standard NextAuth withAuth middleware
const authMiddleware = withAuth(
  function middleware(req) {
    const response = NextResponse.next();
    // Inject all security headers
    Object.entries(securityHeaders).forEach(([key, val]) => {
      response.headers.set(key, val);
    });
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

  // 1. If it's a private auth-required route, delegate to NextAuth withAuth
  const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
  if (isAuthRoute) {
    return (authMiddleware as any)(req, event);
  }

  // 2. For all other routes (APIs, public routes, landing), apply security headers & CORS
  const response = NextResponse.next();
  Object.entries(securityHeaders).forEach(([key, val]) => {
    response.headers.set(key, val);
  });

  const origin = req.headers.get("origin") || "";
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.headers.set("Access-Control-Allow-Credentials", "true");

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
