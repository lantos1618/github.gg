"use client";
import { useRouter, usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, BarChart3, Network } from 'lucide-react';
import { REPO_TABS } from '@/lib/repoTabs';

export default function RepoTabsBar() {
  const router = useRouter();
  const pathname = usePathname();

  const { activeTab, basePath } = useMemo(() => {
    const segments = pathname.replace(/\/$/, '').split('/');
    const lastSegment = segments[segments.length - 1];
    const activeTab = REPO_TABS.find(tab => tab.path === lastSegment)?.key || 'files';
    const basePath = REPO_TABS.some(tab => tab.path === lastSegment) 
      ? segments.slice(0, -1).join('/') 
      : pathname.replace(/\/$/, '');
    
    return { activeTab, basePath };
  }, [pathname]);

  const handleTabChange = (key: string) => {
    const tab = REPO_TABS.find(t => t.key === key);
    const newPath = tab?.path ? `${basePath}/${tab.path}` : basePath;
    router.replace(newPath);
  };

  const tabIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    files: FileText,
    scorecard: BarChart3,
    diagram: Network,
  };

  return (
    <div className="max-w-screen-xl w-full mx-auto px-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto mb-8">
        <nav className="flex min-w-max" aria-label="Content navigation">
          {REPO_TABS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            const Icon = tabIcons[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`
                  relative flex items-center space-x-2 px-4 lg:px-6 py-3 lg:py-4 text-sm font-medium transition-all duration-200 whitespace-nowrap
                  ${
                    index === 0 ? 'rounded-l-lg' : ''
                  }
                  ${
                    index === REPO_TABS.length - 1 ? 'rounded-r-lg' : ''
                  }
                  ${
                    isActive
                      ? 'text-blue-700 bg-blue-50 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {Icon && (
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  />
                )}
                <span>{tab.label}</span>

                {/* Active tab indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
} 