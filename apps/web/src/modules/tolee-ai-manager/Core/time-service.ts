export interface UserTimeInfo {
  deviceDate: Date;
  timeZone: string;
  formattedTime: string;
  formattedDate: string;
  formattedFull: string;
  dayOfWeek: string;
  isoString: string;
}

/**
 * Centralized Time Service for Tolee Application.
 * Converts any UTC/ISO timestamp into the user's exact device local time and timezone.
 */
export function getUserDeviceTimeInfo(
  clientISO?: string,
  timeZoneInput?: string
): UserTimeInfo {
  const timeZone = timeZoneInput || 'Asia/Kolkata';
  const deviceDate = clientISO ? new Date(clientISO) : new Date();

  // Formatters with explicit user timezone
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long'
  });

  const formattedTime = timeFormatter.format(deviceDate);
  const formattedDate = dateFormatter.format(deviceDate);
  const dayOfWeek = dayFormatter.format(deviceDate);
  const formattedFull = `${formattedTime} on ${formattedDate}`;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[TimeService] ClientISO: ${clientISO} | TimeZone: ${timeZone} | FormattedLocalTime: ${formattedFull}`);
  }

  return {
    deviceDate,
    timeZone,
    formattedTime,
    formattedDate,
    formattedFull,
    dayOfWeek,
    isoString: deviceDate.toISOString()
  };
}

/**
 * Checks if user message is asking for current time or date directly.
 */
export function isTimeOrDateQuery(message: string): boolean {
  const lower = message.toLowerCase().trim();
  const timePatterns = [
    'what time is it',
    'what time it is',
    'what is time',
    'what is the time',
    'time right now',
    'what time',
    'time now',
    'current time',
    'kya time hua hai',
    'kitne baje hain',
    'kitna time hua',
    'what is the date',
    'what is today date',
    'what is today\'s date',
    'today date',
    'current date',
    'aaj kya date hai',
    'what day is today'
  ];

  return timePatterns.some(pattern => lower.includes(pattern)) ||
         /what('s|\s+is)\s+(the\s+)?(time|date)/i.test(lower);
}
