import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle, Trash, XCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { useAuthStore } from '../store/authStore';
import { getProject, getProjects, deleteProject, createProject } from '../lib/supabase';

export const ProjectsPage: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);

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

    const handleProjectClick = async (projectId: string) => {
        try {
            const projectData = await getProject(projectId);
            if (projectData) {
                navigate(`/dashboard?projectId=${projectId}`, { state: { project: projectData } });
            }
        } catch (error) {
            console.error("Error fetching project:", error);
        }
    };

    const handleDeleteProject = async () => {
        if (!selectedProject) return;
        try {
            await deleteProject(selectedProject.id);
            setProjects((prev) => prev.filter((project) => project.id !== selectedProject.id));
            setShowDeleteModal(false);
            setSelectedProject(null);
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    };

    const handleCreateProject = async () => {
        if (!user) return "User not found";
        try {
            const newProject = await createProject(user.id, {}, []);
            if (newProject) {
                setProjects((prev) => [...prev, newProject]);
                navigate(`/dashboard?projectId=${newProject.id}`, { state: { project: newProject } });
            }
        } catch (error) {
            console.error("Error creating project:", error);
        }
    };

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

                        <button
                            onClick={handleCreateProject}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                        >
                            <PlusCircle size={16} />
                            New Project
                        </button>
                    </div>

                    {projects.length === 0 ? (
                        <p className="text-gray-500 text-center">No projects found.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-2">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="relative border rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition cursor-pointer w-full max-w-xs h-80 overflow-hidden"
                                    onClick={() => handleProjectClick(project.id)}
                                >
                                    {project.images?.length > 0 && (
                                        <img
                                            src={project.images[0].publicUrl}
                                            alt={project.form_data.elr}
                                            className="absolute top-0 left-0 w-full h-full object-cover"
                                        />
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedProject(project);
                                                setShowDeleteModal(true);
                                            }}
                                            className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition"
                                        >
                                            <Trash className="text-white" size={18} />
                                        </button>
                                    </div>
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

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedProject && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Confirm Deletion</h3>
                            <button onClick={() => setShowDeleteModal(false)}>
                                <XCircle size={24} className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" />
                            </button>
                        </div>
                        <p className="mt-4 text-gray-600 dark:text-gray-300">
                            Are you sure you want to delete <strong>{selectedProject.form_data.elr}</strong>?
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteProject}
                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
