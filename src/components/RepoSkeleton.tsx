import React from 'react';

export default function RepoSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ height: 40, width: 320, background: '#e5e7eb', borderRadius: 8, marginBottom: 24 }} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ height: 32, width: 80, background: '#e5e7eb', borderRadius: 16 }} />
        <div style={{ height: 32, width: 80, background: '#e5e7eb', borderRadius: 16 }} />
      </div>
      <div style={{ height: 300, background: '#f3f4f6', borderRadius: 8 }} />
    </div>
  );
} 