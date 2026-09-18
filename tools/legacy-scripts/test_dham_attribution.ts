import { prisma } from '../lib/prisma';
import { getOrCreateWallet, processAdRevenueAttribution } from '../modules/tolee-credit';

async function runDhamScenarioTest() {
  console.log('--- STARTING RAM, SHYAM & DHAM ATTRIBUTION TEST ---');

  const timestamp = Date.now();

  // 1. Create Ram (Group 1 Admin)
  const ramUser = await prisma.user.create({
    data: {
      name: `Ram Admin ${timestamp}`,
      username: `ram_${timestamp}`,
      email: `ram_${timestamp}@tolee.in`,
    },
  });

  const ramGroup = await prisma.tolee.create({
    data: {
      name: `Ram Super Community ${timestamp}`,
      slug: `ram-group-${timestamp}`,
      ownerId: ramUser.id,
    },
  });

  const ramWallet = await getOrCreateWallet(ramUser.id);
  console.log(`[1] Ram created group: ${ramGroup.name} (Wallet: ${ramWallet.id})`);

  // 2. Create Shyam (Group 2 Admin)
  const shyamUser = await prisma.user.create({
    data: {
      name: `Shyam Admin ${timestamp}`,
      username: `shyam_${timestamp}`,
      email: `shyam_${timestamp}@tolee.in`,
    },
  });

  const shyamGroup = await prisma.tolee.create({
    data: {
      name: `Shyam Mega Community ${timestamp}`,
      slug: `shyam-group-${timestamp}`,
      ownerId: shyamUser.id,
    },
  });

  const shyamWallet = await getOrCreateWallet(shyamUser.id);
  console.log(`[2] Shyam created group: ${shyamGroup.name} (Wallet: ${shyamWallet.id})`);

  // 3. Create Dham (The advertiser / member)
  const dhamUser = await prisma.user.create({
    data: {
      name: `Dham Advertiser ${timestamp}`,
      username: `dham_${timestamp}`,
      email: `dham_${timestamp}@tolee.in`,
    },
  });

  console.log(`[3] Dham user created: ${dhamUser.name}`);

  // 4. Dham joins Ram's group FIRST (Earliest joinedAt timestamp)
  const earliestTime = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5); // 5 days ago
  await prisma.toleeMember.create({
    data: {
      userId: dhamUser.id,
      toleeId: ramGroup.id,
      joinedAt: earliestTime,
      createdAt: earliestTime,
      role: 'member',
      status: 'approved',
    },
  });
  console.log(`[4] Dham joined Ram's group on: ${earliestTime.toISOString()} (FIRST ORIGIN)`);

  // 5. Dham joins Shyam's group LATER (2 days ago)
  const laterTime = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
  await prisma.toleeMember.create({
    data: {
      userId: dhamUser.id,
      toleeId: shyamGroup.id,
      joinedAt: laterTime,
      createdAt: laterTime,
      role: 'member',
      status: 'approved',
    },
  });
  console.log(`[5] Dham joined Shyam's group on: ${laterTime.toISOString()} (LATER)`);

  // 6. Dham runs a GLOBAL Ad Campaign on Tolee (No specific group ID)
  // Spend: ₹1000 @ 20% rev share = ₹200
  console.log('\n--- TESTING RULE 2: GLOBAL AD CAMPAIGN ATTRIBUTION ---');
  const globalEventId = `GLOBAL_AD_DHAM_${timestamp}`;
  const globalAttrRes = await processAdRevenueAttribution({
    eventId: globalEventId,
    campaignId: `CAMP_GLOBAL_${timestamp}`,
    campaignName: 'Dham Organic Products Store',
    advertiserUserId: dhamUser.id, // Dham is the advertiser
    adEventType: 'spend',
    grossSpend: 1000.0,
    // toleeId is intentionally undefined for global ad campaign
  });

  console.log('Global Ad Attribution Result:', {
    success: globalAttrRes.success,
    status: globalAttrRes.status,
    beneficiaryUserId: globalAttrRes.beneficiaryUserId,
    groupId: globalAttrRes.groupId,
    adminEarnedAmount: globalAttrRes.adminEarnedAmount,
  });

  // Verify: Ram (Origin Group Admin) must receive ₹200, and Shyam must receive ₹0
  const ramWalletAfter = await getOrCreateWallet(ramUser.id);
  const shyamWalletAfter = await getOrCreateWallet(shyamUser.id);

  console.log(`\nWallet Balances after Global Ad:`);
  console.log(`- Ram's Pending Balance: ₹${ramWalletAfter.pendingBalance} (Expected: ₹200)`);
  console.log(`- Shyam's Pending Balance: ₹${shyamWalletAfter.pendingBalance} (Expected: ₹0)`);

  if (ramWalletAfter.pendingBalance !== 200) {
    throw new Error(`FAILED: Ram expected ₹200 pending, got ₹${ramWalletAfter.pendingBalance}`);
  }
  if (shyamWalletAfter.pendingBalance !== 0) {
    throw new Error(`FAILED: Shyam expected ₹0 pending, got ₹${shyamWalletAfter.pendingBalance}`);
  }

  // 7. Testing Rule 1: Group-Specific Placement Attribution (If Dham places ad in Shyam's group feed)
  console.log('\n--- TESTING RULE 1: GROUP-SPECIFIC PLACEMENT ATTRIBUTION ---');
  const placementEventId = `PLACEMENT_AD_DHAM_${timestamp}`;
  const placementAttrRes = await processAdRevenueAttribution({
    eventId: placementEventId,
    campaignId: `CAMP_PLACEMENT_${timestamp}`,
    campaignName: 'Dham Fitness Promo in Shyam Group',
    toleeId: shyamGroup.id, // Placed specifically in Shyam's group
    advertiserUserId: dhamUser.id,
    adEventType: 'spend',
    grossSpend: 500.0, // 20% = ₹100
  });

  console.log('Placement Ad Attribution Result:', {
    success: placementAttrRes.success,
    status: placementAttrRes.status,
    beneficiaryUserId: placementAttrRes.beneficiaryUserId,
    groupId: placementAttrRes.groupId,
    adminEarnedAmount: placementAttrRes.adminEarnedAmount,
  });

  const ramWalletFinal = await getOrCreateWallet(ramUser.id);
  const shyamWalletFinal = await getOrCreateWallet(shyamUser.id);

  console.log(`\nFinal Wallet Balances:`);
  console.log(`- Ram's Pending Balance: ₹${ramWalletFinal.pendingBalance} (₹200 from Global Ad)`);
  console.log(`- Shyam's Pending Balance: ₹${shyamWalletFinal.pendingBalance} (₹100 from Placement Ad)`);

  if (shyamWalletFinal.pendingBalance !== 100) {
    throw new Error(`FAILED: Shyam expected ₹100 pending from placement ad, got ₹${shyamWalletFinal.pendingBalance}`);
  }

  console.log('\n--- ALL ATTRIBUTION RULES (PLACEMENT + GLOBAL FIRST-ORIGIN) VERIFIED AND PASSED 100%! ---');
}

runDhamScenarioTest()
  .catch((e) => {
    console.error('Test failed with error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
