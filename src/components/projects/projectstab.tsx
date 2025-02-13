import React, { useEffect, useState } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
// import { useProjectStore } from '../../store/projectStore';
import { createProject, getProjects } from '../../lib/supabase';
import { TabType } from '../../components/layout/MainLayout';

interface ProjectsTabProps {
    setActiveTab: (tab: TabType) => void;
    activeTab?: TabType;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({ setActiveTab }) => {
    const { user } = useAuthStore();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    // const [showModal, setShowModal] = useState(false);
    // const { formData, setFormData } = useProjectStore();

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            try {
                if (user?.id) {
                    const projects = await getProjects(user.id);
                    setProjects(projects);
                }
            } catch (error) {
                console.error('Error fetching projects:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const handleCreateProject = async () => {
        setActiveTab('images'); 
    };
    

    return (
        <div className="p-6">
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

<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
    {projects.map((project) => (
        <div
            key={project.id}
            className="relative border rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition cursor-pointer w-72 h-72 overflow-hidden"
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


            {/* MODAL FOR PROJECT CREATION */}
            {/* {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-96">
                        <div className="flex justify-between items-center border-b pb-2 mb-4">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Create New Project</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-medium">ELR</label>
                                <input
                                    type="text"
                                    name="elr"
                                    value={formData.elr}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-indigo-300 dark:bg-gray-800 dark:border-gray-600"
                                    placeholder="Enter ELR"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-medium">Structure No</label>
                                <input
                                    type="text"
                                    name="structureNo"
                                    value={formData.structureNo}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-indigo-300 dark:bg-gray-800 dark:border-gray-600"
                                    placeholder="Enter Structure Number"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-medium">Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-indigo-300 dark:bg-gray-800 dark:border-gray-600"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end mt-6 space-x-4">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateProject}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Project'}
                            </button>
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    );
};
