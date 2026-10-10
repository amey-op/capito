import { useTranslation } from 'react-i18next';

export function NowWhatTool() {
  const { t } = useTranslation();

  return (
    <div className="p-4 border-4 border-black bg-white shadow-[6px_6px_0px_rgba(0,0,0,1)] max-w-sm mx-auto">
      <h2 className="text-xl font-black mb-4 uppercase">{t('scamshield.nowWhat.title')}</h2>
      
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="flex gap-3 items-start p-3 border-2 border-black bg-yellow-50 relative">
            <div className="w-6 h-6 flex-shrink-0 bg-black text-white font-bold flex items-center justify-center rounded-full">
              {step}
            </div>
            <div>
              <p className="font-bold">{t(`scamshield.nowWhat.step${step}`)}</p>
              <p className="text-sm opacity-80">{t(`scamshield.nowWhat.step${step}_desc`)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
