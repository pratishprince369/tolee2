import { searchAndGroundQuery, isPersonQuery, extractCleanSearchTerm } from '../src/lib/web-search';
import { ToleeRealityValidator } from '../src/lib/ai-gateway/reality-validator';

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('🧪 TOLEE AI GROUNDING & ANTI-HALLUCINATION SUITE');
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

  // 1. Clean Term Extraction
  const cleanVilas = extractCleanSearchTerm('Vilas Rupawate kon hai? Unake bare me batao.');
  assert(cleanVilas.toLowerCase().includes('vilas rupawate'), 'Clean search term retains entity name');
  assert(!cleanVilas.toLowerCase().includes('kon hai'), 'Clean search term removes question filler');

  // 2. Person Query Detection
  assert(isPersonQuery('Vilas Rupawate kaun hai?'), 'Detects "kaun hai" as person query');
  assert(isPersonQuery('Who is Narendra Modi?'), 'Detects "Who is" as person query');
  assert(isPersonQuery('unake bare me batao'), 'Detects "unake bare me" as person query');
  assert(!isPersonQuery('What is quicksort in python?'), 'Does not falsely flag coding question as person');

  // 3. Live Web Search Grounding for Vilas Rupawate
  console.log('\n--- Running Live Search Grounding for Vilas Rupawate ---');
  const searchRes = await searchAndGroundQuery('Vilas Rupawate kon hai? Unake bare me batao.', 3);
  console.log('Search Found Evidence:', searchRes.hasEvidence);
  console.log('Sources:', searchRes.sources);
  assert(searchRes.hasEvidence === true, 'Live search successfully finds verified evidence for Vilas Rupawate');
  assert(
    searchRes.contextText.toLowerCase().includes('politician') ||
    searchRes.contextText.toLowerCase().includes('congress') ||
    searchRes.contextText.toLowerCase().includes('maharashtra'),
    'Search correctly identifies real political and social context'
  );
  assert(!searchRes.contextText.toLowerCase().includes('cricketer'), 'Search does not contain false cricket claim');

  // 4. Reality Validator: Anti-Hallucination Guard against Cricket Claim
  console.log('\n--- Testing Anti-Hallucination Guard on Hallucinated Cricket Output ---');
  const fakeCricketResponse = 'Vilas Rupawate ek Indian cricketer hain. Unhone Maharashtra cricket team ke liye khela hai.';
  const validation = ToleeRealityValidator.validate(fakeCricketResponse, {
    userMessage: 'Vilas Rupawate kon hai?',
    searchEvidence: searchRes.contextText,
  });

  console.log('Validator isValid:', validation.isValid);
  console.log('Validator Correction:', validation.correctionNotice);
  assert(validation.isValid === false, 'Validator catches ungrounded cricketer claim');
  assert(!validation.sanitizedContent.toLowerCase().includes('ek indian cricketer hain'), 'Sanitized content strips false cricketer assertion');

  // 5. Reality Validator: Unknown person without evidence
  console.log('\n--- Testing Anti-Hallucination Guard on Unknown Entity ---');
  const fakeUnknownPersonResponse = 'John Doe1234 ek famous doctor hain aur unhone kai hospitals banaye hain.';
  const validationUnknown = ToleeRealityValidator.validate(fakeUnknownPersonResponse, {
    userMessage: 'Who is John Doe1234?',
    searchEvidence: '',
  });
  assert(validationUnknown.isValid === false, 'Validator catches ungrounded profession for unknown entity');
  assert(validationUnknown.sanitizedContent.includes('reliable sources'), 'Validator returns uncertainty communication when no evidence exists');

  // 6. Action Validation Guard
  console.log('\n--- Testing Action Claim Without Tool Execution ---');
  const fakeActionClaim = 'Maine aapka post publish kar diya hai!';
  const actionValidation = ToleeRealityValidator.validate(fakeActionClaim, {
    userMessage: 'Post publish karo',
    toolUsed: null,
    toolResultSuccess: false,
  });
  assert(actionValidation.isValid === false, 'Validator intercepts fake action completion claim without tool execution');

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
