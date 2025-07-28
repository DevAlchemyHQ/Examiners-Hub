import { DownloadButton } from '../DownloadButton';

export const Sidebar: React.FC<{ isLoading?: boolean }> = ({ isLoading }) => {
  return (
    <div className="lg:col-span-2 space-y-4 overflow-container">
      <div className="space-y-4 h-full overflow-y-auto p-0.5">
        <div className="mt-4 sticky bottom-0 bg-slate-50 dark:bg-gray-900 pt-2">
          <DownloadButton  />
        </div>
      </div>
    </div>
  );
};