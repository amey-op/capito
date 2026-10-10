import { useState } from 'react';
import { formatINR } from '../../../core/format';

export function UpiPractice() {
  const [tab, setTab] = useState<'send' | 'receive'>('send');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'good' | 'bad' | null>(null);

  const handlePinTap = (isSend: boolean) => {
    if (isSend) {
      setFeedback("Correct! You enter your PIN to authorize sending money.");
      setFeedbackType('good');
    } else {
      setFeedback("STOP! A PIN is ONLY for sending money. Scammers use 'Receive' requests to steal from you.");
      setFeedbackType('bad');
    }
  };

  return (
    <div className="p-4 border-4 border-black bg-gray-100 shadow-[6px_6px_0px_rgba(0,0,0,1)] max-w-sm mx-auto font-['Nunito']">
      <h2 className="text-xl font-black mb-4 uppercase text-center">UPI Practice</h2>
      
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => { setTab('send'); setFeedback(null); }}
          className={`flex-1 font-bold py-2 border-2 border-black ${tab === 'send' ? 'bg-black text-white' : 'bg-white text-black'}`}
        >
          Send Money
        </button>
        <button 
          onClick={() => { setTab('receive'); setFeedback(null); }}
          className={`flex-1 font-bold py-2 border-2 border-black ${tab === 'receive' ? 'bg-black text-white' : 'bg-white text-black'}`}
        >
          Receive Money
        </button>
      </div>

      <div className="bg-white border-2 border-black p-4 mb-4 min-h-[250px] flex flex-col items-center justify-center">
        {tab === 'send' ? (
          <>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2 border-2 border-black font-bold">
              SJ
            </div>
            <p className="font-bold">Paying Suresh Traders</p>
            <p className="text-3xl font-black mb-6">{formatINR(500)}</p>
            
            <button 
              onClick={() => handlePinTap(true)}
              className="w-full max-w-[200px] border-2 border-black border-dashed bg-gray-50 py-3 text-center font-bold text-gray-500 hover:bg-gray-200 uppercase"
            >
              Enter UPI PIN
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2 border-2 border-black font-bold">
              UK
            </div>
            <p className="font-bold">Unknown User requested money</p>
            <p className="text-3xl font-black mb-2">{formatINR(5000)}</p>
            <p className="text-xs font-bold text-red-500 uppercase mb-6 bg-red-50 px-2 py-1 border border-red-200">
              Note: Refund Process
            </p>
            
            <button 
              onClick={() => handlePinTap(false)}
              className="w-full max-w-[200px] border-2 border-black border-dashed bg-gray-50 py-3 text-center font-bold text-gray-500 hover:bg-gray-200 uppercase"
            >
              Enter UPI PIN
            </button>
          </>
        )}
      </div>

      {feedback && (
        <div className={`p-3 border-2 border-black font-bold animate-fade-in ${feedbackType === 'good' ? 'bg-green-200' : 'bg-red-400 text-white'}`}>
          {feedback}
        </div>
      )}
    </div>
  );
}
