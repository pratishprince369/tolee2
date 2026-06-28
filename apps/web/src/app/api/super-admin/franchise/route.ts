import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Middleware/Check if user is a Super Admin
async function checkSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  return session.user.email === process.env.SUPER_ADMIN_EMAIL;
}

export async function GET(req: Request) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Fetch all franchises
    const franchises = await prisma.franchise.findMany({
      include: {
        user: {
          select: { name: true, email: true, username: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Fetch all withdrawal requests
    const withdrawals = await prisma.franchiseWithdrawal.findMany({
      include: {
        franchise: {
          select: { code: true, fullName: true, preferredLocation: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Fetch slabs
    const slabs = await prisma.franchiseSlab.findMany({
      orderBy: { minUsers: "asc" }
    });

    // Fetch audit logs
    const auditLogs = await prisma.franchiseAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });

    // Fetch all referrals
    const referrals = await prisma.referral.findMany({
      where: { franchiseId: { not: null } },
      include: {
        referee: {
          select: {
            name: true,
            email: true,
            username: true,
            email_verified: true,
            phoneVerified: true,
            isMobileVerified: true,
            lastActiveAt: true
          }
        },
        franchise: {
          select: {
            code: true,
            fullName: true,
            preferredLocation: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      success: true,
      franchises,
      withdrawals,
      slabs,
      auditLogs,
      referrals
    });
  } catch (error: any) {
    console.error("[Super Admin Franchise GET Error]:", error);
    return NextResponse.json({ message: error.message || "Failed to fetch data." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { action, ...payload } = await req.json();

    if (action === "updateFranchiseStatus") {
      const { id, status, preferredLocation } = payload;
      
      const franchise = await prisma.franchise.findUnique({
        where: { id }
      });

      if (!franchise) {
        return NextResponse.json({ message: "Franchise not found." }, { status: 404 });
      }

      const updated = await prisma.franchise.update({
        where: { id },
        data: {
          status,
          ...(preferredLocation ? { preferredLocation } : {})
        }
      });

      // Seeding slabs if empty and status is set to active
      if (status === "active") {
        const slabCount = await prisma.franchiseSlab.count();
        if (slabCount === 0) {
          await prisma.franchiseSlab.createMany({
            data: [
              { minUsers: 0, maxUsers: 19999, commission: 2.0 },
              { minUsers: 20000, maxUsers: 49999, commission: 2.5 },
              { minUsers: 50000, maxUsers: 99999, commission: 3.5 },
              { minUsers: 100000, maxUsers: 2147483647, commission: 5.0 }
            ]
          });
        }
      }

      await prisma.franchiseAuditLog.create({
        data: {
          franchiseId: id,
          action: "STATUS_CHANGE",
          details: `Franchise status updated to: ${status.toUpperCase()}. Location: ${preferredLocation || franchise.preferredLocation}`
        }
      });

      return NextResponse.json({ success: true, franchise: updated });
    }

    if (action === "handleWithdrawal") {
      const { id, approve, rejectionReason } = payload;

      const withdrawal = await prisma.franchiseWithdrawal.findUnique({
        where: { id },
        include: { franchise: true }
      });

      if (!withdrawal) {
        return NextResponse.json({ message: "Withdrawal request not found." }, { status: 404 });
      }

      if (withdrawal.status !== "pending") {
        return NextResponse.json({ message: "Request has already been processed." }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        if (approve) {
          // Approve: move from pending to paid
          const updatedFranchise = await tx.franchise.update({
            where: { id: withdrawal.franchiseId },
            data: {
              commissionPending: { decrement: withdrawal.amount },
              commissionPaid: { increment: withdrawal.amount }
            }
          });

          const updatedWithdrawal = await tx.franchiseWithdrawal.update({
            where: { id },
            data: { status: "approved" }
          });

          await tx.franchiseAuditLog.create({
            data: {
              franchiseId: withdrawal.franchiseId,
              action: "WITHDRAWAL_APPROVED",
              details: `Approved payout of ₹${withdrawal.amount.toFixed(2)} to franchise ${withdrawal.franchise.code}.`
            }
          });

          return { updatedFranchise, updatedWithdrawal };
        } else {
          // Reject: refund back to available walletBalance
          const updatedFranchise = await tx.franchise.update({
            where: { id: withdrawal.franchiseId },
            data: {
              commissionPending: { decrement: withdrawal.amount },
              walletBalance: { increment: withdrawal.amount }
            }
          });

          const updatedWithdrawal = await tx.franchiseWithdrawal.update({
            where: { id },
            data: {
              status: "rejected",
              rejectionReason: rejectionReason || "Details verification failed."
            }
          });

          // Create refund transaction
          await tx.franchiseTransaction.create({
            data: {
              franchiseId: withdrawal.franchiseId,
              amount: withdrawal.amount,
              type: "withdrawal_refund",
              description: `Refunded ₹${withdrawal.amount.toFixed(2)} due to payout rejection: ${rejectionReason || "Details verification failed."}`
            }
          });

          await tx.franchiseAuditLog.create({
            data: {
              franchiseId: withdrawal.franchiseId,
              action: "WITHDRAWAL_REJECTED",
              details: `Rejected payout request of ₹${withdrawal.amount.toFixed(2)} for: ${rejectionReason || "Verification failed."}`
            }
          });

          return { updatedFranchise, updatedWithdrawal };
        }
      });

      return NextResponse.json({ success: true, result });
    }

    if (action === "saveSlab") {
      const { id, minUsers, maxUsers, commission } = payload;

      if (id) {
        // Update existing slab
        const slab = await prisma.franchiseSlab.update({
          where: { id },
          data: {
            minUsers: Number(minUsers),
            maxUsers: Number(maxUsers),
            commission: Number(commission)
          }
        });
        return NextResponse.json({ success: true, slab });
      } else {
        // Create new slab
        const slab = await prisma.franchiseSlab.create({
          data: {
            minUsers: Number(minUsers),
            maxUsers: Number(maxUsers),
            commission: Number(commission)
          }
        });
        return NextResponse.json({ success: true, slab });
      }
    }

    if (action === "deleteSlab") {
      const { id } = payload;
      await prisma.franchiseSlab.delete({
        where: { id }
      });
      return NextResponse.json({ success: true, message: "Slab deleted." });
    }

    if (action === "overrideCommission") {
      const { franchiseId, overrideAmount, description } = payload;

      const franchise = await prisma.franchise.findUnique({
        where: { id: franchiseId }
      });

      if (!franchise) {
        return NextResponse.json({ message: "Franchise not found." }, { status: 404 });
      }

      const amount = Number(overrideAmount);

      const result = await prisma.$transaction(async (tx) => {
        const updatedFranchise = await tx.franchise.update({
          where: { id: franchiseId },
          data: {
            walletBalance: { increment: amount },
            commissionEarned: { increment: amount }
          }
        });

        await tx.franchiseTransaction.create({
          data: {
            franchiseId,
            amount,
            type: "admin_override",
            description: description || `Admin custom balance override adjustment: ₹${amount.toFixed(2)}`
          }
        });

        await tx.franchiseAuditLog.create({
          data: {
            franchiseId,
            action: "ADMIN_OVERRIDE",
            details: `Admin adjusted balance by ₹${amount.toFixed(2)}. Reason: ${description || "N/A"}`
          }
        });

        return updatedFranchise;
      });

      return NextResponse.json({ success: true, franchise: result });
    }

    return NextResponse.json({ message: "Unknown Action query." }, { status: 400 });
  } catch (error: any) {
    console.error("[Super Admin Franchise POST Error]:", error);
    return NextResponse.json({ message: error.message || "Failed to execute admin action." }, { status: 500 });
  }
}
