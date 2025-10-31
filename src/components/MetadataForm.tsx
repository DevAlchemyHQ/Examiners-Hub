import React, { useState, useCallback } from 'react';
import { Calendar, Hash, Building2, ChevronUp, ChevronDown } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { FormData } from '../types';

// Memoized form fields component to prevent flicker on state updates
const FormFields = React.memo<{ formData: FormData; setFormData: (data: Partial<FormData>) => void }>(
  ({ formData, setFormData }) => {
    const handleELRChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ elr: e.target.value.toUpperCase() });
    }, [setFormData]);

    const handleStructureNoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ structureNo: e.target.value });
    }, [setFormData]);

    const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
    }, [formData.date, setFormData]);

    return (
      <>
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
      </>
    );
  },
  // Custom comparison: only re-render if formData values actually changed
  (prevProps, nextProps) => {
    return (
      prevProps.formData.elr === nextProps.formData.elr &&
      prevProps.formData.structureNo === nextProps.formData.structureNo &&
      prevProps.formData.date === nextProps.formData.date
    );
  }
);

FormFields.displayName = 'FormFields';

export const MetadataForm: React.FC = () => {
  const { formData, setFormData } = useMetadataStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-slate-50 dark:bg-gray-700 rounded-lg px-2 py-1 flex items-center gap-3">
      <span className="text-xs font-medium text-slate-700 dark:text-gray-300 mr-2">Project Details</span>
      <FormFields formData={formData} setFormData={setFormData} />
    </div>
  );
};
