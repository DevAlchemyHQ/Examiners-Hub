import React, { useEffect, useState } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getProjects } from '../../lib/supabase';
import { TabType } from '../../components/layout/MainLayout';

interface ProjectsTabProps {
    setActiveTab: (tab: TabType) => void;
    activeTab?: TabType;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({ setActiveTab }) => {
    const { user } = useAuthStore();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            if (user?.id) {
                const fetchedProjects = await getProjects(user.id);
                setProjects(fetchedProjects);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [user?.id]);

    const handleCreateProject = async () => {
        setActiveTab('images'); 
    };
    
    return (
        <div className="p-6 h-screen overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">My Projects</h2>
                <button
                    onClick={() => handleCreateProject()}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                    <PlusCircle size={16} />
                    New Project
                </button>
            </div>

            {loading && <Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} />}
            {!loading && projects.length === 0 && (
                <p className="text-gray-500 text-center">No projects found.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 p-2">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="relative border rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition cursor-pointer w-full max-w-xs h-80  overflow-hidden"
                        onClick={() => setActiveTab('images')}
                    >
                        {project.images?.length > 0 && (
                            <img
                                src={project.images[0].publicUrl}
                                alt={project.form_data.elr}
                                className="absolute top-0 left-0 w-full h-full object-cover"
                            />
                        )}
                        <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 p-3 text-white text-center">
                            <h3 className="text-lg font-semibold truncate">{project.form_data.elr}</h3>
                            <p className="text-sm truncate">{project.form_data.structureNo || 'No Structure Number'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
