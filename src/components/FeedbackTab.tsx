import React, { useState } from 'react';
import { Mail, X } from 'lucide-react';

const SUPPORT_EMAIL = 'infor@exametry.xyz';

export const FeedbackTab: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmailClick = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Support Request - Exametry`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#6366f1] text-white p-3 rounded-l-lg shadow-lg hover:bg-[#4f46e5] transition-colors"
        title="Contact Support"
      >
        <Mail size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Contact Support
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-500 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <p className="text-slate-600 dark:text-gray-300 text-sm">
                Need assistance or offer suggestions? We'd love to hear it 🙂
              </p>
              <button
                type="button"
                onClick={handleEmailClick}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                <Mail size={18} /> Email Us
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
