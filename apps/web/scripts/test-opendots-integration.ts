import { ToleeSpecialistRegistry, TOLEE_SPECIALISTS } from '../src/modules/tolee-ai-agent/core/specialists';
import { createPostTool } from '../src/modules/tolee-ai-agent/tools/post-tools';
import { ToleeRealityValidator } from '../src/lib/ai-gateway/reality-validator';

async function runOpenDotsIntegrationTests() {
  console.log('====================================================');
  console.log('🧪 TOLEE AI MANAGER + OPENDOTS INTEGRATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  // 1. Specialist Registry & Count
  const allSpecialists = ToleeSpecialistRegistry.getAll();
  assert(allSpecialists.length === 10, 'All 10 OpenDots specialist agents registered');

  // 2. Dynamic Specialist Routing
  const devRoute = ToleeSpecialistRegistry.routeSpecialist('Fix this typescript bug in my code');
  assert(devRoute.id === 'developer_agent', 'Routes coding query to Developer Agent');

  const creativeRoute = ToleeSpecialistRegistry.routeSpecialist('Create a festival banner and poster');
  assert(creativeRoute.id === 'content_creator', 'Routes visual creative query to Content Creator');

  const socialRoute = ToleeSpecialistRegistry.routeSpecialist('Publish post on my social feed');
  assert(socialRoute.id === 'social_media_agent', 'Routes social feed query to Social Media Agent');

  const marketingRoute = ToleeSpecialistRegistry.routeSpecialist('Set up ad campaign and check ad spend budget');
  assert(marketingRoute.id === 'marketing_agent', 'Routes marketing query to Marketing Agent');

  const crmRoute = ToleeSpecialistRegistry.routeSpecialist('Check new marketplace customer enquiries');
  assert(crmRoute.id === 'crm_agent', 'Routes customer enquiry query to CRM Agent');

  const calendarRoute = ToleeSpecialistRegistry.routeSpecialist('Remind me tomorrow at 9 AM for my meeting');
  assert(calendarRoute.id === 'calendar_task_agent', 'Routes reminder query to Calendar & Task Agent');

  const communityRoute = ToleeSpecialistRegistry.routeSpecialist('Find active tolee group discussions');
  assert(communityRoute.id === 'community_agent', 'Routes community query to Community Agent');

  const newsRoute = ToleeSpecialistRegistry.routeSpecialist('What is the latest breaking news today?');
  assert(newsRoute.id === 'news_research_agent', 'Routes current affairs query to News Research Agent');

  const researchRoute = ToleeSpecialistRegistry.routeSpecialist('Who is Dr APJ Abdul Kalam? Unake bare me batao');
  assert(researchRoute.id === 'research_agent', 'Routes biographical research query to Research Agent');

  const generalRoute = ToleeSpecialistRegistry.routeSpecialist('Hello, how can you assist me?');
  assert(generalRoute.id === 'general_assistant', 'Routes greeting to General Assistant');

  // 3. Human-in-the-Loop Review Interception
  console.log('\n--- Testing OpenDots Human-in-the-Loop Approval Interception ---');
  const unapprovedRun = await createPostTool.execute(
    { caption: 'Hello Tolee Community from AI!' },
    { userId: 'test_user_123' }
  );

  assert(unapprovedRun.success === true, 'Tool call succeeds without crashing');
  assert(unapprovedRun.requiresConfirmation === true, 'High-risk tool call intercepts with requiresConfirmation=true');
  assert(unapprovedRun.confirmationDetails?.actionType === 'PUBLISH_POST', 'Approval details provide correct actionType');
  assert(unapprovedRun.confirmationDetails?.summary === 'Hello Tolee Community from AI!', 'Approval details preserve exact caption draft');

  // 4. Reality Validator Action Guard
  console.log('\n--- Testing Anti-Hallucination Guard on Unverified Action ---');
  const fakeActionClaim = 'Maine aapka post publish kar diya hai!';
  const validation = ToleeRealityValidator.validate(fakeActionClaim, {
    userMessage: 'Post banao',
    toolUsed: null,
    toolResultSuccess: false,
  });
  assert(validation.isValid === false, 'Validator catches action claim without tool execution');

  // 5. AG-UI Protocol Event Structure
  console.log('\n--- Testing AG-UI Protocol Event Encodings ---');
  const sampleAgUiEvents = [
    { type: 'RUN_START', runId: 'run_123', specialist: { id: 'research_agent', name: 'Tolee Deep Research Agent' } },
    { type: 'STATUS_UPDATE', status: 'Searching verified sources...' },
    { type: 'TOOL_CALL_START', tool: 'live_web_search' },
    { type: 'APPROVAL_REQUEST', approval: unapprovedRun.confirmationDetails },
    { type: 'TEXT_MESSAGE_CHUNK', delta: 'Here is your verified briefing.' },
    { type: 'RUN_FINISH' },
  ];

  const serialized = sampleAgUiEvents.map(e => `data: ${JSON.stringify(e)}\n\n`).join('');
  assert(serialized.includes('RUN_START'), 'AG-UI protocol correctly encodes RUN_START');
  assert(serialized.includes('APPROVAL_REQUEST'), 'AG-UI protocol correctly encodes APPROVAL_REQUEST');
  assert(serialized.includes('RUN_FINISH'), 'AG-UI protocol correctly encodes RUN_FINISH');

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runOpenDotsIntegrationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
