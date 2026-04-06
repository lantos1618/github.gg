"use client";
import { DiagramType, DIAGRAM_TYPES } from '@/lib/types/diagram';
import { TextButton } from '@/components/ui/text-button';

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
          <TextButton
            key={dt.value}
            onClick={() => onDiagramTypeChange(dt.value as DiagramType)}
            data-testid={`diagram-type-${dt.value}-btn`}
            active={diagramType === dt.value}
            size="base"
            className="pb-1 font-medium"
            disabled={disabled || diagramType === dt.value}
            type="button"
          >
            {dt.label}
          </TextButton>
        ))}
      </div>
    </div>
  );
}
