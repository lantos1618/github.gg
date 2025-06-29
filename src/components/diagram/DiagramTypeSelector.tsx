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
    <div className="mb-4 flex justify-center items-center gap-2">
      <span className="mr-2 font-medium">Diagram Type:</span>
      <div className="flex gap-2">
        {DIAGRAM_TYPES.map(dt => (
          <button
            key={dt.value}
            onClick={() => onDiagramTypeChange(dt.value as DiagramType)}
            className={`px-4 py-1 rounded border transition-colors duration-150 font-medium
              ${diagramType === dt.value
                ? 'bg-blue-600 text-white border-blue-700 shadow'
                : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
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