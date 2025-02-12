import React, { useEffect, useState } from 'react';
import { getAllProjects } from '../../lib/supabase';
import { Loader2, PlusCircle } from 'lucide-react';
import { TabType } from '../../components/layout/MainLayout';

interface ProjectsTabProps {
    setActiveTab: (tab: TabType) => void;
    activeTab?: TabType;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({ setActiveTab }) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            try {
                const projects = await getAllProjects();
                setProjects(projects);
            } catch (error) {
                console.error('Error fetching projects:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const handleCreateProject = async () => {
        setActiveTab?.('images');
    };

    const handleProjectClick = () => {
        setActiveTab('images');
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">My Projects</h2>
                <button
                    onClick={handleCreateProject}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                    {loading ? 'Creating...' : 'New Project'}
                </button>
            </div>

            {loading && <Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} />}
            {!loading && projects.length === 0 && (
                <p className="text-gray-500 text-center">No projects found.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="relative border rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition cursor-pointer w-48 h-48 overflow-hidden"
                        onClick={handleProjectClick}
                    >
                        {project.images && project.images.length > 0 && (
                            <img
                                src={project.images[0].publicUrl}
                                alt={project.form_data.elr}
                                className="absolute top-0 left-0 w-full h-full object-cover"
                            />
                        )}
                        <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 p-2 text-white text-center">
                            <h3 className="text-lg font-semibold truncate">{project.form_data.elr}</h3>
                            <p className="text-sm truncate">{project.form_data.structureNo || 'No Structure Number'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
