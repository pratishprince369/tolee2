/**
 * Automated Test Suite: Referral-Based 10% Ad Revenue Sharing System
 * Tests Phase 3, 5, 6, 7, 8, 11, 12, 13, 14
 */

import { prisma } from '../src/lib/prisma';
import { 
  getOrCreateUserReferralCode, 
  resolveReferralCode, 
  attributeReferralOnSignup, 
  processReferralAdSpendCommission, 
  reverseReferralAdSpendCommission, 
  getUserReferralDashboardData 
} from '../src/lib/referralService';

// Ensure .env is loaded in Node
try {
  // @ts-ignore
  if (typeof process.loadEnvFile === 'function') process.loadEnvFile('.env');
} catch (_) {}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TOLEE 10% AD REVENUE SHARING AUTOMATED TEST SUITE STARTING');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, detail ? detail : '');
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // Generate unique test identifiers
  const testRunId = `tst_${Date.now()}`;
  let ramUser: any = null;
  let shyamUser: any = null;
  let independentUser: any = null;

  try {
    // -----------------------------------------------------------------
    // SETUP: Create Test Fixtures
    // -----------------------------------------------------------------
    console.log('--- SETUP FIXTURES ---');
    ramUser = await prisma.user.create({
      data: {
        name: 'Ram Tester',
        email: `ram_${testRunId}@tolee-test.local`,
        username: `ram_${testRunId}`,
        email_verified: true,
      }
    });

    shyamUser = await prisma.user.create({
      data: {
        name: 'Shyam Tester',
        email: `shyam_${testRunId}@tolee-test.local`,
        username: `shyam_${testRunId}`,
        email_verified: true,
      }
    });

    independentUser = await prisma.user.create({
      data: {
        name: 'Independent User',
        email: `ind_${testRunId}@tolee-test.local`,
        username: `ind_${testRunId}`,
        email_verified: true,
      }
    });

    console.log(`Created Ram (ID: ${ramUser.id}) and Shyam (ID: ${shyamUser.id})\n`);

    // -----------------------------------------------------------------
    // TEST 1: Unique Referral Code Generation
    // -----------------------------------------------------------------
    console.log('--- TEST GROUP 1: REFERRAL CODES & LOOKUP ---');
    const ramCode = await getOrCreateUserReferralCode(ramUser.id);
    assert(Boolean(ramCode && ramCode.length >= 3), 'Ram receives a unique referral code');

    const resolvedUser = await resolveReferralCode(ramCode);
    assert(resolvedUser?.id === ramUser.id, 'Resolved referral code matches Ram user ID');

    const resolvedByUsername = await resolveReferralCode(ramUser.username);
    assert(resolvedByUsername?.id === ramUser.id, 'Resolved by username fallback matches Ram user ID');

    // -----------------------------------------------------------------
    // TEST 2: Self-Referral Prevention
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: ATTRIBUTION SECURITY & RULES ---');
    const selfRefResult = await attributeReferralOnSignup({
      refereeId: ramUser.id,
      referralCode: ramCode
    });
    assert(selfRefResult.success === false && selfRefResult.reason === 'self_referral_disallowed', 'Self-referral is strictly rejected');

    // -----------------------------------------------------------------
    // TEST 3: Invalid Referral Code Handling
    // -----------------------------------------------------------------
    const invalidRefResult = await attributeReferralOnSignup({
      refereeId: shyamUser.id,
      referralCode: 'NON_EXISTENT_CODE_9999'
    });
    assert(invalidRefResult.success === false && invalidRefResult.reason === 'referrer_not_found', 'Invalid referral code is safely handled without throwing');

    // -----------------------------------------------------------------
    // TEST 4: Valid Referral Attribution (Ram refers Shyam)
    // -----------------------------------------------------------------
    const attributionResult = await attributeReferralOnSignup({
      refereeId: shyamUser.id,
      referralCode: ramCode,
      userAgent: 'Mozilla/5.0 Test Suite'
    });
    assert(attributionResult.success === true && attributionResult.referrerId === ramUser.id, 'Shyam is correctly attributed to Ram as referrer');

    // Check DB record
    const dbRef = await prisma.referral.findUnique({
      where: { refereeId: shyamUser.id }
    });
    assert(dbRef?.referrerId === ramUser.id, 'Referral record persisted in DB with correct referrer ID');

    // -----------------------------------------------------------------
    // TEST 5: Overwrite Prevention (Cannot change referrer after attribution)
    // -----------------------------------------------------------------
    const overwriteResult = await attributeReferralOnSignup({
      refereeId: shyamUser.id,
      referralCode: 'SOME_OTHER_CODE'
    });
    assert(overwriteResult.success === false && overwriteResult.reason === 'already_attributed', 'Existing referral relationship cannot be overwritten');

    // -----------------------------------------------------------------
    // TEST 6: 10% Commission Calculation (₹1,00,000 Spend -> ₹10,000 Commission)
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: 10% COMMISSION CALCULATION & LEDGER ---');
    const tx1 = `BILLING_TX_100K_${testRunId}`;
    const comm1 = await processReferralAdSpendCommission({
      advertiserUserId: shyamUser.id,
      eligibleSpendAmount: 100000.0,
      billingTransactionId: tx1
    });

    assert(comm1.success === true, 'Commission processed successfully for ₹1,00,000 spend');
    assert(comm1.commissionAmount === 10000.0, '₹1,00,000 eligible spend yields exactly ₹10,000 commission (10%)', comm1);
    assert(comm1.referrerId === ramUser.id, 'Commission is credited to the correct referrer (Ram)');

    // Verify Ram wallet was incremented
    const ramWallet = await prisma.wallet.findUnique({ where: { userId: ramUser.id } });
    assert(Boolean(ramWallet && ramWallet.balance >= 10000.0), 'Ram wallet balance reflects the ₹10,000 credited commission');

    // Verify Ledger entry
    const ledgerEntry1 = await prisma.referralCommission.findUnique({ where: { billingTransactionId: tx1 } });
    assert(ledgerEntry1?.status === 'CONFIRMED' && ledgerEntry1.commissionAmount === 10000.0, 'Auditable ledger record created with CONFIRMED status');

    // -----------------------------------------------------------------
    // TEST 7: Different Spend Amounts (₹50,000 -> ₹5,000; ₹25,000 -> ₹2,500)
    // -----------------------------------------------------------------
    const comm50k = await processReferralAdSpendCommission({
      advertiserUserId: shyamUser.id,
      eligibleSpendAmount: 50000.0,
      billingTransactionId: `BILLING_TX_50K_${testRunId}`
    });
    assert(comm50k.commissionAmount === 5000.0, '₹50,000 eligible spend yields ₹5,000 commission');

    const comm25k = await processReferralAdSpendCommission({
      advertiserUserId: shyamUser.id,
      eligibleSpendAmount: 25000.0,
      billingTransactionId: `BILLING_TX_25K_${testRunId}`
    });
    assert(comm25k.commissionAmount === 2500.0, '₹25,000 eligible spend yields ₹2,500 commission');

    const comm0 = await processReferralAdSpendCommission({
      advertiserUserId: shyamUser.id,
      eligibleSpendAmount: 0,
      billingTransactionId: `BILLING_TX_0_${testRunId}`
    });
    assert(comm0.commissionAmount === 0, '₹0 eligible spend yields ₹0 commission');

    // -----------------------------------------------------------------
    // TEST 8: Independent User Without Referrer Generates ₹0 Commission
    // -----------------------------------------------------------------
    const commInd = await processReferralAdSpendCommission({
      advertiserUserId: independentUser.id,
      eligibleSpendAmount: 100000.0,
      billingTransactionId: `BILLING_TX_IND_${testRunId}`
    });
    assert(commInd.commissionAmount === 0 && commInd.status === 'no_referrer', 'User without referrer generates ₹0 commission');

    // -----------------------------------------------------------------
    // TEST 9: Strict Idempotency (Duplicate Webhook / Replayed Billing Event)
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: IDEMPOTENCY & REVERSALS ---');
    const commReplay = await processReferralAdSpendCommission({
      advertiserUserId: shyamUser.id,
      eligibleSpendAmount: 100000.0,
      billingTransactionId: tx1 // Replaying tx1
    });
    assert(commReplay.status === 'ignored_duplicate', 'Replayed billing event is detected as duplicate and ignored');

    // Verify Ram wallet was NOT credited twice
    const ramWalletAfterReplay = await prisma.wallet.findUnique({ where: { userId: ramUser.id } });
    assert(ramWalletAfterReplay?.balance === ramWallet?.balance! + 7500.0, 'Ram wallet was not credited twice on replayed event');

    // -----------------------------------------------------------------
    // TEST 10: Refund / Reversal
    // -----------------------------------------------------------------
    const revResult = await reverseReferralAdSpendCommission({
      billingTransactionId: tx1,
      reason: 'Ad campaign cancelled and refunded'
    });
    assert(revResult.success === true && revResult.status === 'reversed', 'Commission reversed successfully');

    const reversedLedger = await prisma.referralCommission.findUnique({ where: { billingTransactionId: tx1 } });
    assert(reversedLedger?.status === 'REVERSED' && Boolean(reversedLedger.reversalReference), 'Ledger status updated to REVERSED with reversal reference');

    // -----------------------------------------------------------------
    // TEST 11: Dashboard Data Accuracy
    // -----------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: DASHBOARD AGGREGATION ---');
    const dashboardData = await getUserReferralDashboardData(ramUser.id);
    assert(dashboardData.metrics.totalReferredUsers === 1, 'Dashboard shows 1 total referred user');
    assert(dashboardData.metrics.activeReferredAdvertisers === 1, 'Dashboard shows 1 active advertiser');
    assert(dashboardData.metrics.reversedEarnings === 10000.0, 'Dashboard accurately accounts for ₹10,000 in reversed earnings');
    assert(dashboardData.metrics.confirmedEarnings === 7500.0, 'Dashboard accurately reflects remaining ₹7,500 (5,000 + 2,500) confirmed earnings');
    assert(dashboardData.commissions.length === 3, 'Dashboard shows complete transaction history of 3 commissions');

    console.log('\n================================================================');
    console.log(`🎉 ALL TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('================================================================');

  } finally {
    // -----------------------------------------------------------------
    // CLEANUP FIXTURES
    // -----------------------------------------------------------------
    console.log('\n--- CLEANING UP TEST FIXTURES ---');
    try {
      if (ramUser) {
        await prisma.referralCommission.deleteMany({ where: { referrerId: ramUser.id } });
        await prisma.referral.deleteMany({ where: { referrerId: ramUser.id } });
        await prisma.walletTransaction.deleteMany({ where: { wallet: { userId: ramUser.id } } });
        await prisma.wallet.deleteMany({ where: { userId: ramUser.id } });
        await prisma.notification.deleteMany({ where: { userId: ramUser.id } });
        await prisma.user.delete({ where: { id: ramUser.id } });
      }
      if (shyamUser) {
        await prisma.referral.deleteMany({ where: { refereeId: shyamUser.id } });
        await prisma.walletTransaction.deleteMany({ where: { wallet: { userId: shyamUser.id } } });
        await prisma.wallet.deleteMany({ where: { userId: shyamUser.id } });
        await prisma.notification.deleteMany({ where: { userId: shyamUser.id } });
        await prisma.user.delete({ where: { id: shyamUser.id } });
      }
      if (independentUser) {
        await prisma.user.delete({ where: { id: independentUser.id } });
      }
      console.log('Test fixtures cleaned up successfully.');
    } catch (cleanupErr) {
      console.warn('Notice during fixture cleanup:', cleanupErr);
    }
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
