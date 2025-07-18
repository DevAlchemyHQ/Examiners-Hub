import React, { useState, useEffect } from 'react';
import { Cloud, Database, User, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { migrationMonitor, MigrationStatus } from '../lib/migrationMonitor';

export const MigrationStatus: React.FC = () => {
  const [status, setStatus] = useState<MigrationStatus[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = migrationMonitor.getCurrentStatus();
      setStatus(currentStatus);
      setProgress(migrationMonitor.getMigrationProgress());
    };

    // Update immediately
    updateStatus();

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (serviceStatus: MigrationStatus) => {
    switch (serviceStatus.status) {
      case 'active':
        return <CheckCircle size={12} className="text-green-500" />;
      case 'migrating':
        return <Clock size={12} className="text-yellow-500" />;
      case 'error':
        return <AlertCircle size={12} className="text-red-500" />;
      default:
        return <CheckCircle size={12} className="text-gray-500" />;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'AWS':
        return <Cloud size={12} className="text-orange-500" />;
      case 'Supabase':
        return <Database size={12} className="text-blue-500" />;
      default:
        return <Database size={12} className="text-gray-500" />;
    }
  };

  if (progress === 0) {
    return null; // Don't show if no migration progress
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Migration Progress
          </span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {progress}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mb-3">
          <div 
            className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-1">
          {status.map((serviceStatus) => (
            <div key={serviceStatus.service} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                {getStatusIcon(serviceStatus)}
                <span className="text-gray-600 dark:text-gray-400">
                  {serviceStatus.service}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {getProviderIcon(serviceStatus.currentProvider)}
                <span className={`font-medium ${
                  serviceStatus.currentProvider === 'AWS' 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {serviceStatus.currentProvider}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              console.log('\n📊 === MANUAL STATUS CHECK ===');
              migrationMonitor.logCurrentStatus();
              migrationMonitor.testAllServices();
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            Check Status
          </button>
        </div>
      </div>
    </div>
  );
}; 