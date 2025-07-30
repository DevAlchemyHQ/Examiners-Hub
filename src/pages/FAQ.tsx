import React from 'react';
import { Header } from '../components/Header';
import { ImagesFAQ } from '../components/ImagesFAQ';

export const FAQ: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Get help with using the application features
            </p>
          </div>
          
          <ImagesFAQ />
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need more help? Contact support for additional assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 