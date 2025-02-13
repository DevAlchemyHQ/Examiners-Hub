import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { useAuthStore } from '../store/authStore';
import { getProjects } from '../lib/supabase';

export const ProjectsPage: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate(); // ✅ Navigation hook
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            if (user?.id) {
                try {
                    const fetchedProjects = await getProjects(user.id);
                    setProjects(fetchedProjects);
                } catch (error) {
                    console.error('Error fetching projects:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [user?.id]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
            <Header /> 

            {loading ? (
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                        <p className="text-slate-600 dark:text-gray-400">Loading your projects...</p>
                    </div>
                </main>
            ) : (
                <div className="p-6 h-screen overflow-y-auto flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">My Projects</h2>
                        
                        {/* ✅ Navigate to Dashboard when creating a new project */}
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                        >
                            <PlusCircle size={16} />
                            New Project
                        </button>
                    </div>

                    {projects.length === 0 ? (
                        <p className="text-gray-500 text-center">No projects found.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 p-2">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="relative border rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition cursor-pointer w-full max-w-xs h-80 overflow-hidden"
                                    
                                    // ✅ Navigate to Dashboard with project ID
                                    onClick={() => navigate(`/dashboard?projectId=${project.id}`)}
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
                    )}
                </div>
            )}
        </div>
    );
};
