import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MIN_WITHDRAWAL_LIMIT = 1000.00; // Minimum limit is ₹1,000

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Find active franchise
    const franchise = await prisma.franchise.findUnique({
      where: { userId }
    });

    if (!franchise || franchise.status !== "active") {
      return NextResponse.json({ message: "Active franchise profile required to initiate payouts." }, { status: 400 });
    }

    const { amount, bankDetails } = await req.json();

    const requestAmount = Number(amount);
    if (isNaN(requestAmount) || requestAmount <= 0) {
      return NextResponse.json({ message: "Invalid withdrawal amount." }, { status: 400 });
    }

    if (requestAmount < MIN_WITHDRAWAL_LIMIT) {
      return NextResponse.json({ message: `Minimum withdrawal limit is ₹${MIN_WITHDRAWAL_LIMIT.toFixed(2)}.` }, { status: 400 });
    }

    if (requestAmount > franchise.walletBalance) {
      return NextResponse.json({ message: "Insufficient available wallet balance." }, { status: 400 });
    }

    if (!bankDetails || bankDetails.trim().length < 10) {
      return NextResponse.json({ message: "Please provide valid bank details or UPI ID." }, { status: 400 });
    }

    // Execute wallet balance updates transactionally
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct from available balance and move to pending payouts
      const updatedFranchise = await tx.franchise.update({
        where: { id: franchise.id },
        data: {
          walletBalance: { decrement: requestAmount },
          commissionPending: { increment: requestAmount }
        }
      });

      // 2. Create withdrawal request record
      const withdrawal = await tx.franchiseWithdrawal.create({
        data: {
          franchiseId: franchise.id,
          amount: requestAmount,
          bankDetails,
          status: "pending"
        }
      });

      // 3. Log franchise payout transaction
      await tx.franchiseTransaction.create({
        data: {
          franchiseId: franchise.id,
          amount: -requestAmount,
          type: "withdrawal",
          description: `Withdrawal request initiated for ₹${requestAmount.toFixed(2)}. Sent to pending admin queue.`
        }
      });

      // 4. Log audit log
      await tx.franchiseAuditLog.create({
        data: {
          franchiseId: franchise.id,
          action: "WITHDRAWAL_REQUEST",
          details: `Requested withdrawal of ₹${requestAmount.toFixed(2)} to: ${bankDetails}`
        }
      });

      return { updatedFranchise, withdrawal };
    });

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully and is pending review.",
      balance: result.updatedFranchise.walletBalance,
      withdrawal: result.withdrawal
    });
  } catch (error: any) {
    console.error("[Franchise Withdrawal Error]:", error);
    return NextResponse.json({ message: error.message || "Failed to submit withdrawal request." }, { status: 500 });
  }
}
