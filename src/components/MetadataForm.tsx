import React, { useState } from 'react';
import { Calendar, Hash, Building2, ChevronUp, ChevronDown } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';

export const MetadataForm: React.FC = () => {
  const { formData, setFormData } = useMetadataStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleELRChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ elr: e.target.value.toUpperCase() });
  };

  const handleStructureNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ structureNo: e.target.value });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    
    // If the value is a complete date (YYYY-MM-DD format)
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setFormData({ date: value });
      return;
    }
    
    // If user is typing and we have a previous date, preserve month/day
    if (formData.date && value.length < 10) {
      const currentDate = new Date(formData.date);
      const [year] = value.split('-');
      
      if (year && year.length === 4) {
        const yearNum = parseInt(year);
        if (yearNum >= 1900 && yearNum <= 9999) {
          // Preserve month and day from current date
          const month = currentDate.getMonth();
          const day = currentDate.getDate();
          const newDate = new Date(yearNum, month, day);
          const formattedDate = newDate.toISOString().split('T')[0];
          setFormData({ date: formattedDate });
          return;
        }
      }
    }
    
    // Default behavior for complete dates
    setFormData({ date: value });
  };

  return (
    <div className="bg-slate-50 dark:bg-gray-700 rounded-lg px-2 py-1 flex items-center gap-3">
      <span className="text-xs font-medium text-slate-700 dark:text-gray-300 mr-2">Project Details</span>
      <label className="text-xs font-medium text-slate-600 dark:text-gray-400 mr-1">ELR</label>
      <input
        type="text"
        value={formData.elr}
        onChange={handleELRChange}
        className="p-1 text-xs border border-slate-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-white max-w-[70px] mr-2"
        placeholder="ELR"
        maxLength={8}
      />
      <label className="text-xs font-medium text-slate-600 dark:text-gray-400 mr-1">Structure No</label>
      <input
        type="text"
        value={formData.structureNo}
        onChange={handleStructureNoChange}
        className="p-1 text-xs border border-slate-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-white max-w-[70px] mr-2"
        placeholder="No"
        maxLength={8}
      />
      <label className="text-xs font-medium text-slate-600 dark:text-gray-400 mr-1">Date</label>
      <input
        type="date"
        value={formData.date}
        onChange={handleDateChange}
        className="p-1 text-xs border border-slate-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-white max-w-[120px]"
      />
    </div>
  );
};
