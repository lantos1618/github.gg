"use client";
import { DiagramType, DIAGRAM_TYPES } from '@/lib/types/diagram';

interface DiagramTypeSelectorProps {
  diagramType: DiagramType;
  onDiagramTypeChange: (type: DiagramType) => void;
  disabled?: boolean;
}

export function DiagramTypeSelector({
  diagramType,
  onDiagramTypeChange,
  disabled = false
}: DiagramTypeSelectorProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="text-xs text-[#999] font-semibold tracking-[1.5px] uppercase">Type</span>
      <div className="flex gap-1.5">
        {DIAGRAM_TYPES.map(dt => (
          <button
            key={dt.value}
            onClick={() => onDiagramTypeChange(dt.value as DiagramType)}
            data-testid={`diagram-type-${dt.value}-btn`}
            className={`px-3 py-1.5 rounded text-[14px] font-medium transition-colors
              ${diagramType === dt.value
                ? 'bg-[#111] text-white'
                : 'bg-[#f8f9fa] text-[#666] border border-[#eee] hover:border-[#aaa] hover:text-[#111]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={disabled || diagramType === dt.value}
            type="button"
          >
            {dt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
