import type { SDKConfig, EventData } from '../types';

export class EventSender {
  private config: Required<SDKConfig>;
  private queue: EventData[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private userInfo: Record<string, unknown> = {};
  private isFlushing = false;

  constructor(config: Required<SDKConfig>) {
    this.config = config;
  }

  send(event: EventData): void {
    const eventWithUser = {
      ...event,
      data: {
        ...event.data,
        user: this.userInfo
      }
    };

    this.queue.push(eventWithUser);

    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.config.batchInterval);
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;

    this.isFlushing = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      await this.sendBatch(eventsToSend);
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to send events:', error);
      }
      this.queue = [...eventsToSend, ...this.queue];
    } finally {
      this.isFlushing = false;
    }
  }

  private async sendBatch(events: EventData[]): Promise<void> {
    const payload = {
      apiKey: this.config.apiKey,
      events
    };

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          keepalive: true
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        return;
      } catch (error) {
        if (attempt === this.config.maxRetries - 1) {
          throw error;
        }
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  setUser(userInfo: Record<string, unknown>): void {
    this.userInfo = userInfo;
  }

  clearUser(): void {
    this.userInfo = {};
  }

  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    void this.flush();
  }
}
