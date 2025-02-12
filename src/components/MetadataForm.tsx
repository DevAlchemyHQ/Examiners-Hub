import React, { useState, useEffect } from 'react';
import { Calendar, Hash, Building2, PlusCircle } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { getProjects } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export const MetadataForm: React.FC = () => {
  const { formData, setFormData } = useMetadataStore();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (user) {
        const userProjects = await getProjects(user.id);
        setProjects(userProjects || []);
      }
      setLoading(false);
    };

    fetchProjects();
  }, [user]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-md border border-slate-200 dark:border-gray-700">
      <div className="mb-10 flex justify-center">
      {loading ? (
          <button className="w-full py-6 text-lg font-semibold bg-gray-300 text-gray-700 rounded-lg animate-pulse">
            Loading...
          </button>
        ) : projects.length > 0 ? (
          <select
            onChange={(e) => console.log(`Selected project: ${e.target.value}`)}
            className="w-full py-6 text-lg font-semibold border border-slate-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-slate-900 dark:text-white shadow-md transition-all hover:bg-indigo-100 dark:hover:bg-indigo-600"
          >
            <option value="">Select Project</option>
            {projects.map((project, index) => (
              <option key={index} value={project}>{project}</option>
            ))}
          </select>
        ) : (
          <button className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105">
            <PlusCircle size={20} /> New Project
          </button>
        )}
      </div>
      <h2 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-white mb-4">Project Details</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-indigo-500" />
              ELR
            </div>
          </label>
          <input
            type="text"
            value={formData.elr}
            onChange={(e) => setFormData({ elr: e.target.value })}
            className="w-full p-3 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all uppercase bg-white dark:bg-gray-800 text-slate-900 dark:text-white shadow-sm"
            placeholder="Enter ELR"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <Hash size={18} className="text-indigo-500" />
              Structure No
            </div>
          </label>
          <input
            type="text"
            value={formData.structureNo}
            onChange={(e) => setFormData({ structureNo: e.target.value })}
            className="w-full p-3 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white dark:bg-gray-800 text-slate-900 dark:text-white shadow-sm"
            placeholder="Enter Structure No"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500" />
              Date
            </div>
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ date: e.target.value })}
            min="1900-01-01"
            max="9999-12-31"
            className="w-full p-3 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white dark:bg-gray-800 text-slate-900 dark:text-white shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};
