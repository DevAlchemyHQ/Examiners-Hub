import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { Header } from '../components/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { MainContent } from '../components/layout/MainContent';
import { getProject } from '../lib/supabase';

interface MainLayoutProps {
    children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { setFormData, reset: resetMetadata } = useMetadataStore();

    useEffect(() => {
        const fetchProject = async () => {
            if (projectId) {
                try {
                    const project = await getProject(projectId);
                    if (project) {
                        setSelectedProject(project);
                        setFormData({
                            elr: project.elr,
                            structureNo: project.structureNo,
                            date: project.date,
                        });
                    } else {
                        navigate('/projects');
                    }
                } catch (error) {
                    console.error('Error fetching project:', error);
                    resetMetadata();
                    navigate('/projects');
                }
            }
            setIsLoading(false);
        };
        fetchProject();
    }, [projectId, navigate]);

    if (children) {
        return (
            <>
                <Header />
                {children}
            </>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-slate-600 dark:text-gray-400 mt-4">Just a Moment...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
            <Header />
            <main className="flex-1 max-w-[1920px] mx-auto w-full px-2 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-4 mt-5">
                <div className="lg:col-span-2">
                    <Sidebar selectedProject={selectedProject} />
                </div>
                <MainContent selectedProject={selectedProject} />
            </main>
        </div>
    );
};
