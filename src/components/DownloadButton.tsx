import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, Loader2, WalletCards } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { useAuthStore } from '../store/authStore';
import { createDownloadPackage } from '../utils/fileUtils';
import { useValidation } from '../hooks/useValidation';
import { useAnalytics } from '../hooks/useAnalytics';
import { validateDescription } from '../utils/fileValidation';

interface DownloadButtonProps {
  onUpgradeClick: () => void;
  setActiveTab?: (tab: string) => void;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ onUpgradeClick, setActiveTab }) => {
  const { images, selectedImages, formData } = useMetadataStore();
  const { isValid } = useValidation();
  const { trackEvent } = useAnalytics();
  const { user } = useAuthStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadsLeft, setDownloadsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (user?.user_metadata.subscription_plan === 'Basic') {
      const storedDownloads = localStorage.getItem('downloadsLeft');
      setDownloadsLeft(storedDownloads ? parseInt(storedDownloads, 10) : 5);
    }
  }, [user]);

  const hasSpecialCharacters = React.useMemo(() => {
    const selectedImagesList = images.filter(img => selectedImages.has(img.id));
    return selectedImagesList.some(img => !img.isSketch && !validateDescription(img.description || '').isValid);
  }, [images, selectedImages]);

  const handleUpgradeClick = () => {
    console.log("onUpgradeClick in DownloadButton:", onUpgradeClick);
    if (setActiveTab) {
      setActiveTab('subscription');
    }
    onUpgradeClick();
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setError(null);

      const selectedImagesList = images.filter(img => selectedImages.has(img.id));

      if (selectedImagesList.length === 0) {
        throw new Error('No images selected');
      }

      if (user?.user_metadata.subscription_plan === 'Basic' && (downloadsLeft === null || downloadsLeft <= 0)) {
        throw new Error('You have used all 5 downloads. Upgrade to continue.');
      }

      const zipBlob = await createDownloadPackage(selectedImagesList, formData);
      const url = URL.createObjectURL(zipBlob);

      trackEvent({ action: 'download_package', category: 'user_action', value: selectedImagesList.length });

      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.elr.trim().toUpperCase()}_${formData.structureNo.trim()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (user?.user_metadata.subscription_plan === 'Basic') {
        const newDownloadsLeft = downloadsLeft! - 1;
        setDownloadsLeft(newDownloadsLeft);
        localStorage.setItem('downloadsLeft', newDownloadsLeft.toString());
      }
    } catch (error) {
      console.error('Error creating download package:', error);
      setError(error instanceof Error ? error.message : 'Failed to create download package');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      {downloadsLeft === 0 ? (
        <button
          onClick={handleUpgradeClick}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
        >
          <WalletCards size={20} />
          Upgrade Package
        </button>
      ) : (
        <button
          onClick={handleDownload}
          disabled={isDownloading || (downloadsLeft !== null && downloadsLeft <= 0)}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg ${
            isDownloading || (downloadsLeft !== null && downloadsLeft <= 0)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          {isDownloading
            ? 'Creating Package...'
            : user?.user_metadata.subscription_plan === 'Basic' && downloadsLeft !== null
            ? `Download (${downloadsLeft} left)`
            : 'Download Package'}
        </button>
      )}

      {(error || (!isValid() && error !== null && error.length > 0) || hasSpecialCharacters) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              {error ? (
                <p>{error}</p>
              ) : hasSpecialCharacters ? (
                <p>Remove special characters from defect descriptions before downloading</p>
              ) : (
                <>
                  <p className="font-medium mb-1">Please complete the following:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {error && <li>{error}</li>}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadButton;