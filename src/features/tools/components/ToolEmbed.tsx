
import { ToolEmbedProps, isToolId, configToolIds } from '../../../core/tools';
import { ConfigCalculator } from './ConfigCalculator';
import { toolRegistry } from '../registry';

export function ToolEmbed({ toolId, prefill, onClose }: ToolEmbedProps) {
  if (!isToolId(toolId)) {
    return <div className="p-4 text-red-500 font-bold border-2 border-red-500">Unknown Tool: {toolId}</div>;
  }

  // If it's a config tool, render it via the generic ConfigCalculator
  if ((configToolIds as readonly string[]).includes(toolId)) {
    const def = toolRegistry[toolId as keyof typeof toolRegistry];
    return (
      <div className="relative">
        {onClose && (
          <button onClick={onClose} className="absolute right-2 top-2 font-bold text-lg bg-gray-200 border-2 border-black w-8 h-8 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            ×
          </button>
        )}
        <ConfigCalculator toolDef={def} prefill={prefill} />
      </div>
    );
  }

  // Bespoke & static tools will go here later (R2, R3)
  return (
    <div className="p-4 border-2 border-dashed border-gray-400 bg-gray-50 text-center">
      <h3 className="font-bold text-gray-700">[{toolId}]</h3>
      <p className="text-sm text-gray-500">Bespoke/Static tool placeholder</p>
      {onClose && <button onClick={onClose} className="mt-4 px-4 py-2 border-2 border-black bg-blue-100 font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]">Close</button>}
    </div>
  );
}
