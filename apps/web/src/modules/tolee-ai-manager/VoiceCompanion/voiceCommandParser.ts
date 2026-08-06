import { VoiceCommandIntent } from './voiceTypes';

export function parseVoiceCommand(transcript: string): VoiceCommandIntent {
  const clean = transcript.trim().toLowerCase();

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
      responseText: 'Sure! Let me check your latest notifications.'
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
      responseText: 'Opening your CRM dashboard with pending leads and follow-ups.'
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
      responseText: 'Opening your scheduled tasks and meetings.'
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
      responseText: 'Preparing your daily activity summary across Tolees, CRM, and analytics.'
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
      responseText: 'Drafting your new post with AI-generated visual copy. I will ask for your confirmation before publishing.'
    };
  }

  // 6. Search Tolees
  if (commandText.includes('search') || commandText.includes('dhoondo') || commandText.includes('find')) {
    const searchQuery = commandText.replace(/search|dhoondo|find|karo/g, '').trim();
    return {
      intent: 'SEARCH_TOLEE',
      query: searchQuery || 'Mumbai Real Estate',
      confirmationRequired: false,
      responseText: `Searching Tolee network for "${searchQuery || 'trending groups'}".`
    };
  }

  // Fallback / General Question
  return {
    intent: 'UNKNOWN',
    query: commandText,
    confirmationRequired: false,
    responseText: `I am processing your command: "${commandText}". How else can I assist you?`
  };
}
