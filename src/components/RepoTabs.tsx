import React from 'react';

interface Tab {
  key: string;
  label: string;
}

interface RepoTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export default function RepoTabs({ tabs, activeTab, onTabChange }: RepoTabsProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
      <div style={{
        display: 'flex',
        gap: 16,
        background: '#f3f4f6',
        borderRadius: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        padding: '6px 12px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              padding: '10px 28px',
              borderRadius: 18,
              border: 'none',
              background: tab.key === activeTab ? '#2563eb' : 'transparent',
              color: tab.key === activeTab ? 'white' : '#111827',
              fontWeight: tab.key === activeTab ? 700 : 500,
              fontSize: 18,
              cursor: 'pointer',
              boxShadow: tab.key === activeTab ? '0 2px 8px rgba(37,99,235,0.10)' : undefined,
              transition: 'background 0.2s, color 0.2s',
              outline: 'none',
            }}
            onMouseOver={e => {
              if (tab.key !== activeTab) e.currentTarget.style.background = '#e0e7ef';
            }}
            onMouseOut={e => {
              if (tab.key !== activeTab) e.currentTarget.style.background = 'transparent';
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
} 