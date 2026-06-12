import type { EventData, PerformanceData } from '../types';

export class PerformanceCapturer {
  private sendEvent: (event: EventData) => void;
  private observer?: PerformanceObserver;

  constructor(sendEvent: (event: EventData) => void) {
    this.sendEvent = sendEvent;
    this.setup();
  }

  private setup(): void {
    if (window.performance) {
      window.addEventListener('load', () => {
        this.captureNavigationTiming();
      });

      if ('PerformanceObserver' in window) {
        this.observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.entryType === 'paint') {
              this.capturePaintTiming(entry as PerformancePaintTiming);
            } else if (entry.entryType === 'largest-contentful-paint') {
              this.captureLCP(entry as LCPPerformanceEntry);
            }
          }
        });

        this.observer.observe({
          type: 'paint',
          buffered: true
        });

        this.observer.observe({
          type: 'largest-contentful-paint',
          buffered: true
        });
      }
    }
  }

  private captureNavigationTiming(): void {
    const timing = window.performance.timing;
    const performanceData: PerformanceData = {
      navigationStart: timing.navigationStart,
      unloadEventStart: timing.unloadEventStart,
      unloadEventEnd: timing.unloadEventEnd,
      redirectStart: timing.redirectStart,
      redirectEnd: timing.redirectEnd,
      fetchStart: timing.fetchStart,
      domainLookupStart: timing.domainLookupStart,
      domainLookupEnd: timing.domainLookupEnd,
      connectStart: timing.connectStart,
      connectEnd: timing.connectEnd,
      secureConnectionStart: timing.secureConnectionStart,
      requestStart: timing.requestStart,
      responseStart: timing.responseStart,
      responseEnd: timing.responseEnd,
      domLoading: timing.domLoading,
      domInteractive: timing.domInteractive,
      domContentLoadedEventStart: timing.domContentLoadedEventStart,
      domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
      domComplete: timing.domComplete,
      loadEventStart: timing.loadEventStart,
      loadEventEnd: timing.loadEventEnd,
      timeToInteractive: timing.domInteractive - timing.navigationStart,
      firstPaint: undefined,
      firstContentfulPaint: undefined,
      largestContentfulPaint: undefined
    };

    const event: EventData = {
      type: 'performance',
      timestamp: Date.now(),
      data: {
        ...performanceData,
        metrics: {
          dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
          tcpConnection: timing.connectEnd - timing.connectStart,
          request: timing.responseEnd - timing.requestStart,
          response: timing.responseEnd - timing.responseStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          pageLoad: timing.loadEventEnd - timing.navigationStart
        }
      }
    };
    this.sendEvent(event);
  }

  private capturePaintTiming(entry: PerformancePaintTiming): void {
    const event: EventData = {
      type: 'performance',
      timestamp: Date.now(),
      data: {
        metricType: entry.name,
        startTime: entry.startTime,
        duration: entry.duration
      }
    };
    this.sendEvent(event);
  }

  private captureLCP(entry: LCPPerformanceEntry): void {
    const event: EventData = {
      type: 'performance',
      timestamp: Date.now(),
      data: {
        metricType: 'largest-contentful-paint',
        startTime: entry.startTime,
        duration: entry.duration,
        size: entry.size,
        element: entry.element?.tagName || 'unknown'
      }
    };
    this.sendEvent(event);
  }

  destroy(): void {
    this.observer?.disconnect();
  }
}
