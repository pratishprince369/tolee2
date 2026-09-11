export type AIModuleIntent =
  | 'dashboard'
  | 'personal'
  | 'calendar'
  | 'tasks'
  | 'reminders'
  | 'crm'
  | 'community'
  | 'business'
  | 'social'
  | 'creator'
  | 'developer'
  | 'documents'
  | 'emergency'
  | 'health'
  | 'finance'
  | 'travel'
  | 'family'
  | 'shopping'
  | 'legal'
  | 'learning'
  | 'news'
  | 'settings'
  | 'image_generation'
  | 'coding'
  | 'reasoning'
  | 'general_chat';

export type GeneralAIIntent = 
  | 'platform_action'
  | 'image_generation'
  | 'coding'
  | 'reasoning'
  | 'document_analysis'
  | 'vision'
  | 'general_chat';

export function classifyIntelligenceIntent(input: string, hasMedia: boolean = false, mediaType?: string): GeneralAIIntent {
  const query = input.toLowerCase().trim();

  // 1. Multimodal Vision
  if (hasMedia && mediaType?.startsWith('image/')) {
    return 'vision';
  }

  // 2. Document Analysis
  if (hasMedia && (mediaType?.includes('pdf') || mediaType?.includes('text') || mediaType?.includes('csv') || mediaType?.includes('document') || mediaType?.includes('json'))) {
    return 'document_analysis';
  }

  // 3. Coding & Software Architecture
  const isCoding = 
    query.includes('code') ||
    query.includes('coding') ||
    query.includes('function') ||
    query.includes('debug') ||
    query.includes('javascript') ||
    query.includes('typescript') ||
    query.includes('python') ||
    query.includes('react') ||
    query.includes('next.js') ||
    query.includes('html') ||
    query.includes('css') ||
    query.includes('sql') ||
    query.includes('database') ||
    query.includes('api') ||
    query.includes('regex') ||
    query.includes('algorithm') ||
    query.includes('frontend') ||
    query.includes('backend') ||
    query.includes('component') ||
    query.includes('git') ||
    query.includes('docker') ||
    query.includes('bug');

  if (isCoding) {
    return 'coding';
  }

  // 4. Mathematical & Logic Reasoning
  const isReasoning = 
    query.includes('solve step by step') ||
    query.includes('calculate') ||
    query.includes('math') ||
    query.includes('algebra') ||
    query.includes('calculus') ||
    query.includes('equation') ||
    query.includes('probability') ||
    query.includes('logic puzzle') ||
    query.includes('riddle') ||
    /\b(\d+\s*[\+\-\*\/\^%]\s*\d+)\b/.test(query);

  if (isReasoning) {
    return 'reasoning';
  }

  // 5. Image & Visual Generation (Strict Disambiguation)
  const explicitImageKeywords = [
    'generate image', 'generate an image', 'create image', 'make image', 'draw',
    'photo banao', 'image banao', 'poster banao', 'banner banao', 'creative banao',
    'generate picture', 'generate photo', 'create poster', 'design banner', 'design poster',
    'illustration of', 'wallpaper of', '4k image', 'photorealistic image',
    'फोटो बनाओ', 'इमेज बनाओ', 'पोस्टर बनाओ', 'बैनर बनाओ', 'चित्र बनाओ', 'तस्वीर बनाओ'
  ];

  const hasExplicitImageIntent = explicitImageKeywords.some(k => query.includes(k)) ||
    ((query.includes('banner') || query.includes('poster') || query.includes('flyer') || query.includes('wallpaper')) &&
     (query.includes('generate') || query.includes('create') || query.includes('design') || query.includes('banao') || query.includes('बनाओ')));

  if (hasExplicitImageIntent) {
    return 'image_generation';
  }

  // 6. Platform Actions (Calendar, CRM, Tasks, Ads, Notifications)
  const isPlatformAction = 
    query.includes('crm') ||
    query.includes('lead') ||
    query.includes('schedule') ||
    query.includes('kal kya hai') ||
    query.includes('aaj kya hai') ||
    query.includes('reminder') ||
    query.includes('task') ||
    query.includes('delete post') ||
    query.includes('like post') ||
    query.includes('create ad') ||
    query.includes('marketplace') ||
    query.includes('notifications') ||
    query.includes('टास्क') ||
    query.includes('शेड्यूल') ||
    query.includes('रिमाइंडर') ||
    query.includes('लीड');

  if (isPlatformAction) {
    return 'platform_action';
  }

  // 7. General Knowledge, Explanations, Writing & Chat
  return 'general_chat';
}

export function classifyUserIntent(input: string): AIModuleIntent {
  const query = input.toLowerCase();

  if (query.includes('lead') || query.includes('sales') || query.includes('client') || query.includes('proposal') || query.includes('follow-up')) {
    return 'crm';
  }

  if (query.includes('calendar') || query.includes('meeting') || query.includes('schedule') || query.includes('appointment')) {
    return 'calendar';
  }

  if (query.includes('task') || query.includes('todo') || query.includes('remind') || query.includes('due')) {
    return 'tasks';
  }

  if (query.includes('group') || query.includes('tolee') || query.includes('community') || query.includes('announcement')) {
    return 'community';
  }

  if (query.includes('post') || query.includes('caption') || query.includes('hashtag') || query.includes('instagram') || query.includes('facebook')) {
    return 'social';
  }

  if (query.includes('reel') || query.includes('script') || query.includes('thumbnail') || query.includes('youtube')) {
    return 'creator';
  }

  if (query.includes('invoice') || query.includes('quotation') || query.includes('marketing') || query.includes('seo') || query.includes('business')) {
    return 'business';
  }

  if (query.includes('code') || query.includes('bug') || query.includes('api') || query.includes('sql') || query.includes('deploy')) {
    return 'developer';
  }

  if (query.includes('aadhaar') || query.includes('pan') || query.includes('passport') || query.includes('license') || query.includes('document')) {
    return 'documents';
  }

  if (query.includes('emergency') || query.includes('sos') || query.includes('police') || query.includes('ambulance')) {
    return 'emergency';
  }

  if (query.includes('water') || query.includes('medicine') || query.includes('sleep') || query.includes('health') || query.includes('calories')) {
    return 'health';
  }

  if (query.includes('expense') || query.includes('emi') || query.includes('sip') || query.includes('tax') || query.includes('budget')) {
    return 'finance';
  }

  if (query.includes('travel') || query.includes('hotel') || query.includes('flight') || query.includes('packing') || query.includes('visa')) {
    return 'travel';
  }

  if (query.includes('contract') || query.includes('agreement') || query.includes('nda') || query.includes('legal')) {
    return 'legal';
  }

  if (query.includes('learn') || query.includes('course') || query.includes('english') || query.includes('upsc') || query.includes('coding')) {
    return 'learning';
  }

  if (query.includes('news') || query.includes('tech news') || query.includes('market update')) {
    return 'news';
  }

  if (query.includes('memory') || query.includes('remember') || query.includes('privacy') || query.includes('settings')) {
    return 'settings';
  }

  return 'dashboard';
}
