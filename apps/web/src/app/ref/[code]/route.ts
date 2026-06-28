import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const searchParams = req.nextUrl.searchParams;
    const source = searchParams.get("source") || "web";

    // 1. Find Franchise where code matches
    const franchise = await prisma.franchise.findUnique({
      where: { code }
    });

    if (franchise) {
      // 2. Extract metadata
      const userAgent = req.headers.get("user-agent") || "";
      const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "";

      let device = "Desktop";
      if (/Mobi|Android|iPhone|iPad/i.test(userAgent)) {
        device = "Mobile";
      } else if (/Tablet|iPad/i.test(userAgent)) {
        device = "Tablet";
      }

      // 3. Log click event
      await prisma.franchiseClick.create({
        data: {
          franchiseId: franchise.id,
          source,
          device,
          ipAddress
        }
      });
    }

    // 4. Redirect to signup page with the referral code
    const redirectUrl = new URL("/auth/signup", req.nextUrl.origin);
    redirectUrl.searchParams.set("ref", code);

    const response = NextResponse.redirect(redirectUrl);

    // 5. Store code in secure cookie for 30 days
    response.cookies.set("tolee_referral_code", code, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    return response;
  } catch (error) {
    console.error("[Referral Redirect Error]:", error);
    // Graceful fallback to signup
    return NextResponse.redirect(new URL("/auth/signup", req.nextUrl.origin));
  }
}
