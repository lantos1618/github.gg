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
      <div className="flex gap-4">
        {DIAGRAM_TYPES.map(dt => (
          <button
            key={dt.value}
            onClick={() => onDiagramTypeChange(dt.value as DiagramType)}
            data-testid={`diagram-type-${dt.value}-btn`}
            className={`pb-1 text-base font-medium border-b-2 transition-colors
              ${diagramType === dt.value
                ? 'border-[#111] text-[#111]'
                : 'border-transparent text-[#999] hover:text-[#666] hover:border-[#666]'
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
