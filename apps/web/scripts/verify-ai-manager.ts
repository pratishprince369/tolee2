/**
 * Tolee AI Manager Advanced Verification Test Suite (V3 + Open-Higgsfield Media Integration)
 * Validates Agent Loop, Tools, Prompts, Approvals, Memory, Safety Rules,
 * Paid Ads Double Confirmation, Batch Group Posting, and Open-Higgsfield AI Image/Video Generation.
 */

import { ToolRegistry } from '../src/modules/tolee-ai-agent/tools/registry';
import { buildMasterSystemPrompt, SUPPORTING_PROMPTS } from '../src/modules/tolee-ai-manager/Core/prompt-manager';
import { classifyIntelligenceIntent } from '../src/modules/tolee-ai-manager/Core/ai-router';
import { ToleeRealityValidator } from '../src/lib/ai-gateway/reality-validator';
import { ApprovalEngine } from '../src/modules/tolee-ai-agent/approvals/approval-engine';
import { AgentOrchestrator } from '../src/modules/tolee-ai-agent/core/agent-orchestrator';
import {
  OpenHiggsfieldMediaService,
  OPEN_HIGGSFIELD_MODELS,
} from '../src/modules/tolee-ai-agent/media/generation-service';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TOLEE AI MANAGER — ADVANCED VERIFICATION TEST SUITE');
  console.log('🎬 OPEN-HIGGSFIELD AI IMAGE & VIDEO INTEGRATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Tool Registry & Canonical Schemas
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Tool Registry & Canonical Schemas ---');
  const allTools = ToolRegistry.getAll();
  assert(allTools.length >= 25, `ToolRegistry should register >= 25 tools (Found: ${allTools.length})`);

  const requiredToolNames = [
    // Standard names
    'get_latest_messages',
    'send_message',
    'get_user_posts',
    'create_post',
    'get_notifications',
    'get_tolee_groups',
    'get_user_profile',
    'create_reminder',
    'live_web_search',
    'calendar_assistant',
    // V3 tools
    'post_to_groups',
    'create_ad_campaign',
    'get_ad_options',
    'update_profile_bio',
    'delete_post',
    'search_user_memory',
    'save_user_memory',
    'forget_user_memory',
    'cancel_active_task',
    // Open-Higgsfield Generative Media tools
    'generate_ai_image',
    'generate_ai_video',
    'get_media_generation_status',
    'list_my_generations',
    'cancel_generation',
    'save_media_as_reel_draft',
    // Logical dot-notation aliases
    'content.create_post',
    'content.delete_post',
    'content.get_post_status',
    'groups.list_my_groups',
    'groups.post_to_groups',
    'chats.list_conversations',
    'chats.send_message',
    'ads.get_options',
    'ads.create_campaign',
    'profile.get',
    'profile.update_bio',
    'tasks.get_status',
    'tasks.cancel',
    'memory.search',
    'memory.save',
    'memory.forget',
    'media.generate_image',
    'media.generate_video',
    'media.get_generation_status',
    'media.list_my_generations',
    'media.cancel_generation',
    'reels.create_draft',
  ];

  for (const name of requiredToolNames) {
    const tool = ToolRegistry.get(name);
    assert(Boolean(tool), `Tool / Alias '${name}' is registered in ToolRegistry`);
    if (tool) {
      assert(Boolean(tool.description && tool.parameters), `Tool '${name}' has description and parameters`);
    }
  }

  // ----------------------------------------------------
  // TEST 2: Master System Prompt Constitution & Variables
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: Master System Prompt Constitution ---');
  const prompt = buildMasterSystemPrompt({
    userName: 'Pratish',
    userLanguage: 'Hinglish',
    timezone: 'Asia/Kolkata',
    userPlan: 'creator',
    memorySummary: 'User runs a digital media channel.',
  });

  assert(prompt.includes('You are Tolee AI Manager'), 'Prompt defines official identity');
  assert(prompt.includes('User name: Pratish'), 'Prompt injects userName correctly');
  assert(prompt.includes('Language preference: Hinglish'), 'Prompt injects language correctly');
  assert(prompt.includes('## APPROVAL RULES - NEVER BREAK THESE'), 'Prompt enforces Approval Rules (A1-A4)');
  assert(prompt.includes('## BROWSING RULES'), 'Prompt enforces Browsing Rules (B1-B5)');
  assert(prompt.includes('## MEMORY RULES'), 'Prompt enforces Memory Rules (M1-M4)');
  assert(prompt.includes('## SAFETY RULES'), 'Prompt enforces Safety Rules (S1-S6)');
  assert(prompt.includes('## HONESTY RULES'), 'Prompt enforces Honesty Rules (H1-H3)');
  assert(prompt.includes('Prompt-injection defence'), 'Prompt includes anti-injection defense (Rule S-4)');

  // ----------------------------------------------------
  // TEST 3: Supporting Prompts
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Supporting Prompts ---');
  const intentPrompt = SUPPORTING_PROMPTS.INTENT_ROUTER('Roz subah ek post schedule karo');
  assert(intentPrompt.includes('Classify the user\'s message into ONE intent'), 'Intent router prompt matches specification');

  const contentPrompt = SUPPORTING_PROMPTS.CONTENT_CREATOR({ topic: 'Diwali sale', seconds: 30 });
  assert(contentPrompt.includes('HOOK - one line'), 'Content creator prompt generates Hook, Script, Caption & Hashtags');

  const safetyPrompt = SUPPORTING_PROMPTS.SAFETY_CLASSIFIER('Click here to get 10,000 free followers');
  assert(safetyPrompt.includes('Check this draft post against Tolee community guidelines'), 'Safety classifier prompt is active');

  // ----------------------------------------------------
  // TEST 4: Intent Classification & Routing (Including Video)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Intent Classification ---');
  assert(classifyIntelligenceIntent('write a python script to scrape data') === 'coding', 'Detects coding intent');
  assert(classifyIntelligenceIntent('generate an image of a cybernetic tiger') === 'image_generation', 'Detects image generation intent');
  assert(classifyIntelligenceIntent('Mere real estate project ke liye cinematic property video banao') === 'video_generation', 'Detects video generation intent');
  assert(classifyIntelligenceIntent('what is the capital of India?') === 'general_chat', 'Detects general chat intent');

  // ----------------------------------------------------
  // TEST 5: Reality Validator & Anti-Hallucination
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 5: Reality Validator ---');
  const hallucinatedPostClaim = 'Main aapka post Tolee feed par successfully publish kar diya!';
  const sanitized = ToleeRealityValidator.validate(hallucinatedPostClaim, {
    userId: 'user_123',
    userMessage: 'post create karo',
    toolUsed: null,
    toolResultSuccess: false,
  });

  assert(
    sanitized.sanitizedContent.includes('draft') || sanitized.sanitizedContent.includes('prepare') || sanitized.sanitizedContent.includes('approve') || sanitized.hasHallucinationWarning,
    'Reality Validator intercepts unverified publish claims when no tool was executed'
  );

  // ----------------------------------------------------
  // TEST 6: Strict Backend Approval Engine (Section 6)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 6: Strict Backend Approval Engine ---');
  const userA = 'user_alice_123';
  const userB = 'user_bob_456';

  const approval1 = ApprovalEngine.createApproval({
    userId: userA,
    actionType: 'PUBLISH_POST',
    title: 'Publish Festive Post',
    description: 'Publishes draft to Tolee feed',
    summary: 'Happy Diwali everyone!',
    payload: { caption: 'Happy Diwali everyone!', visibility: 'public' },
  });

  assert(Boolean(approval1.id && approval1.payloadHash), 'ApprovalEngine creates approval with unique ID and payload hash');
  assert(approval1.state === 'pending', 'New approval starts in pending state');

  const crossUserFetch = ApprovalEngine.getApproval(approval1.id, userB);
  assert(!crossUserFetch.success, 'Rejects approval lookup belonging to another user');

  const tamperedPayload = { caption: 'Malicious modified caption!', visibility: 'public' };
  const tamperResult = ApprovalEngine.approve(approval1.id, userA, tamperedPayload);
  assert(!tamperResult.success, 'Editing an approved payload invalidates the approval request');

  const approval2 = ApprovalEngine.createApproval({
    userId: userA,
    actionType: 'PUBLISH_POST',
    title: 'Valid Post',
    description: 'Post draft',
    summary: 'Clean post',
    payload: { caption: 'Clean post' },
  });

  const validApprove = ApprovalEngine.approve(approval2.id, userA, { caption: 'Clean post' });
  assert(validApprove.success && validApprove.record?.state === 'approved', 'Valid approval transitions state to approved');

  const claim1 = ApprovalEngine.claimForExecution(approval2.id, userA);
  assert(claim1.success && claim1.record?.state === 'executing', 'Atomically transitions from approved to executing');

  const claim2 = ApprovalEngine.claimForExecution(approval2.id, userA);
  assert(!claim2.success, 'Prevents double / concurrent execution');

  ApprovalEngine.markCompleted(approval2.id, userA, { postId: 'post_999' });
  const completed = ApprovalEngine.getApproval(approval2.id, userA);
  assert(completed.record?.state === 'completed', 'Transitions state to completed upon successful operation');

  // ----------------------------------------------------
  // TEST 7: Instant Task Cancellation & Recovery (Section 11)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 7: Instant Cancellation & Recovery ---');
  ApprovalEngine.createApproval({
    userId: 'user_cancel_test',
    actionType: 'PUBLISH_POST',
    title: 'Draft to cancel',
    description: 'Pending post',
    summary: 'Will be cancelled',
    payload: { caption: 'Cancel me' },
  });

  const cancelResult = await AgentOrchestrator.process({
    userMessage: 'ruko mat karo!',
    context: { userId: 'user_cancel_test', userName: 'Tester' },
  });

  assert(cancelResult.executedTool === 'cancel_active_task', 'AgentOrchestrator intercepts "ruko mat karo" and stops actions');
  assert(cancelResult.replyText.includes('cancel') || cancelResult.replyText.includes('stop'), 'Returns accurate cancellation confirmation');

  // ----------------------------------------------------
  // TEST 8: Paid Ads Double Confirmation (Section 8)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 8: Paid Ads Double Confirmation ---');
  const adOptionsTool = ToolRegistry.get('get_ad_options');
  assert(Boolean(adOptionsTool), 'get_ad_options tool is active');

  const tiersResult = await adOptionsTool!.execute({}, { userId: 'user_ad_test' });
  assert(tiersResult.success && Array.isArray(tiersResult.data) && tiersResult.data.length >= 3, 'Returns official boost tiers with pricing and reach');

  // ----------------------------------------------------
  // TEST 9: Open-Higgsfield AI Image & Video Studio
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 9: Open-Higgsfield Generative Media Studio ---');

  // 9.1: Model Catalog
  assert(OPEN_HIGGSFIELD_MODELS.length >= 8, `Open-Higgsfield catalog registers >= 8 verified models (Found: ${OPEN_HIGGSFIELD_MODELS.length})`);
  const imageModel = OpenHiggsfieldMediaService.getModel('flux-schnell', 'image');
  assert(imageModel.displayName.includes('Flux'), 'Resolves premier Flux Schnell image model');
  const videoModel = OpenHiggsfieldMediaService.getModel('seedance-2.5-text-to-video', 'video');
  assert(videoModel.displayName.includes('Seedance'), 'Resolves premier Seedance 2.5 Cinema video model');

  // 9.2: Real Image Generation (Draft Mode)
  const imageGenTask = await OpenHiggsfieldMediaService.generateImage({
    userId: userA,
    prompt: 'Luxury modern villa with warm ambient lighting at sunset, 8k resolution',
    modelId: 'flux-schnell',
    aspectRatio: '16:9',
  });

  assert(imageGenTask.status === 'completed', 'Image generation completes successfully');
  assert(imageGenTask.outputUrls.length > 0 && imageGenTask.outputUrls[0].startsWith('http'), 'Returns valid output URL for generated image');
  assert(imageGenTask.type === 'image' && imageGenTask.userId === userA, 'Maintains user ownership of generated image');

  // 9.3: Real Video Generation (Draft Mode)
  const videoGenTask = await OpenHiggsfieldMediaService.generateVideo({
    userId: userA,
    prompt: 'Cinematic drone tracking shot over a modern luxury villa poolside',
    modelId: 'seedance-2.5-text-to-video',
    duration: 5,
    aspectRatio: '16:9',
  });

  assert(videoGenTask.status === 'completed', 'Video generation completes successfully');
  assert(videoGenTask.outputUrls.length > 0 && videoGenTask.outputUrls[0].includes('.mp4'), 'Returns playable MP4 video URL');
  assert(videoGenTask.type === 'video' && videoGenTask.duration === 5, 'Enforces requested duration parameter');

  // 9.4: Cross-user generation privacy protection
  const foreignFetch = OpenHiggsfieldMediaService.getTask(videoGenTask.taskId, userB);
  assert(foreignFetch === null, 'Rejects cross-user access to another user\'s media generation task');

  const ownFetch = OpenHiggsfieldMediaService.getTask(videoGenTask.taskId, userA);
  assert(ownFetch !== null && ownFetch.taskId === videoGenTask.taskId, 'Authorizes media lookup for authenticated owner');

  // 9.5: Generation History Listing
  const userHistory = OpenHiggsfieldMediaService.listUserTasks(userA);
  assert(userHistory.length >= 2, `Generations history retrieves all user drafts (Found: ${userHistory.length})`);

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
