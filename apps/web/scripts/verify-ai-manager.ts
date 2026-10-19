/**
 * Tolee AI Manager Comprehensive Verification Test Suite
 * Validates Agent Loop, Tools, Prompts, Approvals, Memory, and Safety Rules
 */

import { ToolRegistry } from '../src/modules/tolee-ai-agent/tools/registry';
import { buildMasterSystemPrompt, SUPPORTING_PROMPTS } from '../src/modules/tolee-ai-manager/Core/prompt-manager';
import { classifyIntelligenceIntent } from '../src/modules/tolee-ai-manager/Core/ai-router';
import { ToleeRealityValidator } from '../src/lib/ai-gateway/reality-validator';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TOLEE AI MANAGER — ADVANCED VERIFICATION TEST SUITE');
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
  // TEST 1: Tool Registry Completeness
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Tool Registry & Schemas ---');
  const allTools = ToolRegistry.getAll();
  assert(allTools.length >= 10, `ToolRegistry should register >= 10 core tools (Found: ${allTools.length})`);

  const requiredToolNames = [
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
  ];

  for (const name of requiredToolNames) {
    const tool = ToolRegistry.get(name);
    assert(Boolean(tool), `Tool '${name}' is registered in ToolRegistry`);
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
  // TEST 3: Supporting Prompts (Section 12)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Supporting Prompts ---');
  const intentPrompt = SUPPORTING_PROMPTS.INTENT_ROUTER('Roz subah ek post schedule karo');
  assert(intentPrompt.includes('Classify the user\'s message into ONE intent'), 'Intent router prompt matches specification');

  const contentPrompt = SUPPORTING_PROMPTS.CONTENT_CREATOR({ topic: 'Diwali sale', seconds: 30 });
  assert(contentPrompt.includes('HOOK - one line'), 'Content creator prompt generates Hook, Script, Caption & Hashtags');

  const safetyPrompt = SUPPORTING_PROMPTS.SAFETY_CLASSIFIER('Click here to get 10,000 free followers');
  assert(safetyPrompt.includes('Check this draft post against Tolee community guidelines'), 'Safety classifier prompt is active');

  // ----------------------------------------------------
  // TEST 4: Intent Classification & Routing
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Intent Classification ---');
  assert(classifyIntelligenceIntent('write a python script to scrape data') === 'coding', 'Detects coding intent');
  assert(classifyIntelligenceIntent('generate an image of a cybernetic tiger') === 'image_generation', 'Detects image generation intent');
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
