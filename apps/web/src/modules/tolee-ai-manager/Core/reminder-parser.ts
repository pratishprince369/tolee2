import { getUserDeviceTimeInfo } from './time-service';

export interface ParsedReminderResult {
  title: string;
  remindAt: Date;
  formattedTimeStr: string;
  currentTimeStr: string;
  minsOffset: number;
  isRecurring: boolean;
  recurrence?: string;
}

export function parseNaturalLanguageReminder(
  message: string,
  userDeviceISO?: string,
  userTimeZone?: string
): ParsedReminderResult {
  const timeZone = userTimeZone || 'Asia/Kolkata';
  const timeInfo = getUserDeviceTimeInfo(userDeviceISO, timeZone);
  const baseDate = timeInfo.deviceDate;
  const lower = message.toLowerCase().trim();

  let targetDate = new Date(baseDate.getTime());
  let isRecurring = false;
  let recurrence: string | undefined = undefined;
  let minsOffset = 5;

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
    minsOffset = parseInt(minMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + minsOffset * 60 * 1000);
  } else if (hourMatch && hourMatch[1]) {
    const hrs = parseInt(hourMatch[1], 10);
    minsOffset = hrs * 60;
    targetDate = new Date(baseDate.getTime() + hrs * 60 * 60 * 1000);
  } else if (secMatch && secMatch[1]) {
    const secs = parseInt(secMatch[1], 10);
    minsOffset = Math.ceil(secs / 60);
    targetDate = new Date(baseDate.getTime() + secs * 1000);
  } 
  // 3. Absolute Time of Day (e.g. "at 7 AM", "at 8:30 PM", "7 am ko", "8 baje")
  else {
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)?/);
    if (timeMatch && (lower.includes('at ') || lower.includes('am') || lower.includes('pm') || lower.includes('baje') || lower.includes('baaje') || lower.includes('ko'))) {
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
      minsOffset = Math.round((targetDate.getTime() - baseDate.getTime()) / 60000);
    } 
    // 4. Natural Context Phrases
    else if (lower.includes('tonight') || lower.includes('aaj raat')) {
      targetDate.setHours(21, 0, 0, 0);
      if (targetDate.getTime() <= baseDate.getTime()) targetDate.setDate(targetDate.getDate() + 1);
      minsOffset = Math.round((targetDate.getTime() - baseDate.getTime()) / 60000);
    } else if (lower.includes('this evening') || lower.includes('aaj shaam')) {
      targetDate.setHours(18, 0, 0, 0);
      if (targetDate.getTime() <= baseDate.getTime()) targetDate.setDate(targetDate.getDate() + 1);
      minsOffset = Math.round((targetDate.getTime() - baseDate.getTime()) / 60000);
    } else if (lower.includes('after lunch')) {
      targetDate.setHours(14, 0, 0, 0);
      if (targetDate.getTime() <= baseDate.getTime()) targetDate.setDate(targetDate.getDate() + 1);
      minsOffset = Math.round((targetDate.getTime() - baseDate.getTime()) / 60000);
    } else if (lower.includes('after office') || lower.includes('office baad')) {
      targetDate.setHours(18, 0, 0, 0);
      if (targetDate.getTime() <= baseDate.getTime()) targetDate.setDate(targetDate.getDate() + 1);
      minsOffset = Math.round((targetDate.getTime() - baseDate.getTime()) / 60000);
    } else if (lower.includes('tomorrow') || lower.includes('kal')) {
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(9, 0, 0, 0);
      minsOffset = Math.round((targetDate.getTime() - baseDate.getTime()) / 60000);
    } else {
      minsOffset = 5;
      targetDate = new Date(baseDate.getTime() + 5 * 60 * 1000);
    }
  }

  // 5. Clean Title Formatting
  let cleanTitle = message
    .replace(/remind me/gi, '')
    .replace(/reminder/gi, '')
    .replace(/wake me/gi, '')
    .replace(/call/gi, '')
    .replace(/\b(mujhe|mujho|mujhey|ke liye|dena|dijiye|karo|karne|set|ring|alarm|baad|ko|baje|me|mein|in|at|every|day|daily|weekly|do)\b/gi, '')
    .replace(/\d+\s*(min|minute|mints|hr|hour|sec|second|ghante|baaje|am|pm)/gi, '')
    .trim();

  if (!cleanTitle || cleanTitle.length < 2) cleanTitle = message;
  // Capitalize title cleanly
  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  // 6. Timezone-Aware Formatted Strings using Intl.DateTimeFormat
  const targetTimeInfo = getUserDeviceTimeInfo(targetDate.toISOString(), timeZone);
  const currentTimeInfo = getUserDeviceTimeInfo(baseDate.toISOString(), timeZone);

  return {
    title: cleanTitle,
    remindAt: targetDate,
    formattedTimeStr: targetTimeInfo.formattedTime,
    currentTimeStr: currentTimeInfo.formattedTime,
    minsOffset,
    isRecurring,
    recurrence
  };
}
