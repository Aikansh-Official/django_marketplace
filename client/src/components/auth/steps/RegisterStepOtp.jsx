import React from 'react';
import { Loader2, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';

export default function RegisterStepOtp({
  register,
  setValue,
  watch,
  errors,
  emailValue,
  isLoading,
  onVerifyOtp,
  onResendOtp,
  onBack,
  role = 'BUYER'
}) {
  const otpVal = watch ? (watch('otp') || '') : '';

  return (
    <div className="space-y-4">
      <div className="mb-3 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-2 text-brand-600 shadow-2xs">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
          Enter Verification Code
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          6-digit numeric code sent to <strong className="text-gray-800 font-semibold">{emailValue}</strong>
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Enter 6-Digit OTP
          </label>
          <span className={`text-[11px] font-bold ${otpVal.length === 6 ? 'text-emerald-600' : 'text-gray-400'}`}>
            {otpVal.length}/6 digits
          </span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={6}
          {...register('otp')}
          onKeyDown={(e) => {
            if (!/[0-9]/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
            if (setValue) {
              setValue('otp', digits, { shouldValidate: true });
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (setValue) {
              setValue('otp', pasted, { shouldValidate: true });
            }
          }}
          className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 text-center font-black tracking-[0.4em] text-2xl rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-300"
          placeholder="••••••"
        />
        {errors.otp && <p className="text-red-500 text-xs font-medium mt-1 text-center">{errors.otp.message}</p>}
        <p className="text-[11px] text-gray-400 text-center mt-1.5">
          Only numbers (0-9) are accepted
        </p>
      </div>

      <button
        type="button"
        onClick={onVerifyOtp}
        disabled={isLoading || otpVal.length !== 6}
        className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying Code...</span>
          </>
        ) : (
          <>
            <span>Verify Code & Continue</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <div className="flex items-center justify-between text-xs pt-1">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {role === 'BUYER' ? 'Back to Details' : 'Back to Selfie'}
        </button>
        <button
          type="button"
          onClick={onResendOtp}
          disabled={isLoading}
          className="text-brand-600 hover:text-brand-700 font-bold hover:underline cursor-pointer"
        >
          Resend Code
        </button>
      </div>
    </div>
  );
}
