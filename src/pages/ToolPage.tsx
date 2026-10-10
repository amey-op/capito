import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ToolEmbed } from '../features/tools';
import { parsePrefill, ToolId } from '../core/tools';

export function ToolPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  if (!id) return null;

  const prefill = parsePrefill(searchParams);

  return (
    <div className="min-h-screen bg-white">
      <header className="p-4 border-b-4 border-black mb-4 flex items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="mr-4 font-bold border-2 border-black px-3 py-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-gray-100"
        >
          ← Back
        </button>
        <h1 className="font-black text-2xl font-['Nunito'] tracking-tight">Tool</h1>
      </header>
      <main className="pb-8">
        <ToolEmbed toolId={id as ToolId} prefill={prefill} />
      </main>
    </div>
  );
}
