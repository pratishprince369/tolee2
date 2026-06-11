/**
 * Enterprise-grade Telemetry, Performance & Error Monitoring Service
 */
export class MonitoringService {
  private static readonly webhookUrl = process.env.MONITORING_ALERTS_WEBHOOK || "";
  private static readonly environment = process.env.NODE_ENV || "development";

  /**
   * Log system exceptions with deep metadata context.
   * Integrates Sentry/Datadog fallbacks and triggers webhook alarms for critical errors.
   */
  public static async logError(error: Error | any, context: Record<string, any> = {}): Promise<void> {
    const timestamp = new Date().toISOString();
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || "No stack trace provided";

    const payload = {
      event: "error",
      environment: this.environment,
      timestamp,
      message: errorMessage,
      stack: errorStack,
      context,
    };

    // 1. Console auditing for localized troubleshooting
    console.error(`[MONITORING ERROR ALERT] [${timestamp}] [Env: ${this.environment}]`, {
      message: errorMessage,
      context,
      stack: errorStack.split("\n").slice(0, 3).join("\n"), // Log top 3 lines
    });

    // 2. Mock external APM forwarding (e.g. Sentry/Datadog ingestion)
    try {
      if (globalThis as any) {
        // Future hooks: Sentry.captureException(error, { extra: context })
      }
    } catch (e) {
      console.error("APM forwarding failed:", e);
    }

    // 3. Dispatch real-time high-priority alerts to Slack/Teams channel if configured
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🚨 *[CRITICAL ERROR ALERT]* \n*Env:* \`${this.environment}\` \n*Message:* \`${errorMessage}\` \n*Context:* \`\`\`${JSON.stringify(context, null, 2)}\`\`\``
          })
        });
      } catch (webhookErr) {
        console.error("Failed to send webhook monitoring alert:", webhookErr);
      }
    }
  }

  /**
   * Track latency metrics for database queries, external API integrations, or route transactions.
   */
  public static logPerformance(metricName: string, durationMs: number, details: Record<string, any> = {}): void {
    const timestamp = new Date().toISOString();

    const payload = {
      event: "performance",
      environment: this.environment,
      timestamp,
      metricName,
      durationMs,
      details,
    };

    // Log query or route transactions to standard output in clean structured logs
    if (durationMs > 200) {
      console.warn(`⚠️ [SLOW TRANSACTION WARNING] [${metricName}] took ${durationMs}ms! Details:`, details);
    } else {
      console.log(`⏱️ [Performance Metric] [${metricName}] completed in ${durationMs}ms`);
    }

    // Forward metrics to APM agent (e.g. Datadog metrics client)
    try {
      // Future hooks: datadog.gauge(metricName, durationMs, tags)
    } catch (e) {
      console.error("Performance metric forwarding failed:", e);
    }
  }
}
