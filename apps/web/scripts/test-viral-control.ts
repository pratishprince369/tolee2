import { prisma } from '../src/lib/prisma';
import {
  calculateDistributionPercentages,
  submitDistributionVote,
  getPostDistributionStats,
  processViralDistribution,
  MAX_TEST_AUDIENCE_CAP,
} from '../src/lib/viralDistributionService';

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🧪 TOLEE VIRAL CONTROL — AUTOMATED TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 1: PERCENTAGE CALCULATION TESTS
  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 1: PERCENTAGE CALCULATION TESTS (GLOBAL ELIGIBLE USERS DENOMINATOR)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- SUITE 1: Global User Participation Calculations (N = All Registered Users) ---');

  // Test 1: 0 viral, 0 down -> empty state
  const emptyState = calculateDistributionPercentages(0, 0, 1000);
  assert(
    emptyState.viral_percentage === 0 &&
      emptyState.get_it_down_percentage === 0 &&
      emptyState.total_vote_count === 0 &&
      emptyState.total_eligible_users === 1000 &&
      emptyState.total_participation_percentage === 0 &&
      emptyState.all_users_participated === false,
    '1. 0 viral, 0 down -> defined empty state (0% / 0%, total = 0, all_users_participated = false)'
  );

  // Test 2: 100 viral, 0 down, N=1000 -> 10% viral
  const tenPercent = calculateDistributionPercentages(100, 0, 1000);
  assert(
    tenPercent.viral_percentage === 10 &&
      tenPercent.get_it_down_percentage === 0 &&
      tenPercent.total_participation_percentage === 10 &&
      tenPercent.all_users_participated === false,
    '2. 100 viral, 0 down (N=1000) -> 10% viral, 0% down, 10% participation'
  );

  // Test 3: 0 viral, 250 down, N=1000 -> 25% down
  const twentyFiveDown = calculateDistributionPercentages(0, 250, 1000);
  assert(
    twentyFiveDown.viral_percentage === 0 &&
      twentyFiveDown.get_it_down_percentage === 25 &&
      twentyFiveDown.total_participation_percentage === 25 &&
      twentyFiveDown.all_users_participated === false,
    '3. 0 viral, 250 down (N=1000) -> 0% viral, 25% down, 25% participation'
  );

  // Test 4: 500 viral, 250 down, N=1000 -> 50% viral, 25% down, 75% participation (do not sum to 100%)
  const mixedVotes = calculateDistributionPercentages(500, 250, 1000);
  assert(
    mixedVotes.viral_percentage === 50 &&
      mixedVotes.get_it_down_percentage === 25 &&
      mixedVotes.total_participation_percentage === 75 &&
      mixedVotes.all_users_participated === false,
    '4. 500 viral, 250 down (N=1000) -> 50% viral, 25% down (independent global denominators, NOT forced to 100%)'
  );

  // Test 5: 999 viral, 0 down, N=1000 -> clamped to 99%, all_users_participated = false
  const nearComplete = calculateDistributionPercentages(999, 0, 1000);
  assert(
    nearComplete.viral_percentage === 99 &&
      nearComplete.all_users_participated === false,
    '5. 999 viral / 1000 users -> 99% (completion protected, not displaying premature 100%)'
  );

  // Test 6: 1000 viral, 0 down, N=1000 -> exactly 100%, all_users_participated = true
  const fullyComplete = calculateDistributionPercentages(1000, 0, 1000);
  assert(
    fullyComplete.viral_percentage === 100 &&
      fullyComplete.all_users_participated === true,
    '6. 1000 viral / 1000 users -> 100% viral and all_users_participated = true'
  );

  // Test 7: 500 viral, 500 down, N=1000 -> 100% participation complete
  const allParticipatedMixed = calculateDistributionPercentages(500, 500, 1000);
  assert(
    allParticipatedMixed.total_participation_percentage === 100 &&
      allParticipatedMixed.all_users_participated === true,
    '7. 500 viral + 500 down (N=1000) -> 100% participation complete'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP TEST DATA IN NEON DB
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- SETTING UP FIXTURES IN DATABASE ---');

  const testUserPrefix = `test_vc_${Date.now()}`;
  const author = await prisma.user.create({
    data: {
      name: 'VC Creator',
      email: `${testUserPrefix}_author@test.com`,
      username: `${testUserPrefix}_author`,
    },
  });

  const voter1 = await prisma.user.create({
    data: {
      name: 'VC Voter 1',
      email: `${testUserPrefix}_voter1@test.com`,
      username: `${testUserPrefix}_voter1`,
    },
  });

  const voter2 = await prisma.user.create({
    data: {
      name: 'VC Voter 2',
      email: `${testUserPrefix}_voter2@test.com`,
      username: `${testUserPrefix}_voter2`,
    },
  });

  // Create 15 prospective audience test users
  const audienceUsers = [];
  for (let i = 0; i < 15; i++) {
    audienceUsers.push(
      await prisma.user.create({
        data: {
          name: `VC Audience ${i + 1}`,
          email: `${testUserPrefix}_aud_${i + 1}@test.com`,
          username: `${testUserPrefix}_aud_${i + 1}`,
        },
      })
    );
  }

  // Create a published test post
  const testPost = await prisma.post.create({
    data: {
      caption: 'Test post for Tolee Viral Control',
      authorId: author.id,
      status: 'published',
      visibility: 'public',
      viralCount: 0,
      getItDownCount: 0,
    },
  });

  // Create an archived/deleted test post
  const archivedPost = await prisma.post.create({
    data: {
      caption: 'Archived post',
      authorId: author.id,
      status: 'published',
      isArchived: true,
    },
  });

  console.log(`Created fixtures: post=${testPost.id}, author=${author.id}`);

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 2: VOTE PERSISTENCE & TOGGLING & SWITCHING
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 2: Vote Persistence, Switching & Validation ---');

  try {
    // 8. User 1 votes VIRAL
    const vote1Res = await submitDistributionVote(testPost.id, voter1.id, 'VIRAL');
    const expectedViral1 = Math.round((1 / vote1Res.stats.total_eligible_users) * 100);
    assert(
      vote1Res.success &&
        vote1Res.stats.viral_count === 1 &&
        vote1Res.stats.get_it_down_count === 0 &&
        vote1Res.stats.viral_percentage === (expectedViral1 === 100 && vote1Res.stats.total_eligible_users > 1 ? 99 : expectedViral1) &&
        vote1Res.stats.current_user_vote === 'VIRAL',
      `8. User 1 selects Make this Viral -> persists in DB and updates count to 1 (viral=${vote1Res.stats.viral_percentage}%, N=${vote1Res.stats.total_eligible_users})`
    );

    // 9. Verify DB persistence directly
    const storedVote = await prisma.postDistributionVote.findUnique({
      where: { postId_userId: { postId: testPost.id, userId: voter1.id } },
    });
    assert(
      storedVote !== null && storedVote.voteType === 'VIRAL',
      '9. Vote record exists in post_distribution_votes table with type VIRAL'
    );

    // 10. User 2 votes GET_IT_DOWN
    const vote2Res = await submitDistributionVote(testPost.id, voter2.id, 'GET_IT_DOWN');
    const expectedViral2 = Math.round((1 / vote2Res.stats.total_eligible_users) * 100);
    const expectedDown2 = Math.round((1 / vote2Res.stats.total_eligible_users) * 100);
    assert(
      vote2Res.success &&
        vote2Res.stats.viral_count === 1 &&
        vote2Res.stats.get_it_down_count === 1 &&
        vote2Res.stats.viral_percentage === (expectedViral2 === 100 && vote2Res.stats.total_eligible_users > 1 ? 99 : expectedViral2) &&
        vote2Res.stats.get_it_down_percentage === (expectedDown2 === 100 && vote2Res.stats.total_eligible_users > 1 ? 99 : expectedDown2),
      `10. User 2 selects Get it Down -> counts = 1 viral, 1 down (viral=${vote2Res.stats.viral_percentage}%, down=${vote2Res.stats.get_it_down_percentage}%)`
    );

    // 11. User 1 switches vote to GET_IT_DOWN
    const switchRes = await submitDistributionVote(testPost.id, voter1.id, 'GET_IT_DOWN');
    const expectedDownSwitch = Math.round((2 / switchRes.stats.total_eligible_users) * 100);
    assert(
      switchRes.success &&
        switchRes.stats.viral_count === 0 &&
        switchRes.stats.get_it_down_count === 2 &&
        switchRes.stats.viral_percentage === 0 &&
        switchRes.stats.get_it_down_percentage === (expectedDownSwitch === 100 && switchRes.stats.total_eligible_users > 2 ? 99 : expectedDownSwitch) &&
        switchRes.stats.current_user_vote === 'GET_IT_DOWN',
      '11. User 1 switches from VIRAL to GET_IT_DOWN -> single active vote updated, totals recalculate cleanly'
    );

    // Check no duplicate vote was created for User 1
    const user1Votes = await prisma.postDistributionVote.findMany({
      where: { postId: testPost.id, userId: voter1.id },
    });
    assert(
      user1Votes.length === 1 && user1Votes[0].voteType === 'GET_IT_DOWN',
      '10. Only 1 unique vote record exists per user per post (no duplicates)'
    );

    // 11. User 1 clicks GET_IT_DOWN again -> toggles unvote
    const unvoteRes = await submitDistributionVote(testPost.id, voter1.id, 'GET_IT_DOWN');
    assert(
      unvoteRes.success &&
        unvoteRes.stats.viral_count === 0 &&
        unvoteRes.stats.get_it_down_count === 1 &&
        unvoteRes.stats.current_user_vote === null,
      '11. Clicking the selected option again toggles unvote cleanly'
    );

    // 12. Invalid post ID is rejected
    let invalidPostCaught = false;
    try {
      await submitDistributionVote('invalid_cuid_123', voter1.id, 'VIRAL');
    } catch {
      invalidPostCaught = true;
    }
    assert(invalidPostCaught, '12. Invalid post ID is rejected with error');

    // 13. Archived/deleted post is rejected
    let archivedPostCaught = false;
    try {
      await submitDistributionVote(archivedPost.id, voter1.id, 'VIRAL');
    } catch {
      archivedPostCaught = true;
    }
    assert(archivedPostCaught, '13. Archived/deleted post is rejected');

    // 14. Turn vote back to VIRAL for distribution testing (and unvote voter2)
    await submitDistributionVote(testPost.id, voter1.id, 'VIRAL');
    await submitDistributionVote(testPost.id, voter2.id, 'GET_IT_DOWN'); // toggles off voter2's downvote
    const statsAfterViral = await getPostDistributionStats(testPost.id, voter1.id);
    assert(
      statsAfterViral.current_user_vote === 'VIRAL' &&
        statsAfterViral.viral_count === 1 &&
        statsAfterViral.get_it_down_count === 0,
      '14. User 1 votes VIRAL again and voter 2 unvotes -> post has positive viral signal (1 viral, 0 down)'
    );
  } catch (err: any) {
    console.error('Error in Suite 2:', err);
    failed++;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUITE 3: ADDITIONAL DISTRIBUTION & 10-USER CAP ENFORCEMENT
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 3: Additional Distribution Algorithm & 10-User Cap ---');

  try {
    // 15. Process distribution wave 1
    const dist1 = await processViralDistribution(testPost.id);
    assert(
      dist1.totalDelivered <= MAX_TEST_AUDIENCE_CAP && dist1.totalDelivered > 0,
      `15. Viral distribution wave delivers up to cap (delivered ${dist1.totalDelivered} <= ${MAX_TEST_AUDIENCE_CAP})`
    );

    // 16. Second wave should not exceed MAX_TEST_AUDIENCE_CAP
    const dist2 = await processViralDistribution(testPost.id);
    assert(
      dist2.totalDelivered <= MAX_TEST_AUDIENCE_CAP,
      `16. Subsequent distribution runs strictly respect 10-user cap (total = ${dist2.totalDelivered})`
    );

    // 17. Verify database delivery records
    const deliveries = await prisma.postDistributionDelivery.findMany({
      where: { postId: testPost.id },
    });
    assert(
      deliveries.length <= MAX_TEST_AUDIENCE_CAP,
      `17. Database records count (${deliveries.length}) does not exceed cap (${MAX_TEST_AUDIENCE_CAP})`
    );

    // 18. Unique recipient check
    const recipientIds = deliveries.map((d) => d.recipientUserId);
    const uniqueRecipients = new Set(recipientIds);
    assert(
      recipientIds.length === uniqueRecipients.size,
      '18. All recipients are distinct (zero duplicate deliveries)'
    );

    // 19. Creator is not a recipient
    assert(
      !uniqueRecipients.has(author.id),
      '19. Content author is never chosen as a test audience recipient'
    );

    // 20. Users who voted GET_IT_DOWN are not included
    assert(
      !uniqueRecipients.has(voter2.id),
      '20. User who voted GET_IT_DOWN is excluded from additional distribution'
    );

    // 21. Get it Down excludes content from future distribution
    let downVotePostId: string | null = null;
    const downVotePost = await prisma.post.create({
      data: {
        caption: 'Downvoted post',
        authorId: author.id,
        status: 'published',
        visibility: 'public',
      },
    });
    downVotePostId = downVotePost.id;
    await submitDistributionVote(downVotePost.id, voter1.id, 'GET_IT_DOWN');
    const downDist = await processViralDistribution(downVotePost.id);
    const downDeliveries = await prisma.postDistributionDelivery.findMany({
      where: { postId: downVotePost.id },
    });
    assert(
      downDeliveries.length === 0,
      '21. Posts with GET_IT_DOWN are not delivered into additional distribution pool'
    );

    // Explicit cleanup for downVotePost
    if (downVotePostId) {
      await prisma.postDistributionVote.deleteMany({ where: { postId: downVotePostId } });
      await prisma.postDistributionDelivery.deleteMany({ where: { postId: downVotePostId } });
      await prisma.post.deleteMany({ where: { id: downVotePostId } });
    }
  } catch (err: any) {
    console.error('Error in Suite 3:', err);
    failed++;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP TEST FIXTURES
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- CLEANING UP TEST FIXTURES ---');
  try {
    await prisma.postDistributionDelivery.deleteMany({
      where: { postId: { in: [testPost.id, archivedPost.id] } },
    });
    await prisma.postDistributionVote.deleteMany({
      where: { postId: { in: [testPost.id, archivedPost.id] } },
    });
    await prisma.post.deleteMany({
      where: { id: { in: [testPost.id, archivedPost.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [author.id, voter1.id, voter2.id, ...audienceUsers.map((u) => u.id)] } },
    });
    console.log('Cleaned up all test data successfully.');
  } catch (cleanErr) {
    console.warn('Note on cleanup:', cleanErr);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
