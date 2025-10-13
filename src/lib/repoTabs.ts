export type RepoTab = {
  key: string;
  label: string;
  path: string;
};

export const REPO_TABS: RepoTab[] = [
  { key: 'files', label: 'Files', path: '' },
  { key: 'scorecard', label: 'Scorecard', path: 'scorecard' },
  { key: 'diagram', label: 'Diagram', path: 'diagram' },
  { key: 'issues', label: 'Issues', path: 'issues' },
  { key: 'pulls', label: 'Pulls', path: 'pulls' },
];

export function getTabPaths() {
  return REPO_TABS.map(tab => tab.path).filter(Boolean);
} 