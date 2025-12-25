import { FlaskConical, Rocket, GitPullRequest, Layers, Target, Sprout, Info } from 'lucide-react';

export const ARCHETYPE_INFO: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  'Research & Innovation': {
    icon: <FlaskConical className="h-3 w-3" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    label: 'Researcher'
  },
  'Production Builder': {
    icon: <Rocket className="h-3 w-3" />,
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    label: 'Builder'
  },
  'Open Source Contributor': {
    icon: <GitPullRequest className="h-3 w-3" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'OSS Contributor'
  },
  'Full-Stack Generalist': {
    icon: <Layers className="h-3 w-3" />,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    label: 'Generalist'
  },
  'Domain Specialist': {
    icon: <Target className="h-3 w-3" />,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50 border-indigo-200',
    label: 'Specialist'
  },
  'Early Career Explorer': {
    icon: <Sprout className="h-3 w-3" />,
    color: 'text-teal-700',
    bgColor: 'bg-teal-50 border-teal-200',
    label: 'Explorer'
  },
};

const DEFAULT_ARCHETYPE = {
  icon: <Info className="h-3 w-3" />,
  color: 'text-gray-700',
  bgColor: 'bg-gray-50 border-gray-200',
  label: 'Unknown'
};

export const getArchetypeInfo = (archetype: string) => ARCHETYPE_INFO[archetype] || { ...DEFAULT_ARCHETYPE, label: archetype };
