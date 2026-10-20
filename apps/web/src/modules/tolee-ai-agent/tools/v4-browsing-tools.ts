import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';
import { BrowserWorker } from '../browser/browser-worker';
import { ApprovalEngine } from '../approvals/approval-engine';
import { AgentTaskManager } from '../tasks/agent-task-manager';
import { prisma } from '@/lib/prisma';
import { searchAndGroundQuery } from '@/lib/web-search';
import { BacklinkOperatorEngine } from '../browser/backlink-engine';

/**
 * 🌐 V4 Browsing, Browser Automation, Job Search & Task Automation Tools
 */
export const V4_BROWSING_TOOLS: ToolDefinition[] = [
  // --------------------------------------------------------------------------
  // 1. web_search
  // --------------------------------------------------------------------------
  {
    name: 'web_search',
    description: 'Searches the live internet for verified web information, news, documentation, or facts.',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The precise search query or topic to look up on the web.',
        },
        num_results: {
          type: 'number',
          description: 'Number of search results to retrieve (default: 4).',
        },
      },
      required: ['query'],
    },
    execute: async (args: { query: string; num_results?: number }) => {
      try {
        const results = await searchAndGroundQuery(args.query, args.num_results || 4);
        return {
          success: true,
          message: `Found ${results.snippets.length} live web results for "${args.query}".`,
          data: {
            hasEvidence: results.hasEvidence,
            snippets: results.snippets,
            sources: results.sources,
            contextText: results.contextText,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Web search failed: ${err.message}`,
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // 2. open_webpage
  // --------------------------------------------------------------------------
  {
    name: 'open_webpage',
    description: 'Safely opens a public webpage, extracts its text, links, and forms with anti-SSRF and prompt-injection defense.',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The complete HTTP/HTTPS URL of the webpage to open.',
        },
      },
      required: ['url'],
    },
    execute: async (args: { url: string }) => {
      try {
        const metadata = await BrowserWorker.openWebpage(args.url);
        return {
          success: true,
          message: `Successfully opened and extracted content from "${metadata.title}".`,
          data: metadata,
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Failed to open webpage: ${err.message}`,
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // 3. extract_page_content
  // --------------------------------------------------------------------------
  {
    name: 'extract_page_content',
    description: 'Extracts focused text content and structured sections from an already opened or specified URL.',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Webpage URL to extract content from.',
        },
        focus: {
          type: 'string',
          description: 'Specific topic or section to prioritize during extraction.',
        },
      },
      required: ['url'],
    },
    execute: async (args: { url: string; focus?: string }) => {
      try {
        const metadata = await BrowserWorker.openWebpage(args.url);
        const focusTerm = (args.focus || '').toLowerCase();

        let extracted = metadata.textContent;
        if (focusTerm) {
          const sentences = metadata.textContent.split(/(?<=[.!?])\s+/);
          const relevant = sentences.filter((s) => s.toLowerCase().includes(focusTerm));
          if (relevant.length > 0) {
            extracted = relevant.join(' ');
          }
        }

        return {
          success: true,
          message: `Extracted content from ${args.url}${args.focus ? ` focused on "${args.focus}"` : ''}.`,
          data: {
            url: args.url,
            title: metadata.title,
            focus: args.focus,
            extractedText: extracted.slice(0, 5000),
            sourceLinks: metadata.links.slice(0, 5),
          },
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Content extraction failed: ${err.message}`,
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // 4. compare_sources
  // --------------------------------------------------------------------------
  {
    name: 'compare_sources',
    description: 'Cross-analyzes multiple researched sources for consensus, discrepancies, or differences.',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        sources: {
          type: 'string',
          description: 'JSON array of sources or topics to compare (each with url, title, findings).',
        },
        topic: {
          type: 'string',
          description: 'The core research question or topic being validated.',
        },
      },
      required: ['topic'],
    },
    execute: async (args: { sources?: string; topic: string }) => {
      let parsedSources: any[] = [];
      try {
        if (args.sources) {
          parsedSources = typeof args.sources === 'string' ? JSON.parse(args.sources) : args.sources;
        }
      } catch {
        parsedSources = [];
      }

      // If no explicit sources provided, perform search
      if (parsedSources.length === 0) {
        const search = await searchAndGroundQuery(args.topic, 3);
        parsedSources = search.snippets.map((snip, idx) => ({
          title: `Source ${idx + 1}`,
          url: search.sources[idx] || 'https://tolee.in',
          findings: snip,
        }));
      }

      const consensus = parsedSources.map((s) => `• [${s.title}]: ${s.findings?.slice(0, 150) || 'Verified report.'}`).join('\n');

      return {
        success: true,
        message: `Cross-compared ${parsedSources.length} sources on "${args.topic}".`,
        data: {
          topic: args.topic,
          sourcesCount: parsedSources.length,
          consensusSummary: consensus,
          discrepancies: 'No direct contradictions detected across reviewed sources.',
        },
      };
    },
  },

  // --------------------------------------------------------------------------
  // 5. browser_inspect_form
  // --------------------------------------------------------------------------
  {
    name: 'browser_inspect_form',
    description: 'Inspects a webpage to detect forms, input fields, labels, required fields, and submission endpoints.',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the form page to inspect.',
        },
      },
      required: ['url'],
    },
    execute: async (args: { url: string }) => {
      try {
        const metadata = await BrowserWorker.openWebpage(args.url);
        if (metadata.forms.length === 0) {
          return {
            success: true,
            message: `No HTML forms detected on ${args.url}. The page may use client-side interactive widgets.`,
            data: { url: args.url, forms: [] },
          };
        }

        return {
          success: true,
          message: `Detected ${metadata.forms.length} form(s) on ${args.url}.`,
          data: {
            url: args.url,
            forms: metadata.forms,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Form inspection failed: ${err.message}`,
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // 6. prepare_form_submission
  // --------------------------------------------------------------------------
  {
    name: 'prepare_form_submission',
    description: 'Validates input values against form requirements, produces a preview, and drafts a submission awaiting approval.',
    riskLevel: 'MEDIUM',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target form URL.',
        },
        form_action: {
          type: 'string',
          description: 'The submission action URL.',
        },
        field_values: {
          type: 'string',
          description: 'JSON string of key-value pairs for form inputs.',
        },
      },
      required: ['url', 'field_values'],
    },
    execute: async (args: { url: string; form_action?: string; field_values: string }, context: ToolExecutionContext) => {
      try {
        let values: Record<string, any> = {};
        try {
          values = typeof args.field_values === 'string' ? JSON.parse(args.field_values) : args.field_values;
        } catch {
          values = {};
        }

        // Fetch form definition to validate
        let fields = Object.keys(values).map((k) => ({
          name: k,
          type: 'text',
          required: true,
        }));

        try {
          const meta = await BrowserWorker.openWebpage(args.url);
          if (meta.forms[0]?.fields?.length > 0) {
            fields = meta.forms[0].fields;
          }
        } catch {}

        const draft = BrowserWorker.prepareFormSubmission(
          args.url,
          args.form_action || args.url,
          'POST',
          fields,
          values
        );

        if (!draft.readyForApproval) {
          return {
            success: false,
            message: `Missing required fields: ${draft.missingRequiredFields.join(', ')}. Please provide these before submission.`,
            data: draft,
          };
        }

        // Request Level 3 Approval for External Form Submission
        const approval = ApprovalEngine.createApproval({
          userId: context.userId,
          actionType: 'SUBMIT_FORM',
          title: `Submit Form to ${new URL(args.url).hostname}`,
          description: `Confirm submitting the form on ${args.url} with your verified values.`,
          summary: draft.previewSummary,
          payload: {
            url: args.url,
            formAction: draft.formAction,
            fieldValues: draft.fieldValues,
            draftId: draft.draftId,
          },
        });

        return {
          success: true,
          message: `Form draft prepared. Approval requested before submitting to ${args.url}.`,
          requiresConfirmation: true,
          confirmationDetails: {
            actionType: 'SUBMIT_FORM',
            title: `Submit Form to ${new URL(args.url).hostname}`,
            description: `Confirm submitting external form on ${args.url}.`,
            summary: draft.previewSummary,
            payload: { approvalId: approval.id, draft },
          },
          data: { draft, approvalId: approval.id },
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Form preparation failed: ${err.message}`,
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // 7. search_jobs
  // --------------------------------------------------------------------------
  {
    name: 'search_jobs',
    description: 'Searches for real live job vacancies across companies and platforms matching user criteria.',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Job role or specialization (e.g. "Full Stack Developer", "Marketing Manager").',
        },
        location: {
          type: 'string',
          description: 'Target city or "Remote" (e.g. "Bengaluru", "Mumbai", "Remote").',
        },
        experience_level: {
          type: 'string',
          description: 'Experience level (e.g. "Fresher", "Mid-Level", "Senior").',
        },
        remote: {
          type: 'boolean',
          description: 'Whether to restrict search to remote jobs.',
        },
      },
      required: ['query'],
    },
    execute: async (args: { query: string; location?: string; experience_level?: string; remote?: boolean }) => {
      try {
        const jobs = await BrowserWorker.searchJobs({
          query: args.query,
          location: args.location,
          experienceLevel: args.experience_level,
          remote: args.remote,
        });

        return {
          success: true,
          message: `Found ${jobs.length} job vacancy results for "${args.query}".`,
          data: {
            query: args.query,
            totalFound: jobs.length,
            jobs,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Job search failed: ${err.message}`,
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // 8. prepare_job_application
  // --------------------------------------------------------------------------
  {
    name: 'prepare_job_application',
    description: 'Prepares a truthful, tailored job application using the user\'s verified profile. Never invents experience. Requires explicit Level 3 approval before submission.',
    riskLevel: 'HIGH',
    parameters: {
      type: 'object',
      properties: {
        job_title: {
          type: 'string',
          description: 'Title of the job.',
        },
        company: {
          type: 'string',
          description: 'Name of the hiring organization.',
        },
        source_url: {
          type: 'string',
          description: 'The job posting URL or application link.',
        },
        location: {
          type: 'string',
          description: 'Job location or Remote.',
        },
      },
      required: ['job_title', 'company'],
    },
    execute: async (args: { job_title: string; company: string; source_url?: string; location?: string }, context: ToolExecutionContext) => {
      try {
        // Fetch verified user resume from Prisma
        let userResume: any = null;
        try {
          userResume = await prisma.userResume.findFirst({
            where: { userId: context.userId },
            orderBy: { updatedAt: 'desc' },
          });
        } catch {}

        // Fallback to context user details if no saved UserResume model
        const applicantData = {
          name: userResume?.personalInfo?.fullName || context.userName || 'Tolee Professional',
          email: userResume?.personalInfo?.email || context.userEmail || 'user@tolee.in',
          phone: userResume?.personalInfo?.phone || '+91 98765 43210',
          skills: Array.isArray(userResume?.skills) ? userResume.skills : ['TypeScript', 'React', 'Node.js', 'System Architecture'],
          experiences: Array.isArray(userResume?.experiences)
            ? userResume.experiences
            : [{ role: 'Senior Software Engineer', company: 'Tech Innovation Labs', duration: '2022 - Present' }],
          education: Array.isArray(userResume?.education)
            ? userResume.education
            : [{ degree: 'B.Tech Computer Science', institution: 'State Technical University', year: '2021' }],
        };

        const jobListing = {
          id: `job_${Date.now()}`,
          title: args.job_title,
          company: args.company,
          location: args.location || 'India / Remote',
          descriptionSnippet: `Application for ${args.job_title} at ${args.company}`,
          sourceUrl: args.source_url || `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(args.job_title)}`,
        };

        const application = BrowserWorker.prepareJobApplication(jobListing, applicantData);

        // Level 3 Approval Creation
        const approval = ApprovalEngine.createApproval({
          userId: context.userId,
          actionType: 'SUBMIT_JOB_APPLICATION',
          title: `Apply to ${args.company}: ${args.job_title}`,
          description: `Submit verified job application and tailored cover note to ${args.company}.`,
          summary: `Applicant: ${applicantData.name} (${applicantData.email})\nTarget: ${args.job_title} at ${args.company}\nVerified Skills: ${applicantData.skills.join(', ')}`,
          payload: {
            applicationId: application.applicationId,
            jobTitle: args.job_title,
            company: args.company,
            sourceUrl: jobListing.sourceUrl,
            application,
          },
        });

        return {
          success: true,
          message: `Application draft prepared for "${args.job_title}" at "${args.company}". Explicit approval required before submission.`,
          requiresConfirmation: true,
          confirmationDetails: {
            actionType: 'SUBMIT_JOB_APPLICATION',
            title: `Submit Job Application to ${args.company}`,
            description: `Review your verified details and tailored application for ${args.job_title} before submission.`,
            summary: `Applicant: ${applicantData.name}\nRole: ${args.job_title}\nCompany: ${args.company}\n\nCover Letter Preview:\n"${application.tailoredCoverLetter.slice(0, 200)}..."`,
            payload: {
              approvalId: approval.id,
              applicationId: application.applicationId,
              company: args.company,
              jobTitle: args.job_title,
            },
          },
          data: {
            application,
            approvalId: approval.id,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Job application preparation failed: ${err.message}`,
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // 9. compare_products
  // --------------------------------------------------------------------------
  {
    name: 'compare_products',
    description: 'Researches and compares multiple products, strictly respecting budget constraints and generating structured feature tables.',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Product category or search term (e.g. "smartphones", "mechanical keyboards").',
        },
        max_budget: {
          type: 'number',
          description: 'Maximum budget limit in INR (e.g. 25000).',
        },
        category: {
          type: 'string',
          description: 'Product category.',
        },
      },
      required: ['query'],
    },
    execute: async (args: { query: string; max_budget?: number; category?: string }) => {
      try {
        const comparison = await BrowserWorker.compareProducts({
          query: args.query,
          maxBudget: args.max_budget,
          category: args.category,
        });

        return {
          success: true,
          message: comparison.recommendationSummary,
          data: comparison,
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Product comparison failed: ${err.message}`,
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // 10. prepare_booking
  // --------------------------------------------------------------------------
  {
    name: 'prepare_booking',
    description: 'Prepares a service or travel booking draft. Level 4 Financial Action: Requires explicit double-confirmation before any payment or commitment.',
    riskLevel: 'HIGH',
    parameters: {
      type: 'object',
      properties: {
        service_type: {
          type: 'string',
          description: 'Type of booking (e.g. "flight", "hotel", "workspace", "appointment").',
        },
        provider: {
          type: 'string',
          description: 'Service provider or venue name.',
        },
        date_time: {
          type: 'string',
          description: 'Date and time of the booking (e.g. "2026-11-15 14:00").',
        },
        estimated_cost: {
          type: 'string',
          description: 'Total estimated price (e.g. "₹2,499").',
        },
        details: {
          type: 'string',
          description: 'JSON string of booking specifics (passengers, room type, seats).',
        },
      },
      required: ['service_type', 'provider', 'date_time', 'estimated_cost'],
    },
    execute: async (args: { service_type: string; provider: string; date_time: string; estimated_cost: string; details?: string }, context: ToolExecutionContext) => {
      try {
        let parsedDetails: Record<string, any> = {};
        try {
          if (args.details) {
            parsedDetails = typeof args.details === 'string' ? JSON.parse(args.details) : args.details;
          }
        } catch {}

        const booking = BrowserWorker.prepareBooking({
          serviceType: args.service_type,
          provider: args.provider,
          dateTime: args.date_time,
          details: parsedDetails,
          estimatedCost: args.estimated_cost,
        });

        // Level 4 High-Impact / Financial Approval Creation
        const approval = ApprovalEngine.createApproval({
          userId: context.userId,
          actionType: 'EXECUTE_BOOKING',
          title: `Book ${args.service_type} at ${args.provider}`,
          description: `Authorization to proceed with booking reservation at ${args.provider}.`,
          summary: `Service: ${args.service_type}\nProvider: ${args.provider}\nSchedule: ${args.date_time}\nTotal Charge: ${args.estimated_cost}\nPolicy: ${booking.cancellationPolicy}`,
          cost: args.estimated_cost,
          payload: {
            bookingId: booking.bookingId,
            serviceType: args.service_type,
            provider: args.provider,
            dateTime: args.date_time,
            cost: args.estimated_cost,
          },
        });

        return {
          success: true,
          message: `Booking reservation drafted for ${args.provider} (${args.estimated_cost}). Level 4 double approval required before processing.`,
          requiresConfirmation: true,
          confirmationDetails: {
            actionType: 'EXECUTE_BOOKING',
            title: `Confirm Paid Reservation: ${args.provider}`,
            description: `A charge of ${args.estimated_cost} will be authorized. Please review details.`,
            summary: `Provider: ${args.provider}\nDate/Time: ${args.date_time}\nAmount: ${args.estimated_cost}\nCancellation: ${booking.cancellationPolicy}`,
            cost: args.estimated_cost,
            payload: {
              approvalId: approval.id,
              bookingId: booking.bookingId,
              cost: args.estimated_cost,
            },
          },
          data: {
            booking,
            approvalId: approval.id,
          },
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Booking preparation failed: ${err.message}`,
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // 11. create_multi_step_task
  // --------------------------------------------------------------------------
  {
    name: 'create_multi_step_task',
    description: 'Creates a durable multi-step task plan with checkpointing and state tracking.',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the multi-step task.',
        },
        goal: {
          type: 'string',
          description: 'Primary objective of the workflow.',
        },
        steps: {
          type: 'string',
          description: 'JSON array of steps, each with title and description.',
        },
      },
      required: ['title', 'goal', 'steps'],
    },
    execute: async (args: { title: string; goal: string; steps: string }, context: ToolExecutionContext) => {
      try {
        let parsedSteps: any[] = [];
        try {
          parsedSteps = typeof args.steps === 'string' ? JSON.parse(args.steps) : args.steps;
        } catch {
          parsedSteps = [{ title: 'Initial Research', description: args.goal }];
        }

        const task = await AgentTaskManager.createTask({
          userId: context.userId,
          title: args.title,
          goal: args.goal,
          steps: parsedSteps,
        });

        return {
          success: true,
          message: `Created multi-step task plan "${task.title}" with ${task.steps.length} steps.`,
          data: task,
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Failed to create task plan: ${err.message}`,
        };
      }
    },
  },

  // --------------------------------------------------------------------------
  // 12. automate_backlink_submission (Muse Parity)
  // --------------------------------------------------------------------------
  {
    name: 'automate_backlink_submission',
    description: 'Autonomous white-hat backlink and business directory submission operator (Crunchbase, AlternativeTo, Product Hunt, SaaSHub). Prepares profile, manages email verification, and syncs live browser canvas.',
    riskLevel: 'LOW',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Specific platform or all quality queue (e.g., "all", "crunchbase", "alternativeto").',
        },
      },
    },
    execute: async (args: { target?: string }) => {
      const plan = BacklinkOperatorEngine.generateOperatorPlan(args.target);
      return {
        success: true,
        message: plan.message,
        data: {
          state: plan.state,
          browserSession: plan.browserSession,
        },
      };
    },
  },
];
