import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageGrid } from '../ImageGrid';
import { SelectedImagesPanel } from '../SelectedImagesPanel';

interface MainContentProps {
  selectedProject: any | null;
}

export const MainContent: React.FC<MainContentProps> = ({ selectedProject }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  // If no project is selected, show a message and button to got to projects page
  if (!selectedProject) {
    return (
      <div className="lg:col-span-10 flex flex-col items-center justify-center">
        <p className="text-2xl text-gray-500 dark:text-gray-400">Select a project to get started</p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Go to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="lg:col-span-10 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
      {/* Image Grid - Hide when expanded */}
      {!isExpanded && (
        <div className="h-full overflow-hidden lg:col-span-6">
          <ImageGrid 
            projectId={selectedProject.id} 
            projectImages={selectedProject.images || []}
          />
        </div>
      )}


      {/* Selected Images Panel - Expand to full width when expanded */}
      <div className={`h-full overflow-hidden transition-all duration-300 ${
        isExpanded ? 'lg:col-span-12' : 'lg:col-span-6'
      }`}>
        <SelectedImagesPanel 
          onExpand={() => setIsExpanded(!isExpanded)} 
          isExpanded={isExpanded} 
          projectId={selectedProject.id}
          projectImages={selectedProject.images || []}
        />
      </div>
    </div>
  );
};
