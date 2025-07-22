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
  if (isLoading) return <div>Loading versions...</div>;
  if (!versions || versions.length === 0) return null;
  
  return (
    <div className="mb-4">
      <label className="mr-2 font-semibold">Version history:</label>
      <select
        value={selectedVersion ?? versions[0].version}
        onChange={e => onVersionChange(Number(e.target.value))}
        className="border rounded px-2 py-1"
      >
        {versions.map(v => (
          <option key={v.version} value={v.version}>
            Version {v.version} ({new Date(v.updatedAt).toLocaleString()})
          </option>
        ))}
      </select>
      {selectedVersion && (
        <button 
          className="ml-2 text-blue-600 underline" 
          onClick={() => onVersionChange(null)}
        >
          View Latest
        </button>
      )}
    </div>
  );
} 