import { SECURITY_CONFIG } from './security-config';

export function sanitizeText(str: string, maxLength: number = SECURITY_CONFIG.INPUT_BOUNDS.MAX_COMMENT_LENGTH): string {
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
 * Sanitizes a filename to prevent Path Traversal attacks (../, null bytes, control characters)
 */
export function sanitizeFilename(fileName: string): string {
  if (!fileName) return "upload";
  
  // Remove null bytes, path traversal sequences, and backslashes/slashes
  let clean = fileName
    .replace(/\0/g, '')
    .replace(/(\.\.[\/\\])+/g, '')
    .replace(/[\/\\]/g, '_')
    .replace(/[^\w.-]/g, '_');

  // Avoid hidden files or trailing dots
  clean = clean.replace(/^\.+/, 'file_');
  return clean.substring(0, 100);
}

/**
 * Verifies magic-byte file signatures to ensure file content matches claimed type
 */
export function validateBufferMagicBytes(
  buffer: Buffer,
  mimeType?: string
): { valid: boolean; error?: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: 'Empty or corrupted file buffer.' };
  }

  const headerHex = buffer.subarray(0, 12).toString('hex').toLowerCase();

  // JPEG: FF D8 FF
  const isJpeg = headerHex.startsWith('ffd8ff');
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng = headerHex.startsWith('89504e470d0a1a0a');
  // GIF: 47 49 46 38 (GIF8)
  const isGif = headerHex.startsWith('47494638');
  // WebP: RIFF (52 49 46 46) ... WEBP (57 45 42 50)
  const isWebp = headerHex.startsWith('52494646') && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  // PDF: %PDF (25 50 44 46)
  const isPdf = headerHex.startsWith('25504446');
  // MP4 / MOV / M4V / QuickTime: 'ftyp' or 'moov' at offset 4
  const isMp4 = buffer.length >= 8 && (
    buffer.subarray(4, 8).toString('ascii') === 'ftyp' ||
    buffer.subarray(4, 8).toString('ascii') === 'moov' ||
    buffer.subarray(0, 4).toString('ascii') === 'moov'
  );
  // Audio: ID3 tag or MP3 frame sync (FF FB / FF F3 / FF F2 / OggS / fLaC / RIFF WAVE)
  const isAudio = headerHex.startsWith('494433') || // ID3
                  headerHex.startsWith('fffb') ||
                  headerHex.startsWith('fff3') ||
                  headerHex.startsWith('fff2') ||
                  headerHex.startsWith('4f676753') || // OggS
                  headerHex.startsWith('664c6143') || // fLaC
                  (headerHex.startsWith('52494646') && buffer.subarray(8, 12).toString('ascii') === 'WAVE');

  // Zip / Office OpenXML (.docx, .xlsx, .pptx, .zip): PK\x03\x04 (50 4b 03 04)
  const isZipOrOffice = headerHex.startsWith('504b0304');
  // Legacy Office Doc (.doc, .xls, .ppt): D0 CF 11 E0
  const isLegacyOffice = headerHex.startsWith('d0cf11e0');
  // 7z archive: 37 7A BC AF 27 1C
  const is7z = headerHex.startsWith('377abcaf271c');
  // RAR archive: 52 61 72 21 (Rar!)
  const isRar = headerHex.startsWith('52617221');
  // Plaintext / RTF / generic text check
  const isTextOrRtf = headerHex.startsWith('7b5c727466') || buffer.subarray(0, 100).every(b => (b >= 9 && b <= 13) || (b >= 32 && b <= 126) || b >= 128);

  // SVG inspection: if it's text/xml/svg, block if contains script tags or javascript protocols
  if (mimeType?.includes('svg') || buffer.subarray(0, 100).toString('utf8').toLowerCase().includes('<svg')) {
    const svgContent = buffer.toString('utf8').toLowerCase();
    if (
      svgContent.includes('<script') ||
      svgContent.includes('javascript:') ||
      svgContent.includes('onload=') ||
      svgContent.includes('onerror=') ||
      svgContent.includes('<foreignobject')
    ) {
      return { valid: false, error: 'SVG contains disallowed active scripts or event handlers.' };
    }
    return { valid: true };
  }

  // If MIME is specified, enforce matching magic bytes
  if (mimeType) {
    if (mimeType.startsWith('image/jpeg') && !isJpeg) {
      return { valid: false, error: 'File content does not match JPEG signature.' };
    }
    if (mimeType.startsWith('image/png') && !isPng) {
      return { valid: false, error: 'File content does not match PNG signature.' };
    }
    if (mimeType.startsWith('image/gif') && !isGif) {
      return { valid: false, error: 'File content does not match GIF signature.' };
    }
    if (mimeType.startsWith('image/webp') && !isWebp) {
      return { valid: false, error: 'File content does not match WebP signature.' };
    }
    if (mimeType.includes('pdf') && !isPdf) {
      return { valid: false, error: 'File content does not match PDF signature.' };
    }
  }

  // General validity check
  const hasRecognizedSignature = isJpeg || isPng || isGif || isWebp || isPdf || isMp4 || isAudio || isZipOrOffice || isLegacyOffice || is7z || isRar || isTextOrRtf;
  return { valid: hasRecognizedSignature };
}

/**
 * Strict validation of file uploads
 */
export function validateFileUpload(
  fileName: string,
  fileSize: number,
  mimeType: string,
  buffer?: Buffer
): { valid: boolean; error?: string } {
  if (!fileName || !mimeType) {
    return { valid: false, error: "Missing file details." };
  }
  
  const cleanName = fileName.toLowerCase();
  
  // Block known dangerous executable/script extensions
  const blockedExtensions = [
    ".exe", ".bat", ".sh", ".bash", ".php", ".py", ".pl", ".rb", ".js", ".ts", 
    ".msi", ".cmd", ".vbs", ".scr", ".com", ".phtml", ".jsp", ".asp", ".aspx",
    ".cgi", ".jar", ".war", ".ps1", ".vbe", ".wsf", ".hta"
  ];
  
  if (blockedExtensions.some(ext => cleanName.endsWith(ext))) {
    return { valid: false, error: "File type is blocked for security reasons." };
  }
  
  // Check MIME Types and size limits using SECURITY_CONFIG
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  
  if (isImage) {
    if (fileSize > SECURITY_CONFIG.UPLOAD_LIMITS.IMAGE_MAX_SIZE) {
      return { valid: false, error: `Image size exceeds the ${SECURITY_CONFIG.UPLOAD_LIMITS.IMAGE_MAX_SIZE / (1024 * 1024)}MB limit.` };
    }
  } else if (isVideo) {
    if (fileSize > SECURITY_CONFIG.UPLOAD_LIMITS.VIDEO_MAX_SIZE) {
      return { valid: false, error: `Video size exceeds the ${SECURITY_CONFIG.UPLOAD_LIMITS.VIDEO_MAX_SIZE / (1024 * 1024)}MB limit.` };
    }
  } else if (isAudio) {
    if (fileSize > SECURITY_CONFIG.UPLOAD_LIMITS.AUDIO_MAX_SIZE) {
      return { valid: false, error: `Audio size exceeds the ${SECURITY_CONFIG.UPLOAD_LIMITS.AUDIO_MAX_SIZE / (1024 * 1024)}MB limit.` };
    }
  } else {
    // Allowed document, presentation, spreadsheet, text, and archive mime types
    const allowedDocTypes = [
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "text/rtf",
      "application/rtf",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-7z-compressed",
      "application/x-rar-compressed",
      "application/x-tar",
      "application/gzip",
      "application/octet-stream"
    ];
    const isDocExtension = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|csv|zip|rar|7z|tar|gz)$/i.test(cleanName);
    if (!allowedDocTypes.includes(mimeType) && !isDocExtension) {
      return { valid: false, error: "Unsupported file format." };
    }
    if (fileSize > SECURITY_CONFIG.UPLOAD_LIMITS.DOC_MAX_SIZE) {
      return { valid: false, error: `Document size exceeds the ${SECURITY_CONFIG.UPLOAD_LIMITS.DOC_MAX_SIZE / (1024 * 1024)}MB limit.` };
    }
  }

  // Optional buffer verification if buffer was supplied
  if (buffer) {
    const magicCheck = validateBufferMagicBytes(buffer, mimeType);
    if (!magicCheck.valid && magicCheck.error) {
      return magicCheck;
    }
  }
  
  return { valid: true };
}
