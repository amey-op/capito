import { useState } from 'react';
import { formatRupee } from '../../../core/format';

export function BudgetBuilder() {
  const M = 4000; // Default practice money
  const [savingsPct, setSavingsPct] = useState(40);
  const [surprise, setSurprise] = useState<number | null>(null);

  const savings = Math.round((M * savingsPct) / 100);
  const wants = M - savings;
  const whatsLeft = savings - (surprise || 0);

  const triggerSurprise = () => {
    const amt = Math.floor(Math.random() * (1500 - 600 + 1)) + 600;
    setSurprise(amt);
  };

  const resetSurprise = () => setSurprise(null);

  return (
    <div className="p-4 border-4 border-black bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] max-w-sm mx-auto font-['Nunito']">
      <h2 className="text-xl font-black mb-2 uppercase">Budget Builder</h2>
      <p className="text-sm font-bold opacity-80 mb-6">
        Practice Money: {formatRupee(M)} (Needs are covered by family)
      </p>

      <div className="mb-6 bg-gray-50 p-4 border-2 border-black">
        <label className="block font-bold mb-4 uppercase text-sm">
          Allocate your money
        </label>
        
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={savingsPct} 
          onChange={(e) => setSavingsPct(Number(e.target.value))}
          className="w-full accent-black mb-4"
        />

        <div className="flex justify-between font-bold">
          <div className="text-left">
            <span className="block text-xs uppercase opacity-70">Wants ({100 - savingsPct}%)</span>
            {formatRupee(wants)}
          </div>
          <div className="text-right">
            <span className="block text-xs uppercase opacity-70">Savings ({savingsPct}%)</span>
            {formatRupee(savings)}
          </div>
        </div>
      </div>

      {!surprise ? (
        <button 
          onClick={triggerSurprise}
          className="w-full bg-yellow-400 border-4 border-black py-3 font-black uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform mb-4"
        >
          Draw a Surprise Expense
        </button>
      ) : (
        <div className="mb-6 animate-fade-in">
          <div className={`p-4 border-4 border-black mb-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] ${whatsLeft >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
            <h3 className="font-black uppercase mb-1">Surprise!</h3>
            <p className="font-bold mb-4">Your phone screen broke. Cost: {formatRupee(surprise)}</p>
            
            <div className="border-t-2 border-black pt-2 flex justify-between font-bold">
              <span>Savings left:</span>
              <span>{formatRupee(whatsLeft)}</span>
            </div>
            
            <p className="mt-4 text-sm font-semibold">
              {whatsLeft >= 0 
                ? "You handled the emergency gracefully using your savings! No stress."
                : "Oops. You didn't save enough for this emergency. You might have to borrow or cut back on wants."}
            </p>
          </div>
          
          <button 
            onClick={resetSurprise}
            className="w-full bg-blue-200 border-4 border-black py-2 font-black uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
