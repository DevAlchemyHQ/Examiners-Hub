import React, { useEffect } from 'react';
import { Calendar, Hash, Building2 } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';

interface MetadataFormProps {
  selectedProject?: any;
}

export const MetadataForm: React.FC<MetadataFormProps> = ({ selectedProject }) => {
  const { formData, setFormData } = useMetadataStore();

  useEffect(() => {
    if (selectedProject?.form_data) {
      setFormData({
        elr: selectedProject.form_data.elr || '',
        structureNo: selectedProject.form_data.structureNo || '',
        date: selectedProject.form_data.date || ''
      });
    }
  }, [selectedProject, setFormData]);

  const handleELRChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ elr: e.target.value.toUpperCase() });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const [year] = value.split('-');
    
    // Validate year is between 1900 and 9999
    if (year) {
      const yearNum = parseInt(year);
      if (yearNum < 1900 || yearNum > 9999) return;
    }
    
    setFormData({ date: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700">
      <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white mb-3">Project Details</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-indigo-500" />
              ELR
            </div>
          </label>
          <input
            type="text"
            value={formData.elr}
            onChange={handleELRChange}
            className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all uppercase bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
            placeholder="Enter ELR"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            <div className="flex items-center gap-2">
              <Hash size={16} className="text-indigo-500" />
              Structure No
            </div>
          </label>
          <input
            type="text"
            value={formData.structureNo}
            onChange={(e) => setFormData({ structureNo: e.target.value })}
            className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
            placeholder="Enter Structure No"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-indigo-500" />
              Date
            </div>
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={handleDateChange}
            min="2001-01-01"
            max="2099-12-31"
            className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};