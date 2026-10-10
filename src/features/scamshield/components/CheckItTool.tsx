import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function CheckItTool() {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<number, boolean | null>>({
    1: null, 2: null, 3: null, 4: null, 5: null
  });

  const toggleAnswer = (q: number, val: boolean) => {
    setAnswers(prev => ({ ...prev, [q]: val }));
  };

  const noCount = Object.values(answers).filter(v => v === false).length;
  const answeredAll = Object.values(answers).every(v => v !== null);

  return (
    <div className="p-4 border-4 border-black bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] max-w-sm mx-auto">
      <h2 className="text-xl font-black mb-4 uppercase">{t('scamshield.checkIt.title')}</h2>
      
      <div className="space-y-4 mb-6">
        {[1, 2, 3, 4, 5].map((q) => (
          <div key={q} className="bg-gray-50 border-2 border-black p-3">
            <p className="font-bold text-sm mb-2">{t(`scamshield.checkIt.q${q}`)}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => toggleAnswer(q, true)}
                className={`flex-1 font-bold py-1 border-2 border-black ${answers[q] === true ? 'bg-green-400' : 'bg-white'}`}
              >
                Yes
              </button>
              <button 
                onClick={() => toggleAnswer(q, false)}
                className={`flex-1 font-bold py-1 border-2 border-black ${answers[q] === false ? 'bg-red-400' : 'bg-white'}`}
              >
                No
              </button>
            </div>
          </div>
        ))}
      </div>

      {answeredAll && (
        <div className={`p-4 border-2 border-black font-bold text-center ${noCount > 1 ? 'bg-red-200' : 'bg-green-200'}`}>
          {noCount > 1 ? t('scamshield.checkIt.verdictStop') : t('scamshield.checkIt.verdictSafe')}
        </div>
      )}
    </div>
  );
}
