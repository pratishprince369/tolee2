export function sanitizeText(str: string, maxLength: number = 2000): string {
  if (!str) return "";
  let clean = str.trim();
  
  // Enforce length limit
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  
  // Strip all HTML tags entirely to prevent basic XSS
  clean = clean.replace(/<[^>]*>/g, "");
  
  // Defuse inline JavaScript strings or dangerous patterns
  clean = clean.replace(/javascript:/gi, "defused-javascript:");
  
  return clean;
}

export function validateEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length < 255;
}

export function sanitizeUrl(url: string): string {
  if (!url) return "";
  const clean = url.trim();
  
  // Safe protocols only
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return encodeURI(clean);
  }
  
  return "";
}

/**
 * Advanced HTML Sanitizer for Rich Text inputs (Bios, Ad Headlines, Listings)
 * Strips script tags, script execution attributes (onload, onerror, etc.),
 * and dangerous iframe or embedding vectors.
 */
export function sanitizeHTML(html: string, maxLength: number = 5000): string {
  if (!html) return "";
  let clean = html.trim();
  
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  
  // Strip script blocks entirely
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // Strip style blocks entirely (no CSS injection)
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  
  // Strip iframe, object, embed, form, frame, head, body, html, link, meta tags
  clean = clean.replace(/<\/?(iframe|object|embed|form|frame|head|body|html|link|meta)\b[^>]*>/gi, "");
  
  // Strip events handler attributes (e.g. onload, onerror, onclick, onmouseover)
  clean = clean.replace(/\bon[a-z]+\s*=\s*(['"][^'"]*['"]|[^\s>]*)/gi, "");
  
  // Strip hrefs using javascript: protocol
  clean = clean.replace(/\bhref\s*=\s*(['"]\s*javascript:[^'"]*['"]|javascript:[^\s>]*)/gi, 'href="#"');
  
  return clean;
}

/**
 * Strict validation of file uploads
 */
export function validateFileUpload(fileName: string, fileSize: number, mimeType: string): { valid: boolean; error?: string } {
  if (!fileName || !mimeType) {
    return { valid: false, error: "Missing file details." };
  }
  
  const cleanName = fileName.toLowerCase();
  
  // Block known dangerous executable/script extensions
  const blockedExtensions = [
    ".exe", ".bat", ".sh", ".bash", ".php", ".py", ".pl", ".rb", ".js", ".ts", 
    ".msi", ".cmd", ".vbs", ".scr", ".com", ".phtml", ".jsp", ".asp", ".aspx"
  ];
  
  if (blockedExtensions.some(ext => cleanName.endsWith(ext))) {
    return { valid: false, error: "File type is blocked for security reasons." };
  }
  
  // Check MIME Types and size limits
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");
  
  if (isImage) {
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxImageSize) {
      return { valid: false, error: "Image size exceeds the 10MB limit." };
    }
  } else if (isVideo) {
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    if (fileSize > maxVideoSize) {
      return { valid: false, error: "Video size exceeds the 100MB limit." };
    }
  } else {
    // Only allow specific document mime types if needed, otherwise block
    const allowedDocTypes = [
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!allowedDocTypes.includes(mimeType)) {
      return { valid: false, error: "Unsupported file type." };
    }
    const maxDocSize = 25 * 1024 * 1024; // 25MB
    if (fileSize > maxDocSize) {
      return { valid: false, error: "Document size exceeds the 25MB limit." };
    }
  }
  
  return { valid: true };
}
