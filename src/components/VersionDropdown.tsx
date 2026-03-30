"use client";
import React from 'react';

interface Version {
  version: number;
  updatedAt: string;
}

interface VersionDropdownProps {
  versions: Version[] | undefined;
  isLoading: boolean;
  selectedVersion: number | null;
  onVersionChange: (version: number | null) => void;
}

export function VersionDropdown({ versions, isLoading, selectedVersion, onVersionChange }: VersionDropdownProps) {
  if (isLoading) return <div className="h-8 w-32 bg-[#f8f9fa] rounded animate-pulse" />;
  if (!versions || versions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-[#aaa] font-semibold tracking-[1.5px] uppercase">Version</label>
      <select
        value={selectedVersion ?? versions[0].version}
        onChange={e => onVersionChange(Number(e.target.value))}
        className="border border-[#ddd] rounded px-2 py-1 text-[13px] text-[#333] bg-white focus:border-[#111] focus:outline-none"
      >
        {versions.map(v => (
          <option key={v.version} value={v.version}>
            v{v.version} ({new Date(v.updatedAt).toLocaleDateString()})
          </option>
        ))}
      </select>
      {selectedVersion && (
        <button
          className="text-[13px] text-[#888] hover:text-[#111] transition-colors"
          onClick={() => onVersionChange(null)}
        >
          Latest
        </button>
      )}
    </div>
  );
}
