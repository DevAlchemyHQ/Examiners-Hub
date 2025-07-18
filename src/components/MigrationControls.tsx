import React from 'react';
import { Cloud, Database, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { migrationMonitor } from '../lib/migrationMonitor';

export const MigrationControls: React.FC = () => {
  const handleSwitchToAWS = (serviceKey: string) => {
    migrationMonitor.switchToAWS(serviceKey);
  };

  const handleSwitchToSupabase = (serviceKey: string) => {
    migrationMonitor.switchToSupabase(serviceKey);
  };

  const handleTestAll = () => {
    migrationMonitor.testAllServices();
  };

  const handleShowStatus = () => {
    migrationMonitor.logCurrentStatus();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[250px]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Migration Controls
        </h3>
        
        <div className="space-y-3">
          {/* Authentication */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-blue-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auth</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleSwitchToSupabase('auth')}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                <ArrowLeft size={12} />
              </button>
              <button
                onClick={() => handleSwitchToAWS('auth')}
                className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              >
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Storage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud size={16} className="text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Storage</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleSwitchToSupabase('storage')}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                <ArrowLeft size={12} />
              </button>
              <button
                onClick={() => handleSwitchToAWS('storage')}
                className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              >
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User size={16} className="text-purple-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Profile</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleSwitchToSupabase('profile')}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                <ArrowLeft size={12} />
              </button>
              <button
                onClick={() => handleSwitchToAWS('profile')}
                className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              >
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={handleTestAll}
            className="w-full px-3 py-2 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
          >
            Test All Services
          </button>
          <button
            onClick={handleShowStatus}
            className="w-full px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Show Status
          </button>
        </div>
      </div>
    </div>
  );
}; 