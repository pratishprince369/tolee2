export interface ParsedReminderResult {
  title: string;
  remindAt: Date;
  formattedTimeStr: string;
  isRecurring: boolean;
  recurrence?: string;
}

export function parseNaturalLanguageReminder(
  message: string,
  userDeviceISO?: string,
  userTimeZone?: string
): ParsedReminderResult {
  const baseDate = userDeviceISO ? new Date(userDeviceISO) : new Date();
  const lower = message.toLowerCase().trim();

  let targetDate = new Date(baseDate.getTime());
  let isRecurring = false;
  let recurrence: string | undefined = undefined;

  // 1. Check Recurring Rules
  if (lower.includes('every day') || lower.includes('daily') || lower.includes('har roz') || lower.includes('rozana')) {
    isRecurring = true;
    recurrence = 'daily';
  } else if (lower.includes('every week') || lower.includes('weekly')) {
    isRecurring = true;
    recurrence = 'weekly';
  } else if (lower.includes('every month') || lower.includes('monthly')) {
    isRecurring = true;
    recurrence = 'monthly';
  } else if (lower.includes('every year') || lower.includes('yearly')) {
    isRecurring = true;
    recurrence = 'yearly';
  } else if (lower.includes('every monday') || lower.includes('har somwar')) {
    isRecurring = true;
    recurrence = 'EVERY_MONDAY';
  }

  // 2. Relative Minutes/Hours/Seconds Parser
  const minMatch = lower.match(/(\d+)\s*(min|minute|mints|m)\b/);
  const hourMatch = lower.match(/(\d+)\s*(hour|hr|h|ghante|ghanta)\b/);
  const secMatch = lower.match(/(\d+)\s*(sec|second|s)\b/);

  if (minMatch && minMatch[1]) {
    const mins = parseInt(minMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + mins * 60 * 1000);
  } else if (hourMatch && hourMatch[1]) {
    const hrs = parseInt(hourMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + hrs * 60 * 60 * 1000);
  } else if (secMatch && secMatch[1]) {
    const secs = parseInt(secMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + secs * 1000);
  } 
  // 3. Absolute Time of Day (e.g. "at 7 AM", "at 8:30 PM", "7 am ko")
  else {
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch && (lower.includes('at ') || lower.includes('am') || lower.includes('pm') || lower.includes('baaje') || lower.includes('ko'))) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3];

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      targetDate.setHours(hours, minutes, 0, 0);

      // If time has already passed today, set for tomorrow
      if (targetDate.getTime() <= baseDate.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    } 
    // 4. Natural Context Phrases
    else if (lower.includes('tonight') || lower.includes('aaj raat')) {
      targetDate.setHours(21, 0, 0, 0);
      if (targetDate.getTime() <= baseDate.getTime()) targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes('this evening') || lower.includes('aaj shaam')) {
      targetDate.setHours(18, 0, 0, 0);
      if (targetDate.getTime() <= baseDate.getTime()) targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes('after lunch')) {
      targetDate.setHours(14, 0, 0, 0);
      if (targetDate.getTime() <= baseDate.getTime()) targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes('after office') || lower.includes('office baad')) {
      targetDate.setHours(18, 0, 0, 0);
      if (targetDate.getTime() <= baseDate.getTime()) targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes('tomorrow') || lower.includes('kal')) {
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(9, 0, 0, 0); // Default 9 AM tomorrow if no specific time given
    } else {
      // Fallback: 5 minutes from now if no time pattern detected
      targetDate = new Date(baseDate.getTime() + 5 * 60 * 1000);
    }
  }

  // Format title
  let cleanTitle = message
    .replace(/remind me/gi, '')
    .replace(/reminder/gi, '')
    .replace(/wake me/gi, '')
    .replace(/call/gi, '')
    .replace(/\b(in|at|me|mujhe|ke liye|dena|karo|set|phone ring karake|like alaram|alarm|baad|ko|every|day|daily|weekly)\b/gi, '')
    .replace(/\d+\s*(min|minute|hr|hour|sec|second|ghante|baaje|am|pm)/gi, '')
    .trim();

  if (!cleanTitle || cleanTitle.length < 2) cleanTitle = message;

  const formattedTimeStr = targetDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  return {
    title: cleanTitle,
    remindAt: targetDate,
    formattedTimeStr,
    isRecurring,
    recurrence
  };
}
