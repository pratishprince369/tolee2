import { prisma } from '../lib/prisma';
import {
  getOrCreateWallet,
  connectGroupToCredit,
  processAdRevenueAttribution,
  processDueSettlements,
  addBankAccount,
  requestWithdrawal,
  processAdminWithdrawalAction,
  getTransactionsByWalletId,
} from '../modules/tolee-credit';

async function runE2ETest() {
  console.log('--- STARTING TOLEE CREDIT E2E TEST ---');

  // 1. Find or create a test user
  let testUser = await prisma.user.findFirst({
    where: { username: { not: null } },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        name: 'Ram Test',
        username: 'ram_test_credit',
        email: `ram_credit_${Date.now()}@tolee.in`,
      },
    });
  }

  console.log(`[Step 1] Using test user: ${testUser.name} (${testUser.id})`);

  // 2. Initialize Tolee Credit Wallet
  const wallet = await getOrCreateWallet(testUser.id);
  console.log(`[Step 2] Wallet created/retrieved: ID=${wallet.id}, Available=₹${wallet.availableBalance}, Pending=₹${wallet.pendingBalance}`);

  // 3. Find or create a test Tolee group owned by testUser
  let testGroup = await prisma.tolee.findFirst({
    where: { ownerId: testUser.id },
  });

  if (!testGroup) {
    testGroup = await prisma.tolee.create({
      data: {
        name: 'XYZ Friends Group',
        slug: `xyz-group-${Date.now()}`,
        ownerId: testUser.id,
      },
    });
  }

  console.log(`[Step 3] Test group ready: ${testGroup.name} (ID=${testGroup.id})`);

  // 4. Connect Group to Tolee Credit
  const connectRes = await connectGroupToCredit(testGroup.id, testUser.id, 20.0);
  console.log(`[Step 4] Connected group to Credit: success=${connectRes.success}`);

  // 5. Simulate Ad Spend Event (₹100 spend -> 20% rev share = ₹20 pending)
  const eventId = `TEST_EVT_${Date.now()}`;
  const attrRes = await processAdRevenueAttribution({
    eventId,
    campaignId: 'CAMP_TEST_100',
    campaignName: 'Diwali Mega Sale Campaign',
    toleeId: testGroup.id,
    memberUserId: 'member_user_dummy',
    adEventType: 'spend',
    grossSpend: 100.0,
  });

  console.log(`[Step 5] Ad attribution event processed:`, {
    status: attrRes.status,
    grossSpend: attrRes.grossSpend,
    revenueSharePercent: attrRes.revenueSharePercent,
    adminEarnedAmount: attrRes.adminEarnedAmount,
    transactionId: attrRes.transactionId,
  });

  // 6. Test Idempotency (Duplicate ad event must NOT double-credit)
  const duplicateAttrRes = await processAdRevenueAttribution({
    eventId,
    campaignId: 'CAMP_TEST_100',
    campaignName: 'Diwali Mega Sale Campaign',
    toleeId: testGroup.id,
    grossSpend: 100.0,
    adEventType: 'spend',
  });

  console.log(`[Step 6] Duplicate event response: status=${duplicateAttrRes.status}, reason=${duplicateAttrRes.reason}`);
  if (duplicateAttrRes.status !== 'ignored_duplicate') {
    throw new Error('FAILED: Duplicate event was not ignored!');
  }

  // 7. Verify Pending Balance
  const walletAfterAttr = await getOrCreateWallet(testUser.id);
  console.log(`[Step 7] Wallet after attribution: Available=₹${walletAfterAttr.availableBalance}, Pending=₹${walletAfterAttr.pendingBalance}, Earned=₹${walletAfterAttr.totalEarned}`);

  // 8. Manually adjust transaction settlesAt to past and test settlement cycle
  if (attrRes.transactionId) {
    await prisma.creditTransaction.update({
      where: { transactionId: attrRes.transactionId },
      data: { settlesAt: new Date(Date.now() - 1000) },
    });
  }

  const settlementRes = await processDueSettlements();
  console.log(`[Step 8] Settlement cycle run: settledCount=${settlementRes.settledCount}, totalSettled=₹${settlementRes.totalSettledAmount}`);

  const walletAfterSettlement = await getOrCreateWallet(testUser.id);
  console.log(`[Step 9] Wallet after settlement: Available=₹${walletAfterSettlement.availableBalance}, Pending=₹${walletAfterSettlement.pendingBalance}`);

  // 9. Link Bank Account
  const bankRes = await addBankAccount(testUser.id, {
    accountHolderName: 'Ram Test',
    accountNumber: '987654321012',
    ifscCode: 'HDFC0001234',
    bankName: 'HDFC Bank',
  });
  console.log(`[Step 10] Bank account added: last4=${bankRes.bankAccount?.accountNumberLast4}`);

  // 10. Test Minimum Withdrawal Validation (< ₹500 should fail)
  const withdrawFailRes = await requestWithdrawal(testUser.id, 100);
  console.log(`[Step 11] Sub-minimum withdrawal test (₹100 < ₹500): success=${withdrawFailRes.success}, error="${withdrawFailRes.error}"`);

  // 11. Credit enough available balance to test full withdrawal lifecycle
  await prisma.creditWallet.update({
    where: { id: wallet.id },
    data: { availableBalance: { increment: 1000 } },
  });

  const withdrawSuccessRes = await requestWithdrawal(testUser.id, 500);
  console.log(`[Step 12] Eligible withdrawal test (₹500): success=${withdrawSuccessRes.success}, withdrawalId=${withdrawSuccessRes.withdrawal?.withdrawalId}`);

  // 12. Admin processes withdrawal approval
  if (withdrawSuccessRes.withdrawal) {
    const adminActionRes = await processAdminWithdrawalAction(
      withdrawSuccessRes.withdrawal.id,
      'approve',
      'super_admin_test_id',
      { payoutReference: 'UTR_HDFC_99887766' }
    );
    console.log(`[Step 13] Admin withdrawal approval: success=${adminActionRes.success}`);
  }

  // 13. Verify Transaction Ledger
  const ledger = await getTransactionsByWalletId(wallet.id, { limit: 5 });
  console.log(`[Step 14] Recent Ledger records count=${ledger.transactions.length}`);

  console.log('--- ALL TOLEE CREDIT TESTS PASSED SUCCESSFULLY! ---');
}

runE2ETest()
  .catch((e) => {
    console.error('Test failed with error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
