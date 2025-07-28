import React from 'react';
import { Book, FileText } from 'lucide-react';

export const ExaminerHandbook: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-[calc(100vh-120px)]">
      <div className="p-4 border-b border-slate-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <Book className="text-indigo-500" />
          Examiner Handbook
        </h2>
      </div>
      
      <div className="p-6 space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'General Guidelines',
              description: 'Essential information for examiners including safety protocols and procedures.',
              icon: FileText
            },
            {
              title: 'Inspection Manual',
              description: 'Detailed inspection procedures and checklists.',
              icon: Book
            },
            {
              title: 'Safety Protocols',
              description: 'Critical safety information and emergency procedures.',
              icon: FileText
            }
          ].map((item, index) => (
            <div key={index} className="bg-slate-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <item.icon className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900 dark:text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-gray-300">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Recent Updates</h3>
          <div className="space-y-4">
            {[
              {
                date: '2024-03-15',
                title: 'Safety Protocol Updates',
                description: 'Updated safety guidelines for working in confined spaces.'
              },
              {
                date: '2024-03-01',
                title: 'New Inspection Procedures',
                description: 'Added new procedures for structural assessments.'
              },
              {
                date: '2024-02-15',
                title: 'Documentation Requirements',
                description: 'Updated documentation requirements for field inspections.'
              }
            ].map((update, index) => (
              <div key={index} className="flex items-start gap-4 pb-4 border-b border-slate-200 dark:border-gray-600 last:border-0 last:pb-0">
                <div className="text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">
                  {update.date}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                    {update.title}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-gray-300">
                    {update.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};