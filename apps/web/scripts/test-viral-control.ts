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
  console.log('--- SUITE 1: Deterministic Percentage Calculations ---');

  // Test 1: 0 viral, 0 down -> empty state
  const emptyState = calculateDistributionPercentages(0, 0);
  assert(
    emptyState.viral_percentage === 0 &&
      emptyState.get_it_down_percentage === 0 &&
      emptyState.total_vote_count === 0,
    '1. 0 viral, 0 down -> defined empty state (0% / 0%, total = 0)'
  );

  // Test 2: 1 viral, 0 down -> 100% viral
  const allViral = calculateDistributionPercentages(1, 0);
  assert(
    allViral.viral_percentage === 100 &&
      allViral.get_it_down_percentage === 0 &&
      allViral.total_vote_count === 1,
    '2. 1 viral, 0 down -> 100% viral, 0% down'
  );

  // Test 3: 0 viral, 1 down -> 100% down
  const allDown = calculateDistributionPercentages(0, 1);
  assert(
    allDown.viral_percentage === 0 &&
      allDown.get_it_down_percentage === 100 &&
      allDown.total_vote_count === 1,
    '3. 0 viral, 1 down -> 0% viral, 100% down'
  );

  // Test 4: 80 viral, 20 down -> 80% and 20%
  const eightyTwenty = calculateDistributionPercentages(80, 20);
  assert(
    eightyTwenty.viral_percentage === 80 &&
      eightyTwenty.get_it_down_percentage === 20 &&
      eightyTwenty.total_vote_count === 100,
    '4. 80 viral, 20 down -> 80% and 20%'
  );

  // Test 5: Sums to 100% for non-zero votes
  const oddNumbers = calculateDistributionPercentages(7, 3);
  assert(
    oddNumbers.viral_percentage + oddNumbers.get_it_down_percentage === 100,
    '5. Percentages strictly sum to 100% for nonzero valid votes'
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
    // 6. User 1 votes VIRAL
    const vote1Res = await submitDistributionVote(testPost.id, voter1.id, 'VIRAL');
    assert(
      vote1Res.success &&
        vote1Res.stats.viral_count === 1 &&
        vote1Res.stats.get_it_down_count === 0 &&
        vote1Res.stats.viral_percentage === 100 &&
        vote1Res.stats.current_user_vote === 'VIRAL',
      '6. User 1 selects Make this Viral -> persists in DB and updates count to 1 (100%)'
    );

    // 7. Verify DB persistence directly
    const storedVote = await prisma.postDistributionVote.findUnique({
      where: { postId_userId: { postId: testPost.id, userId: voter1.id } },
    });
    assert(
      storedVote !== null && storedVote.voteType === 'VIRAL',
      '7. Vote record exists in post_distribution_votes table with type VIRAL'
    );

    // 8. User 2 votes GET_IT_DOWN
    const vote2Res = await submitDistributionVote(testPost.id, voter2.id, 'GET_IT_DOWN');
    assert(
      vote2Res.success &&
        vote2Res.stats.viral_count === 1 &&
        vote2Res.stats.get_it_down_count === 1 &&
        vote2Res.stats.viral_percentage === 50 &&
        vote2Res.stats.get_it_down_percentage === 50,
      '8. User 2 selects Get it Down -> counts = 1 viral, 1 down (50% / 50%)'
    );

    // 9. User 1 switches vote to GET_IT_DOWN
    const switchRes = await submitDistributionVote(testPost.id, voter1.id, 'GET_IT_DOWN');
    assert(
      switchRes.success &&
        switchRes.stats.viral_count === 0 &&
        switchRes.stats.get_it_down_count === 2 &&
        switchRes.stats.viral_percentage === 0 &&
        switchRes.stats.get_it_down_percentage === 100 &&
        switchRes.stats.current_user_vote === 'GET_IT_DOWN',
      '9. User 1 switches from VIRAL to GET_IT_DOWN -> single active vote updated, totals recalculate cleanly'
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
