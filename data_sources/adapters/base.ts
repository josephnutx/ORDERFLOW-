// Base Data Source Adapter Implementation with Timeout, Retry, Backoff and Circuit Breaking

import type {
  BaseAdapter,
  NormalizedNewsArticle,
  NormalizedEconomicEvent,
  SourceHealthStatus,
  SourceHealthReport
} from '../types.ts';

export abstract class AbstractDataSourceAdapter implements BaseAdapter {
  abstract readonly id: string;
  abstract readonly name: string;

  protected status: SourceHealthStatus = 'ONLINE';
  protected lastSuccessAt: string | null = null;
  protected lastAttemptAt: string | null = null;
  protected lastError: string | null = null;
  protected consecutiveFailures = 0;
  protected totalRecordsIngested = 0;
  protected latencySamples: number[] = [];

  abstract fetch_latest_news(): Promise<NormalizedNewsArticle[]>;
  abstract fetch_economic_events(): Promise<NormalizedEconomicEvent[]>;

  async health_check(): Promise<SourceHealthStatus> {
    if (this.consecutiveFailures === 0) return 'ONLINE';
    if (this.consecutiveFailures < 3) return 'DEGRADED';
    return 'OFFLINE';
  }

  get_health_report(): SourceHealthReport {
    const avgLatency = this.latencySamples.length > 0
      ? Math.round(this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length)
      : 0;

    return {
      source_id: this.id,
      source_name: this.name,
      status: this.status,
      last_success_at: this.lastSuccessAt,
      last_attempt_at: this.lastAttemptAt,
      last_error: this.lastError,
      consecutive_failures: this.consecutiveFailures,
      total_records_ingested: this.totalRecordsIngested,
      avg_latency_ms: avgLatency,
    };
  }

  protected recordSuccess(recordsCount: number, latencyMs: number) {
    this.lastSuccessAt = new Date().toISOString();
    this.lastAttemptAt = this.lastSuccessAt;
    this.lastError = null;
    this.consecutiveFailures = 0;
    this.status = 'ONLINE';
    this.totalRecordsIngested += recordsCount;
    
    this.latencySamples.push(latencyMs);
    if (this.latencySamples.length > 20) this.latencySamples.shift();
  }

  protected recordFailure(err: any, latencyMs: number) {
    this.lastAttemptAt = new Date().toISOString();
    this.lastError = err?.message || String(err);
    this.consecutiveFailures += 1;
    this.status = this.consecutiveFailures >= 3 ? 'OFFLINE' : 'DEGRADED';

    this.latencySamples.push(latencyMs);
    if (this.latencySamples.length > 20) this.latencySamples.shift();

    console.log(`[DataSource:${this.id}] Feed status update (attempt ${this.consecutiveFailures}): ${this.lastError}`);
  }

  /**
   * Safe fetch with configurable timeout, retry count and exponential backoff
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries = 2,
    timeoutMs = 6000
  ): Promise<Response> {
    let attempt = 0;
    let delay = 500;

    while (attempt <= maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.ok) {
          return response;
        }

        // Retry only on 5xx server errors (do not retry on 429 rate-limit)
        if (response.status >= 500) {
          if (attempt > maxRetries) return response;
        } else {
          // Client 4xx or 429 rate limit (return immediately to handle gracefully)
          return response;
        }
      } catch (err: any) {
        clearTimeout(timer);
        if (attempt > maxRetries) {
          throw err;
        }
      }

      // Exponential backoff with small random jitter
      const jitter = Math.floor(Math.random() * 200);
      await new Promise((res) => setTimeout(res, delay + jitter));
      delay *= 2;
    }

    throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
  }
}
