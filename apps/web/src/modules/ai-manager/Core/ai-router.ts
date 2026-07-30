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
  | 'settings';

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
