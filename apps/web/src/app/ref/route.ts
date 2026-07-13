import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=in.tolee.app&pcampaignid=web_share";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code") || searchParams.get("ref");
    const source = searchParams.get("source") || "web";

    if (!code) {
      return NextResponse.redirect(PLAY_STORE_URL);
    }

    // 1. Resolve referrer user to check if it's a valid user referral
    const referrer = await prisma.user.findFirst({
      where: {
        OR: [
          { id: code },
          { username: code }
        ]
      }
    });

    const userAgent = req.headers.get("user-agent") || "";
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "";

    if (referrer) {
      // Log click event for standard user referral
      await prisma.auditLog.create({
        data: {
          action: "referral_click",
          target: referrer.id,
          targetType: "user",
          ipAddress,
          details: JSON.stringify({ userAgent, source })
        }
      });
    }

    // 2. Check if Franchise where code matches (backward compatibility)
    const franchise = await prisma.franchise.findUnique({
      where: { code }
    });

    if (franchise) {
      let device = "Desktop";
      if (/Mobi|Android|iPhone|iPad/i.test(userAgent)) {
        device = "Mobile";
      } else if (/Tablet|iPad/i.test(userAgent)) {
        device = "Tablet";
      }

      await prisma.franchiseClick.create({
        data: {
          franchiseId: franchise.id,
          source,
          device,
          ipAddress
        }
      });
    }

    // 2. Redirect visitor directly to Google Play Store
    const response = NextResponse.redirect(PLAY_STORE_URL);

    // 3. Store referral code in secure cookie for 30 days
    response.cookies.set("tolee_referral_code", code, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    return response;
  } catch (error) {
    console.error("[Referral Query Redirect Error]:", error);
    return NextResponse.redirect(PLAY_STORE_URL);
  }
}
