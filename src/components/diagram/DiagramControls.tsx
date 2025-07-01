"use client";

interface DiagramControlsProps {
  showCodePanel: boolean;
  onToggleCodePanel: () => void;
  onCopyMermaid: () => void;
  onCopyDiagram: () => void;
  disabled?: boolean;
}

export function DiagramControls({
  showCodePanel,
  onToggleCodePanel,
  onCopyMermaid,
  onCopyDiagram,
  disabled = false
}: DiagramControlsProps) {
  return (
    <div className="flex items-center gap-2 p-4 border-b bg-gray-50 justify-start">
      <button
        onClick={onToggleCodePanel}
        disabled={disabled}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
      >
        {showCodePanel ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Hide Code
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Show Code
          </>
        )}
      </button>
      <button
        onClick={onCopyMermaid}
        disabled={disabled}
        className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
      >
        Copy Mermaid
      </button>
      <button
        onClick={onCopyDiagram}
        disabled={disabled}
        className="bg-green-100 hover:bg-green-200 text-green-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
      >
        Copy Diagram
      </button>
    </div>
  );
} 