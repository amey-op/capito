import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { economy } from '../../../core/economy.config';
import { formatRupee } from '../../../core/format';

type Asset = 'savings' | 'fd' | 'gold' | 'mf' | 'shares';

export function BadYearSimulator() {
  const [amount, setAmount] = useState(10000);
  const [mix, setMix] = useState<Record<Asset, number>>({
    savings: 20,
    fd: 20,
    gold: 20,
    mf: 20,
    shares: 20
  });

  const totalPct = Object.values(mix).reduce((a, b) => a + b, 0);

  const handleMixChange = (asset: Asset, val: number) => {
    setMix(prev => ({ ...prev, [asset]: val }));
  };

  const chartData = useMemo(() => {
    // If not 100%, we won't calculate properly, or we just scale it. Let's assume normalized internally.
    const normMix = { ...mix };
    if (totalPct > 0) {
      for (const k in normMix) {
        normMix[k as Asset] = (normMix[k as Asset] / totalPct) * 100;
      }
    }

    const data = [];
    let steadyVal = amount;
    let bumpyVal = amount;
    let crashVal = amount;

    data.push({
      year: 0,
      Steady: steadyVal,
      Bumpy: bumpyVal,
      Crash: crashVal
    });

    for (let yr = 0; yr < 5; yr++) {
      let steadyGrowth = 0;
      let bumpyGrowth = 0;
      let crashGrowth = 0;

      for (const asset of ['savings', 'fd', 'gold', 'mf', 'shares'] as Asset[]) {
        const alloc = normMix[asset] / 100;
        steadyGrowth += alloc * (economy.scenarios.steady[asset][yr] / 100);
        bumpyGrowth += alloc * (economy.scenarios.bumpy[asset][yr] / 100);
        crashGrowth += alloc * (economy.scenarios.crashYear[asset][yr] / 100);
      }

      steadyVal *= (1 + steadyGrowth);
      bumpyVal *= (1 + bumpyGrowth);
      crashVal *= (1 + crashGrowth);

      data.push({
        year: yr + 1,
        Steady: Math.round(steadyVal),
        Bumpy: Math.round(bumpyVal),
        Crash: Math.round(crashVal)
      });
    }

    return data;
  }, [amount, mix, totalPct]);

  return (
    <div className="p-4 border-4 border-black bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] max-w-sm mx-auto font-['Nunito']">
      <h2 className="text-xl font-black mb-2 uppercase">Market Simulator</h2>
      <p className="text-xs font-bold bg-yellow-100 border border-black p-2 mb-4 uppercase tracking-widest text-center">
        Pretend market, not a prediction
      </p>

      <div className="mb-4">
        <label className="block font-bold mb-1 text-sm">Initial Investment</label>
        <input 
          type="number" 
          value={amount} 
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full border-2 border-black p-2 font-bold"
        />
      </div>

      <div className="bg-gray-50 border-2 border-black p-3 mb-6">
        <label className="block font-bold mb-2 text-sm uppercase border-b-2 border-black pb-1">
          Asset Mix ({totalPct}%)
        </label>
        {(Object.keys(mix) as Asset[]).map(asset => (
          <div key={asset} className="flex items-center mb-2 text-sm font-bold">
            <span className="w-20 uppercase">{asset}</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={mix[asset]} 
              onChange={(e) => handleMixChange(asset, Number(e.target.value))}
              className="flex-1 accent-black mr-2"
            />
            <span className="w-8 text-right">{mix[asset]}%</span>
          </div>
        ))}
        {totalPct !== 100 && (
          <p className="text-red-500 text-xs font-bold uppercase mt-2">
            Warning: Total is not 100%. Values will be scaled.
          </p>
        )}
      </div>

      <div className="h-[250px] w-full mb-6 border-2 border-black p-2 bg-gray-50">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
            <XAxis dataKey="year" fontSize={12} tickLine={false} />
            <YAxis 
              fontSize={12} 
              tickLine={false} 
              tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} 
              width={60}
            />
            <Tooltip 
              formatter={(value: number) => formatRupee(value)}
              contentStyle={{ border: '2px solid black', borderRadius: 0, fontWeight: 'bold', fontFamily: 'Nunito' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
            <Line type="monotone" dataKey="Steady" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
            <Line type="monotone" dataKey="Bumpy" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
            <Line type="monotone" dataKey="Crash" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t-4 border-black pt-4 text-sm font-bold">
        <div className="flex justify-between mb-2">
          <span>Final Steady:</span>
          <span className="text-green-600">{formatRupee(chartData[5].Steady)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Final Bumpy:</span>
          <span className="text-yellow-600">{formatRupee(chartData[5].Bumpy)}</span>
        </div>
        <div className="flex justify-between">
          <span>Final Crash Year:</span>
          <span className="text-red-600">{formatRupee(chartData[5].Crash)}</span>
        </div>
      </div>
    </div>
  );
}
