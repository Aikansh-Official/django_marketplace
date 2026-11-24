import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { num: 1, label: 'Details' },
  { num: 2, label: 'ID Card' },
  { num: 3, label: 'Verify OTP' },
  { num: 4, label: 'Password' }
];

export default function RegisterStepper({ step, role = 'BUYER' }) {
  const steps = role === 'BUYER' 
    ? [
        { num: 1, label: 'Details' },
        { num: 2, label: 'Verify OTP' },
        { num: 3, label: 'Password' }
      ]
    : [
        { num: 1, label: 'Details' },
        { num: 2, label: 'ID Card' },
        { num: 3, label: 'Selfie' },
        { num: 4, label: 'Verify OTP' },
        { num: 5, label: 'Password' }
      ];

  return (
    <div className="mb-6 pb-4 border-b border-gray-100">
      <div className="flex items-center justify-between max-w-sm mx-auto">
        {steps.map((item, idx) => {
          const isCompleted = step > item.num;
          const isCurrent = step === item.num;
          return (
            <React.Fragment key={item.num}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                      ? 'bg-brand-500 text-white ring-4 ring-brand-500/20 font-black'
                      : 'bg-gray-100 text-gray-400 font-medium'
                    }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : item.num}
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] mt-1.5 font-bold tracking-tight text-center ${isCurrent ? 'text-brand-600' : isCompleted ? 'text-emerald-700' : 'text-gray-400'
                    }`}
                >
                  {item.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 sm:mx-2 -mt-5 transition-all ${step > idx + 1 ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
