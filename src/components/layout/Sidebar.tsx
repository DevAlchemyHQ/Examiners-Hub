import React from 'react';
import { MetadataForm } from '../MetadataForm';
import { ImageUpload } from '../ImageUpload';
import { DownloadButton } from '../DownloadButton';
import { TabType } from './MainLayout';

interface SidebarProps {
  setActiveTab?: (tab: TabType) => void;
  activeTab?: TabType;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {

  return (
    <div className="lg:col-span-2 space-y-4 overflow-container">
      <div className="space-y-4 h-full overflow-y-auto p-0.5">
        <MetadataForm />
        <ImageUpload />
        <div className="mt-4 sticky bottom-0 bg-slate-50 dark:bg-gray-900 pt-2">
          <DownloadButton setActiveTab={setActiveTab} activeTab={activeTab}  />
        </div>
      </div>
    </div>
  );
};