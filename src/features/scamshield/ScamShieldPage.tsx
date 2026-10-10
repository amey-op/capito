import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGameStore, selectDispatch } from '../../core/store';
import scenariosData from './data/scenarios.json';

interface Scenario {
  id: string;
  channel: string;
  isScam: boolean;
  redFlags: string[];
}

export function ScamShieldPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useGameStore(selectDispatch);

  // Shuffle and pick 10 ensuring mix of genuine and scam (randomized simply)
  const deck = useMemo(() => {
    const shuffled = [...(scenariosData as Scenario[])].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [chosenScam, setChosenScam] = useState<boolean | null>(null);

  const scenario = deck[currentIndex];

  const handleChoice = (votedScam: boolean) => {
    if (showAnswer) return;
    setChosenScam(votedScam);
    if (votedScam === scenario.isScam) {
      setCorrectCount(c => c + 1);
    }
    setShowAnswer(true);
  };

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setShowAnswer(false);
      setChosenScam(null);
      setCurrentIndex(i => i + 1);
    } else {
      // Finish
      dispatch({ type: 'SHIELD_RESULT', seen: deck.length, correct: correctCount });
      navigate(-1); // Or to wherever Amey routes us next
    }
  };

  if (!scenario) return null;

  const isCorrect = chosenScam === scenario.isScam;

  return (
    <div className="min-h-screen bg-white p-4 max-w-sm mx-auto flex flex-col font-['Nunito']">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight">{t('scamshield.ui.title')}</h1>
        <div className="font-bold border-2 border-black px-2 py-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          {currentIndex + 1} / {deck.length}
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        <div className="bg-blue-50 border-4 border-black p-4 mb-6 relative shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <div className="absolute top-0 right-0 bg-black text-white px-2 py-1 text-xs font-bold uppercase">
            {scenario.channel}
          </div>
          <p className="font-semibold text-lg mt-4 mb-4">
            {t(`scamshield.scenario.${scenario.id}.message`)}
          </p>
        </div>

        {!showAnswer ? (
          <div className="flex gap-4 mt-auto mb-8">
            <button 
              onClick={() => handleChoice(true)}
              className="flex-1 bg-red-400 border-4 border-black py-3 font-black uppercase text-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform"
            >
              {t('scamshield.ui.scam')}
            </button>
            <button 
              onClick={() => handleChoice(false)}
              className="flex-1 bg-green-400 border-4 border-black py-3 font-black uppercase text-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform"
            >
              {t('scamshield.ui.safe')}
            </button>
          </div>
        ) : (
          <div className="mt-auto mb-8 animate-fade-in">
            <div className={`p-4 border-4 border-black mb-4 font-bold shadow-[4px_4px_0px_rgba(0,0,0,1)] ${isCorrect ? 'bg-green-200' : 'bg-red-200'}`}>
              <h2 className="text-xl uppercase mb-2">
                {isCorrect ? t('scamshield.ui.correct') : t('scamshield.ui.wrong')}
              </h2>
              <p className="mb-2">{t(`scamshield.scenario.${scenario.id}.tell`)}</p>
              
              {scenario.isScam && scenario.redFlags.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-black">
                  <p className="uppercase text-xs tracking-wider mb-1 opacity-80">{t('scamshield.ui.why')}</p>
                  <ul className="list-disc pl-4 text-sm">
                    {scenario.redFlags.map(flag => (
                      <li key={flag}>{t(`scamshield.flag.${flag}`)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {scenario.isScam && (
                <div className="mt-4 pt-4 border-t-2 border-black text-sm bg-black text-white p-2 text-center uppercase tracking-widest">
                  {t('scamshield.ui.reportTo', { target: t(`scamshield.scenario.${scenario.id}.report`) })}
                </div>
              )}
            </div>
            
            <button 
              onClick={handleNext}
              className="w-full bg-blue-400 border-4 border-black py-3 font-black uppercase text-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform"
            >
              {currentIndex < deck.length - 1 ? t('scamshield.ui.next') : t('scamshield.ui.finish')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
