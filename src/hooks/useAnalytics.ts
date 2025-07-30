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

  // Upload tracking
  const trackImageUpload = (fileCount: number, totalSize: number) => {
    trackEvent({
      action: 'image_upload',
      category: 'upload',
      label: 'individual_images',
      value: fileCount
    });
    
    // Track upload size
    trackEvent({
      action: 'upload_size',
      category: 'upload',
      label: 'total_size_mb',
      value: Math.round(totalSize / (1024 * 1024))
    });
  };

  const trackBulkUpload = (fileCount: number, totalSize: number) => {
    trackEvent({
      action: 'bulk_upload',
      category: 'upload',
      label: 'bulk_images',
      value: fileCount
    });
    
    // Track upload size
    trackEvent({
      action: 'upload_size',
      category: 'upload',
      label: 'bulk_size_mb',
      value: Math.round(totalSize / (1024 * 1024))
    });
  };

  // Download tracking
  const trackImageDownload = (imageCount: number, packageType: string) => {
    trackEvent({
      action: 'image_download',
      category: 'download',
      label: packageType,
      value: imageCount
    });
  };

  const trackBulkDownload = (imageCount: number, defectCount: number) => {
    trackEvent({
      action: 'bulk_download',
      category: 'download',
      label: 'bulk_package',
      value: imageCount
    });
    
    // Track defect count
    trackEvent({
      action: 'defect_count',
      category: 'download',
      label: 'bulk_defects',
      value: defectCount
    });
  };

  // Grid operations tracking
  const trackGridLoad = (imageCount: number, gridType: string) => {
    trackEvent({
      action: 'grid_load',
      category: 'grid',
      label: gridType,
      value: imageCount
    });
  };

  const trackImageSelection = (selectedCount: number, totalCount: number) => {
    trackEvent({
      action: 'image_selection',
      category: 'grid',
      label: 'selection_ratio',
      value: Math.round((selectedCount / totalCount) * 100)
    });
  };

  const trackDefectSetLoad = (defectCount: number, source: string) => {
    trackEvent({
      action: 'defect_set_load',
      category: 'defects',
      label: source,
      value: defectCount
    });
  };

  // Error tracking
  const trackError = (errorType: string, context: string) => {
    trackEvent({
      action: 'error',
      category: 'error',
      label: `${errorType}_${context}`
    });
  };

  // User interaction tracking
  const trackUserAction = (action: string, context: string, value?: number) => {
    trackEvent({
      action: action,
      category: 'user_interaction',
      label: context,
      value: value
    });
  };

  return {
    trackEvent,
    trackPageView,
    trackImageUpload,
    trackBulkUpload,
    trackImageDownload,
    trackBulkDownload,
    trackGridLoad,
    trackImageSelection,
    trackDefectSetLoad,
    trackError,
    trackUserAction
  };
};