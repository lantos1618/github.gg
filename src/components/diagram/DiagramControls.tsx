"use client";

interface DiagramControlsProps {
  showCodePanel: boolean;
  onToggleCodePanel: () => void;
  onCopyMermaid: () => void;
  onCopyDiagram: () => void;
  onRegenerate?: (renderError?: string) => void;
  renderError?: string;
  disabled?: boolean;
}

export function DiagramControls({
  showCodePanel,
  onToggleCodePanel,
  onCopyMermaid,
  onCopyDiagram,
  onRegenerate,
  renderError,
  disabled = false
}: DiagramControlsProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#eee]">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleCodePanel}
          disabled={disabled}
          className="px-3 py-1.5 bg-[#f8f9fa] text-[#666] text-[13px] font-medium rounded border border-[#eee] hover:border-[#aaa] hover:text-[#111] transition-colors disabled:opacity-50"
        >
          {showCodePanel ? 'Hide Code' : 'Show Code'}
        </button>
        <button
          onClick={onCopyMermaid}
          disabled={disabled}
          className="px-3 py-1.5 bg-[#f8f9fa] text-[#666] text-[13px] font-medium rounded border border-[#eee] hover:border-[#aaa] hover:text-[#111] transition-colors disabled:opacity-50"
        >
          Copy Mermaid
        </button>
        <button
          onClick={onCopyDiagram}
          disabled={disabled}
          className="px-3 py-1.5 bg-[#f8f9fa] text-[#666] text-[13px] font-medium rounded border border-[#eee] hover:border-[#aaa] hover:text-[#111] transition-colors disabled:opacity-50"
        >
          Copy Diagram
        </button>
      </div>

      <div className="flex items-center gap-2">
        {onRegenerate && (
          <button
            onClick={() => onRegenerate(renderError)}
            disabled={disabled}
            data-testid="diagram-controls-regenerate-btn"
            className="px-3 py-1.5 bg-[#111] text-white text-[13px] font-medium rounded hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}
