export const isBotName = (str: string): boolean => {
  const trimmed = str.trim();
  if (!trimmed) return false;
  if (!trimmed.includes(' ')) {
    const len = trimmed.length;
    if (len >= 12) {
      let midUpperCount = 0;
      for (let i = 1; i < len; i++) {
        const code = trimmed.charCodeAt(i);
        if (code >= 65 && code <= 90) midUpperCount++;
      }
      if (midUpperCount >= 2) return true;
      
      const vowels = (trimmed.match(/[aeiouy]/gi) || []).length;
      if (vowels / len < 0.23) return true;

      if (/[^aeiouy\s\d\W]{5,}/i.test(trimmed)) return true;
    }
  }
  return false;
};

export const checkBotStatus = (email: string, name: string): boolean => {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.toLowerCase().trim();
  const prefix = cleanEmail.split('@')[0] || '';
  
  const botKeywords = process.env.NODE_ENV === 'production'
    ? ['bot', 'temp', 'fake', 'spam', 'qa-', 'qa_', 'test-', 'test_']
    : ['bot', 'temp', 'fake', 'spam'];
    
  const namePatterns = process.env.NODE_ENV === 'production'
    ? ['blocked user', 'forgot password user', 'e2e otp user', 'otp user']
    : [];

  const dotCount = (prefix.match(/\./g) || []).length;

  return (
    dotCount >= 3 ||
    isBotName(name) ||
    botKeywords.some(k => prefix.includes(k) || cleanName.includes(k)) ||
    namePatterns.some(p => cleanName.includes(p))
  );
};
