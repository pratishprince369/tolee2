import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=in.tolee.app&pcampaignid=web_share";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const searchParams = req.nextUrl.searchParams;
    const source = searchParams.get("source") || "web";

    // 1. Resolve referrer user to check if it's a valid user referral
    const referrer = await prisma.user.findFirst({
      where: {
        OR: [
          { referralCode: code },
          { id: code },
          { username: { equals: code, mode: 'insensitive' } }
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
          details: JSON.stringify({ userAgent, source, code })
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

    // 3. Smart Redirect:
    // If mobile download explicitly requested, open Play Store; otherwise redirect to web signup with ref
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(userAgent);
    const targetUrl = (isMobile && searchParams.get("target") === "app")
      ? PLAY_STORE_URL
      : new URL(`/signup?ref=${encodeURIComponent(code)}`, req.url).toString();

    const response = NextResponse.redirect(targetUrl);

    // 4. Store referral code in secure cookie for 30 days
    response.cookies.set("tolee_referral_code", code, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
      httpOnly: false, // allow client hydration
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    return response;
  } catch (error) {
    console.error("[Referral Redirect Error]:", error);
    return NextResponse.redirect(PLAY_STORE_URL);
  }
}
