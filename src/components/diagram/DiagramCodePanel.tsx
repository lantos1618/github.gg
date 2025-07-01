"use client";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface DiagramCodePanelProps {
  showCodePanel: boolean;
  editableCode: string;
  onCodeChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  lastCodePanelSize: number;
  onCodePanelSizeChange: (size: number) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function DiagramCodePanel({
  showCodePanel,
  editableCode,
  onCodeChange,
  lastCodePanelSize,
  onCodePanelSizeChange,
  disabled = false,
  children
}: DiagramCodePanelProps) {
  if (!showCodePanel) {
    return (
      <div className="bg-white w-full">
        {children}
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel 
        minSize={10} 
        maxSize={60} 
        defaultSize={lastCodePanelSize} 
        onResize={onCodePanelSizeChange} 
        className="bg-gray-50 border-r"
      >
        <div className="flex-1 flex flex-col p-4 h-full">
          <h2 className="font-bold mb-2 text-left">Mermaid Code</h2>
          <textarea
            className="bg-white p-4 rounded border text-left overflow-x-auto text-xs md:text-sm font-mono w-full h-full min-h-[300px] resize-vertical"
            value={editableCode}
            onChange={onCodeChange}
            spellCheck={false}
            disabled={disabled}
            style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}
            wrap="soft"
          />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel minSize={30} defaultSize={100 - lastCodePanelSize} className="bg-white">
        <div className="flex flex-col p-4 h-full">
          {children}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
} 