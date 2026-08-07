import { VoiceCommandIntent } from './voiceTypes';

export interface ParsedVoiceResult extends VoiceCommandIntent {
  detectedLang: 'hi-IN' | 'mr-IN' | 'en-IN';
}

export function parseVoiceCommand(transcript: string): ParsedVoiceResult {
  const clean = transcript.trim().toLowerCase();

  // Language Detection heuristic
  const isHindi = /batao|karo|kholo|padho|aaj|dikhao|banao|kaise|kya|hoga|namaste|meri|aawaz|bolo|suno|kuch|nahi|tumhari|aaj/i.test(clean) || /[\u0900-\u097F]/.test(transcript);
  const isMarathi = /sang|dakhva|aajche|kasa|kiti|kay|shuru|sangto/i.test(clean);
  const lang: 'hi-IN' | 'mr-IN' | 'en-IN' = isMarathi ? 'mr-IN' : isHindi ? 'hi-IN' : 'en-IN';

  // Strip Wake Words if present
  const wakeWords = ['hey tolee', 'tolee,', 'tolee', 'ok tolee', 'okey tolee'];
  let commandText = clean;
  for (const w of wakeWords) {
    if (commandText.startsWith(w)) {
      commandText = commandText.replace(w, '').trim();
      break;
    }
  }

  // 1. Read Notifications
  if (
    commandText.includes('notification') || 
    commandText.includes('message padho') || 
    commandText.includes('kya naya hai') || 
    commandText.includes('read my update')
  ) {
    return {
      intent: 'READ_NOTIFICATIONS',
      confirmationRequired: false,
      responseText: lang === 'hi-IN' 
        ? 'Ji bilkul! Main aapke naye notifications check karke batata hoon.'
        : lang === 'mr-IN'
        ? 'Ho nakki! Mi tumche nave notifications तपासून sangto.'
        : 'Sure! Let me check your latest notifications.',
      detectedLang: lang
    };
  }

  // 2. Open CRM / Leads
  if (
    commandText.includes('crm') || 
    commandText.includes('lead') || 
    commandText.includes('enquiry') || 
    commandText.includes('prospect')
  ) {
    return {
      intent: 'OPEN_MODULE',
      targetModule: 'crm',
      confirmationRequired: false,
      responseText: lang === 'hi-IN'
        ? 'Aapka CRM Dashboard khol raha hoon jahan aapke pending leads hain.'
        : lang === 'mr-IN'
        ? 'Tumce CRM Dashboard ughadat ahe.'
        : 'Opening your CRM dashboard with pending leads.',
      detectedLang: lang
    };
  }

  // 3. Open Tasks / Planner / Calendar
  if (
    commandText.includes('task') || 
    commandText.includes('planner') || 
    commandText.includes('schedule') || 
    commandText.includes('alarm') || 
    commandText.includes('meeting')
  ) {
    return {
      intent: 'OPEN_MODULE',
      targetModule: commandText.includes('meeting') || commandText.includes('calendar') ? 'calendar' : 'tasks',
      confirmationRequired: false,
      responseText: lang === 'hi-IN'
        ? 'Aapke scheduled tasks aur meetings ki list open kar raha hoon.'
        : lang === 'mr-IN'
        ? 'Tumche scheduled kam ughadat ahe.'
        : 'Opening your scheduled tasks and meetings.',
      detectedLang: lang
    };
  }

  // 4. Summarize Today's Activity
  if (
    commandText.includes('summarize') || 
    commandText.includes('summary') || 
    commandText.includes('aaj ka report') || 
    commandText.includes('daily update')
  ) {
    return {
      intent: 'SUMMARIZE_ACTIVITY',
      confirmationRequired: false,
      responseText: lang === 'hi-IN'
        ? 'Aapka aaj ka Tolee, CRM aur engagement report summary tayar kar raha hoon.'
        : lang === 'mr-IN'
        ? 'Aajcha daily report summary tayar karat ahe.'
        : 'Preparing your daily activity summary across Tolees, CRM, and analytics.',
      detectedLang: lang
    };
  }

  // 5. Create Content / Post / Reel
  if (
    commandText.includes('post') || 
    commandText.includes('reel') || 
    commandText.includes('banner') || 
    commandText.includes('create ad') || 
    commandText.includes('good morning')
  ) {
    return {
      intent: 'CREATE_CONTENT',
      query: commandText,
      confirmationRequired: true,
      responseText: lang === 'hi-IN'
        ? 'Aapke liye AI image poster aur caption draft kar raha hoon. Publish karne se pehele aapki permission loonga.'
        : lang === 'mr-IN'
        ? 'Nave post tayar karat ahe. Publish karnya aadhi tumchi khatri ghein.'
        : 'Drafting your new post with AI-generated visual copy.',
      detectedLang: lang
    };
  }

  // 6. Search Tolees
  if (commandText.includes('search') || commandText.includes('dhoondo') || commandText.includes('find')) {
    const searchQuery = commandText.replace(/search|dhoondo|find|karo/g, '').trim();
    return {
      intent: 'SEARCH_TOLEE',
      query: searchQuery || 'Mumbai Real Estate',
      confirmationRequired: false,
      responseText: lang === 'hi-IN'
        ? `Tolee network par "${searchQuery || 'trending groups'}" dhoondh raha hoon.`
        : `Searching Tolee network for "${searchQuery || 'trending groups'}".`,
      detectedLang: lang
    };
  }

  // Fallback / General Question
  return {
    intent: 'UNKNOWN',
    query: commandText,
    confirmationRequired: false,
    responseText: lang === 'hi-IN'
      ? `Main aapke is instruction par kaam kar raha hoon: "${commandText}". Main aur kya help karoon?`
      : lang === 'mr-IN'
      ? `Mi tumcha message samajhlo: "${commandText}".`
      : `I am processing your command: "${commandText}". How else can I assist you?`,
    detectedLang: lang
  };
}
