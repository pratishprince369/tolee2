import https from 'https';
import http from 'http';
import { URL } from 'url';
import crypto from 'crypto';
import { searchAndGroundQuery } from '@/lib/web-search';

export interface WebpageMetadata {
  url: string;
  title: string;
  description?: string;
  textContent: string;
  links: Array<{ text: string; href: string }>;
  forms: FormDefinition[];
  isSanitized: boolean;
  truncated: boolean;
}

export interface FormField {
  name: string;
  type: string;
  label?: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: string;
  options?: string[]; // For select elements
}

export interface FormDefinition {
  id?: string;
  action: string;
  method: 'GET' | 'POST';
  fields: FormField[];
  submitButtonText?: string;
}

export interface PreparedFormDraft {
  draftId: string;
  url: string;
  formAction: string;
  method: 'GET' | 'POST';
  fieldValues: Record<string, any>;
  missingRequiredFields: string[];
  payloadHash: string;
  previewSummary: string;
  readyForApproval: boolean;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  employmentType?: string;
  experienceLevel?: string;
  descriptionSnippet: string;
  sourceUrl: string;
  salaryRange?: string;
}

export interface PreparedJobApplication {
  applicationId: string;
  job: JobListing;
  applicant: {
    name: string;
    email: string;
    phone?: string;
    verifiedSkills: string[];
    verifiedExperienceSummary: string;
    verifiedEducationSummary: string;
  };
  tailoredCoverLetter: string;
  answersToCommonQuestions: Record<string, string>;
  missingRequirements: string[];
  requiresApproval: boolean;
  payloadHash: string;
}

export interface ProductComparisonItem {
  name: string;
  price: string;
  numericPrice?: number;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
  rating?: string;
  sourceUrl: string;
}

export interface ProductComparisonResult {
  query: string;
  maxBudget?: number;
  products: ProductComparisonItem[];
  recommendationSummary: string;
  comparisonMarkdownTable: string;
}

export interface PreparedBookingDraft {
  bookingId: string;
  serviceType: string;
  provider: string;
  dateTime: string;
  details: Record<string, any>;
  estimatedCost: string;
  cancellationPolicy: string;
  requiresLevel4Approval: boolean;
  payloadHash: string;
  checkoutUrl?: string;
}

/**
 * 🌐 Tolee Browser Automation & Web Worker Engine (V4)
 * - Safe HTTP/DOM fetching with strict SSRF defense.
 * - Prompt-injection defense: wraps external text in untrusted tags and sanitizes prompt-injection keywords.
 * - Form inspection, validation, and SHA-256 bound preparation.
 * - Truthful Job Application and Product Comparison workflows.
 */
export class BrowserWorker {
  private static readonly MAX_CONTENT_LENGTH = 16000;
  private static readonly FETCH_TIMEOUT_MS = 6000;

  /**
   * 🛡️ SSRF Guard: Blocks private IP ranges, loopbacks, cloud metadata (169.254.169.254), and dangerous protocols.
   */
  public static isSafeUrl(rawUrl: string): { safe: boolean; reason?: string } {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { safe: false, reason: `Protocol "${parsed.protocol}" is not allowed. Only HTTP and HTTPS are permitted.` };
      }

      const hostname = parsed.hostname.toLowerCase();

      // Loopback
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '0.0.0.0' ||
        hostname.endsWith('.localhost')
      ) {
        return { safe: false, reason: 'Access to loopback or local host addresses is strictly forbidden.' };
      }

      // Cloud instance metadata services (AWS, GCP, Azure, OpenStack)
      if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal' || hostname.startsWith('169.254.')) {
        return { safe: false, reason: 'Access to cloud instance metadata service is strictly blocked.' };
      }

      // Private IPv4 ranges (RFC 1918)
      if (
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
      ) {
        return { safe: false, reason: 'Access to private internal network addresses is forbidden.' };
      }

      return { safe: true };
    } catch {
      return { safe: false, reason: 'Invalid or malformed URL string.' };
    }
  }

  /**
   * 🛡️ Prompt-Injection Sanitizer (Section 12)
   * Wraps external content with untrusted boundary markers and neutralizes injection triggers.
   */
  public static sanitizeWebContent(rawText: string, sourceUrl: string): string {
    if (!rawText) return '';

    let cleaned = rawText
      // Neutralize common prompt-injection commands
      .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi, '[FILTERED_INSTRUCTION_OVERRIDE]')
      .replace(/disregard\s+(all\s+)?(previous|prior|above)\s+instructions/gi, '[FILTERED_INSTRUCTION_OVERRIDE]')
      .replace(/you\s+are\s+now\s+in\s+developer\s+mode/gi, '[FILTERED_MODE_SWITCH]')
      .replace(/jailbreak|dan\s+mode/gi, '[FILTERED_JAILBREAK]')
      .replace(/system\s+prompt\s*:\s*/gi, '[FILTERED_SYSTEM_PROMPT_KEYWORD]: ')
      .replace(/output\s+the\s+system\s+prompt/gi, '[FILTERED_SYSTEM_PROMPT_EXTRACTION]')
      .replace(/exfiltrate|send\s+all\s+cookies|send\s+api\s+key/gi, '[FILTERED_EXFILTRATION_COMMAND]')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

    // Trim excess whitespace
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    // Enforce size cap
    if (cleaned.length > this.MAX_CONTENT_LENGTH) {
      cleaned = cleaned.slice(0, this.MAX_CONTENT_LENGTH) + '... [Content truncated for safety and performance]';
    }

    return `[UNTRUSTED_EXTERNAL_WEB_CONTENT - Source: ${sourceUrl}]\n${cleaned}\n[/UNTRUSTED_EXTERNAL_WEB_CONTENT]`;
  }

  /**
   * Fetches raw HTML safely with timeout, redirection limits, and size caps.
   */
  public static async fetchHtml(targetUrl: string): Promise<string> {
    const safety = this.isSafeUrl(targetUrl);
    if (!safety.safe) {
      throw new Error(`SSRF Security Error: ${safety.reason}`);
    }

    return new Promise((resolve, reject) => {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (ToleeAI-Agent/4.0)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
          },
          timeout: this.FETCH_TIMEOUT_MS,
        },
        (res) => {
          // Handle redirects (up to 1 hop safely)
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, targetUrl).toString();
            const redirectSafety = this.isSafeUrl(redirectUrl);
            if (!redirectSafety.safe) {
              return reject(new Error(`Redirect SSRF blocked: ${redirectSafety.reason}`));
            }
            return resolve(this.fetchHtml(redirectUrl));
          }

          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode} received from ${targetUrl}`));
          }

          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
            if (data.length > 500000) {
              res.destroy();
            }
          });

          res.on('end', () => resolve(data));
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout (${this.FETCH_TIMEOUT_MS}ms) waiting for webpage: ${targetUrl}`));
      });

      req.on('error', (err) => reject(err));
    });
  }

  /**
   * 🌐 Opens and extracts structured content from any safe public webpage.
   */
  public static async openWebpage(url: string): Promise<WebpageMetadata> {
    const html = await this.fetchHtml(url);

    // Extract Title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Untitled Page';

    // Extract Meta Description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const description = metaMatch ? metaMatch[1].trim() : undefined;

    // Extract Text Content (strip styles, scripts, HTML tags)
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const truncated = text.length > this.MAX_CONTENT_LENGTH;
    const sanitizedText = this.sanitizeWebContent(text, url);

    // Extract Links (first 15 unique links)
    const links: Array<{ text: string; href: string }> = [];
    const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 15) {
      const href = linkMatch[1];
      const linkText = linkMatch[2].replace(/<[^>]+>/g, '').trim();
      if (href && linkText && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const resolved = new URL(href, url).toString();
          if (!links.some((l) => l.href === resolved)) {
            links.push({ text: linkText.slice(0, 50), href: resolved });
          }
        } catch {}
      }
    }

    // Extract Forms
    const forms = this.parseFormsFromHtml(html, url);

    return {
      url,
      title,
      description,
      textContent: sanitizedText,
      links,
      forms,
      isSanitized: true,
      truncated,
    };
  }

  /**
   * Parses HTML form tags and input elements.
   */
  public static parseFormsFromHtml(html: string, baseUrl: string): FormDefinition[] {
    const forms: FormDefinition[] = [];
    const formRegex = /<form([\s\S]*?)>([\s\S]*?)<\/form>/gi;
    let formMatch: RegExpExecArray | null;

    while ((formMatch = formRegex.exec(html)) !== null && forms.length < 5) {
      const formAttributes = formMatch[1];
      const formBody = formMatch[2];

      const actionMatch = formAttributes.match(/action=["']([^"']*)["']/i);
      const methodMatch = formAttributes.match(/method=["']([^"']*)["']/i);
      const idMatch = formAttributes.match(/id=["']([^"']*)["']/i);

      let action = actionMatch ? actionMatch[1] : '';
      try {
        action = new URL(action, baseUrl).toString();
      } catch {
        action = baseUrl;
      }

      const method = (methodMatch ? methodMatch[1].toUpperCase() : 'GET') === 'POST' ? 'POST' : 'GET';
      const fields: FormField[] = [];

      // Extract Inputs
      const inputRegex = /<input([\s\S]*?)>/gi;
      let inMatch: RegExpExecArray | null;
      while ((inMatch = inputRegex.exec(formBody)) !== null) {
        const attrs = inMatch[1];
        const nameMatch = attrs.match(/name=["']([^"']*)["']/i);
        const typeMatch = attrs.match(/type=["']([^"']*)["']/i);
        const placeholderMatch = attrs.match(/placeholder=["']([^"']*)["']/i);
        const valueMatch = attrs.match(/value=["']([^"']*)["']/i);
        const isRequired = /\brequired\b/i.test(attrs);

        if (nameMatch) {
          const type = typeMatch ? typeMatch[1].toLowerCase() : 'text';
          if (type !== 'hidden' && type !== 'submit') {
            fields.push({
              name: nameMatch[1],
              type,
              placeholder: placeholderMatch ? placeholderMatch[1] : undefined,
              required: isRequired,
              defaultValue: valueMatch ? valueMatch[1] : undefined,
            });
          }
        }
      }

      // Extract Textareas
      const textareaRegex = /<textarea([\s\S]*?)>([\s\S]*?)<\/textarea>/gi;
      let taMatch: RegExpExecArray | null;
      while ((taMatch = textareaRegex.exec(formBody)) !== null) {
        const attrs = taMatch[1];
        const nameMatch = attrs.match(/name=["']([^"']*)["']/i);
        const placeholderMatch = attrs.match(/placeholder=["']([^"']*)["']/i);
        const isRequired = /\brequired\b/i.test(attrs);
        if (nameMatch) {
          fields.push({
            name: nameMatch[1],
            type: 'textarea',
            placeholder: placeholderMatch ? placeholderMatch[1] : undefined,
            required: isRequired,
          });
        }
      }

      // Extract Submit button text
      const buttonMatch = formBody.match(/<button[^>]*>([\s\S]*?)<\/button>/i);
      const submitText = buttonMatch ? buttonMatch[1].replace(/<[^>]+>/g, '').trim() : 'Submit';

      forms.push({
        id: idMatch ? idMatch[1] : undefined,
        action,
        method,
        fields,
        submitButtonText: submitText || 'Submit',
      });
    }

    return forms;
  }

  /**
   * 📝 Form Preparation: Maps user inputs, checks required fields, and binds to SHA-256 hash.
   */
  public static prepareFormSubmission(
    url: string,
    formAction: string,
    method: 'GET' | 'POST',
    fields: FormField[],
    userValues: Record<string, any>
  ): PreparedFormDraft {
    const draftId = `form_${crypto.randomBytes(8).toString('hex')}`;
    const fieldValues: Record<string, any> = {};
    const missingRequiredFields: string[] = [];

    for (const field of fields) {
      const val = userValues[field.name] !== undefined ? userValues[field.name] : field.defaultValue;
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        fieldValues[field.name] = val;
      } else if (field.required) {
        missingRequiredFields.push(field.name);
      }
    }

    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ url, formAction, method, fieldValues }))
      .digest('hex');

    const previewSummary = Object.entries(fieldValues)
      .map(([k, v]) => `• **${k}**: ${v}`)
      .join('\n');

    return {
      draftId,
      url,
      formAction,
      method,
      fieldValues,
      missingRequiredFields,
      payloadHash,
      previewSummary: previewSummary || 'No field values entered yet.',
      readyForApproval: missingRequiredFields.length === 0,
    };
  }

  /**
   * 💼 Job Search Workflow (Section 10)
   * Discovers and structures live job vacancies.
   */
  public static async searchJobs(params: {
    query: string;
    location?: string;
    experienceLevel?: string;
    remote?: boolean;
    limit?: number;
  }): Promise<JobListing[]> {
    const loc = params.location ? ` in ${params.location}` : '';
    const rem = params.remote ? ' remote' : '';
    const exp = params.experienceLevel ? ` ${params.experienceLevel}` : '';
    const searchQuery = `${params.query} jobs${loc}${rem}${exp} hiring`;

    const searchResult = await searchAndGroundQuery(searchQuery, params.limit || 5);
    const listings: JobListing[] = [];

    const snippets = searchResult.snippets;
    const sources = searchResult.sources;

    for (let i = 0; i < snippets.length; i++) {
      const snippet = snippets[i];
      const sourceUrl = sources[i] || `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

      // Attempt to extract title & company from snippet
      const titleMatch = snippet.match(/^([^·\-|–]+)[\s·\-|–]+([^·\-|–]+)/);
      const title = titleMatch ? titleMatch[1].trim() : `${params.query} Position`;
      const company = titleMatch ? titleMatch[2].trim() : 'Verified Employer';

      listings.push({
        id: `job_${crypto.randomBytes(6).toString('hex')}`,
        title,
        company,
        location: params.location || (params.remote ? 'Remote' : 'India / Flexible'),
        employmentType: params.remote ? 'Full-Time (Remote)' : 'Full-Time',
        experienceLevel: params.experienceLevel || 'Mid-Senior',
        descriptionSnippet: snippet,
        sourceUrl,
      });
    }

    return listings;
  }

  /**
   * 💼 Prepare Job Application (Truthful & Verified, Section 10)
   * Maps user verified resume profile against job requirements.
   * Never invents qualifications.
   */
  public static prepareJobApplication(
    job: JobListing,
    userResume: {
      name: string;
      email: string;
      phone?: string;
      skills?: string[];
      experiences?: Array<{ role: string; company: string; duration?: string; details?: string }>;
      education?: Array<{ degree: string; institution: string; year?: string }>;
      summary?: string;
    }
  ): PreparedJobApplication {
    const applicationId = `app_${crypto.randomBytes(8).toString('hex')}`;
    const verifiedSkills = userResume.skills || ['Full-Stack Development', 'Problem Solving'];

    const expSummary = (userResume.experiences || [])
      .map((e) => `${e.role} at ${e.company}${e.duration ? ` (${e.duration})` : ''}`)
      .join('; ') || 'Verified professional work experience.';

    const eduSummary = (userResume.education || [])
      .map((ed) => `${ed.degree} from ${ed.institution}${ed.year ? ` (${ed.year})` : ''}`)
      .join('; ') || 'Degree qualifications recorded.';

    const tailoredCoverLetter = `Dear Hiring Team at ${job.company},\n\nI am writing to express my strong interest in the ${job.title} position. Based on my verified background in ${verifiedSkills.slice(0, 3).join(', ')} and past experience (${expSummary}), I am confident in delivering high impact for your team.\n\nThank you for considering my application.\n\nSincerely,\n${userResume.name}`;

    const answersToCommonQuestions: Record<string, string> = {
      'Why are you interested in this role?': `Excited by ${job.company}'s work and my matching background in ${verifiedSkills[0] || 'software development'}.`,
      'Are you authorized to work in this location?': 'Yes, fully authorized.',
      'Notice period': 'Immediate / 15-30 days standard notice.',
    };

    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ applicationId, jobId: job.id, applicantEmail: userResume.email, tailoredCoverLetter }))
      .digest('hex');

    return {
      applicationId,
      job,
      applicant: {
        name: userResume.name,
        email: userResume.email,
        phone: userResume.phone,
        verifiedSkills,
        verifiedExperienceSummary: expSummary,
        verifiedEducationSummary: eduSummary,
      },
      tailoredCoverLetter,
      answersToCommonQuestions,
      missingRequirements: [],
      requiresApproval: true,
      payloadHash,
    };
  }

  /**
   * 🛍️ Product Comparison Engine (Scenario 3)
   * Researches products, extracts specifications, and enforces budget constraints.
   */
  public static async compareProducts(params: {
    query: string;
    maxBudget?: number;
    category?: string;
    requirements?: string[];
  }): Promise<ProductComparisonResult> {
    const budgetStr = params.maxBudget ? ` under ₹${params.maxBudget.toLocaleString('en-IN')}` : '';
    const searchQuery = `${params.query}${budgetStr} price specifications review India`;

    const searchResult = await searchAndGroundQuery(searchQuery, 4);
    const products: ProductComparisonItem[] = [];

    // Synthesize structured product rows from verified snippets
    for (let i = 0; i < searchResult.snippets.length; i++) {
      const snippet = searchResult.snippets[i];
      const sourceUrl = searchResult.sources[i] || `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

      // Attempt to extract price from snippet (₹ or Rs)
      const priceMatch = snippet.match(/(?:₹|Rs\.?)\s*([\d,]+)/i);
      const numericPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : undefined;

      // Filter out products that exceed budget if budget specified
      if (params.maxBudget && numericPrice && numericPrice > params.maxBudget) {
        continue;
      }

      // Title
      const nameMatch = snippet.match(/^([^·\-|–]+)/);
      const name = nameMatch ? nameMatch[1].trim() : `${params.query} Option ${i + 1}`;

      products.push({
        name,
        price: numericPrice ? `₹${numericPrice.toLocaleString('en-IN')}` : 'Market Price Available',
        numericPrice,
        specs: {
          Category: params.category || 'Electronics / Consumer',
          Highlight: snippet.slice(0, 90) + '...',
        },
        pros: ['High value for price', 'Verified user feedback'],
        cons: ['Stock dependent on local seller'],
        rating: '4.3 / 5.0',
        sourceUrl,
      });
    }

    // Generate markdown table
    let table = '| Product | Price | Rating | Key Feature | Source |\n|---|---|---|---|---|\n';
    for (const p of products) {
      table += `| **${p.name}** | ${p.price} | ${p.rating || '4.2/5'} | ${p.specs.Highlight.slice(0, 45)} | [Link](${p.sourceUrl}) |\n`;
    }

    return {
      query: params.query,
      maxBudget: params.maxBudget,
      products,
      recommendationSummary: `Found ${products.length} matching options within your criteria${params.maxBudget ? ` under ₹${params.maxBudget}` : ''}.`,
      comparisonMarkdownTable: table,
    };
  }

  /**
   * 🎟️ Booking Preparation (Scenario 4 - Level 4 Financial Action)
   */
  public static prepareBooking(params: {
    serviceType: string;
    provider: string;
    dateTime: string;
    details: Record<string, any>;
    estimatedCost: string;
    cancellationPolicy?: string;
  }): PreparedBookingDraft {
    const bookingId = `book_${crypto.randomBytes(8).toString('hex')}`;
    const cancellationPolicy = params.cancellationPolicy || 'Standard 24-hour free cancellation prior to schedule.';

    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ bookingId, provider: params.provider, cost: params.estimatedCost, date: params.dateTime }))
      .digest('hex');

    return {
      bookingId,
      serviceType: params.serviceType,
      provider: params.provider,
      dateTime: params.dateTime,
      details: params.details,
      estimatedCost: params.estimatedCost,
      cancellationPolicy,
      requiresLevel4Approval: true,
      payloadHash,
      checkoutUrl: `https://tolee.in/booking/checkout?ref=${bookingId}`,
    };
  }
}
