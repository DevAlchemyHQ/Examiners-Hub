import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ProjectCardProps {
  title: string;
  description: string;
  image: string;
  link: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ title, description, image, link }) => {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-gray-800 transition-transform hover:-translate-y-1">
      <img
        src={image}
        alt={title}
        className="h-48 w-full object-cover transition-transform group-hover:scale-105"
      />
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-400 mb-4">{description}</p>
        <a
          href={link}
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
        >
          View Project <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
};

export default ProjectCard;