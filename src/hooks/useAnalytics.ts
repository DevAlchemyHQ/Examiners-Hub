interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

declare global {
  interface Window {
    gtag: (
      command: 'event' | 'config' | 'js',
      action: string,
      params?: Record<string, any>
    ) => void;
  }
}

export const useAnalytics = () => {
  const trackEvent = ({ action, category, label, value }: AnalyticsEvent) => {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
    }
  };

  const trackPageView = (path: string) => {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('config', 'G-ZGN0X8XSJ0', {
        page_path: path
      });
    }
  };

  return {
    trackEvent,
    trackPageView
  };
};