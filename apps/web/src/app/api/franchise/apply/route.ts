import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Check if user already has a franchise request
    const existing = await prisma.franchise.findUnique({
      where: { userId }
    });

    if (existing) {
      return NextResponse.json({ 
        message: `You already have a franchise registration. Current status: ${existing.status.toUpperCase()}`,
        franchise: existing
      }, { status: 400 });
    }

    const {
      fullName,
      businessName,
      mobile,
      email,
      aadhaarPan,
      address,
      state,
      city,
      area,
      pincode,
      preferredLocation,
      paymentDetails
    } = await req.json();

    if (!fullName || !mobile || !email || !address || !state || !city || !area || !pincode || !preferredLocation) {
      return NextResponse.json({ message: "Required fields are missing." }, { status: 400 });
    }

    // Generate unique code (FRN + 5 random digits)
    let code = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 20) {
      attempts++;
      const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
      const testCode = `FRN${randomDigits}`;
      const duplicate = await prisma.franchise.findUnique({
        where: { code: testCode }
      });
      if (!duplicate) {
        code = testCode;
        isUnique = true;
      }
    }

    if (!code) {
      return NextResponse.json({ message: "Failed to generate a unique franchise code. Try again." }, { status: 500 });
    }

    // Create franchise application record (defaulting status to pending)
    const franchise = await prisma.franchise.create({
      data: {
        userId,
        code,
        fullName,
        businessName: businessName || null,
        mobile,
        email: email.toLowerCase().trim(),
        aadhaarPan: aadhaarPan || null,
        address,
        state,
        city,
        area,
        pincode,
        preferredLocation,
        paymentDetails: paymentDetails || null,
        status: "pending"
      }
    });

    // Create audit log
    await prisma.franchiseAuditLog.create({
      data: {
        franchiseId: franchise.id,
        action: "APPLIED",
        details: `User submitted franchise application for preferred location: ${preferredLocation}. Assigned code: ${code}.`
      }
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully and is pending admin approval.",
      franchise
    });
  } catch (error: any) {
    console.error("[Franchise Apply API Error]:", error);
    return NextResponse.json({ message: error.message || "Failed to submit application." }, { status: 500 });
  }
}
