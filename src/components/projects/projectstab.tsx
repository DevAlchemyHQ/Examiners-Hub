import React, { useEffect, useState } from 'react';
import { getProjects, createProject } from '../../lib/supabase';
import { Loader2, PlusCircle } from 'lucide-react';

export const ProjectsTab: React.FC = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchProjects = async () => {
        setLoading(true);
        try {
            const userId = 'your-user-id';
            const fetchedProjects = await getProjects(userId);
            setProjects(fetchedProjects || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
        };
        fetchProjects();
    }, []);

    const handleCreateProject = async () => {
        setLoading(true);
        try {
        const newProject = await createProject();
        setProjects([...projects, newProject]);
        } catch (error) {
        console.error('Error creating project:', error);
        } finally {
        setLoading(false);
        }
    };

    return (
        <div className="p-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">My Projects</h2>

        <button
            onClick={handleCreateProject}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50"
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
            {loading ? 'Creating...' : 'New Project'}
        </button>

        <div className="mt-4">
            {loading && <Loader2 className="animate-spin text-indigo-500 mx-auto" size={24} />}
            {!loading && projects.length === 0 && <p className="text-gray-500">No projects found.</p>}

            <ul className="mt-4 space-y-2">
            {projects.map((project) => (
                <li key={project.id} className="border p-3 rounded-lg bg-white dark:bg-gray-800">
                <span className="text-gray-800 dark:text-white">{project.name}</span>
                </li>
            ))}
            </ul>
        </div>
        </div>
    );
};
