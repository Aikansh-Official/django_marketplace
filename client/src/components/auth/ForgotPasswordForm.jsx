import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api, { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Mail,
  Loader2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { forgotPasswordSchema } from './authSchemas';

export default function ForgotPasswordForm({ onBackToLogin }) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    try {
      const response = await api.post('/auth/forgot-password/', {
        email: data.email.trim().toLowerCase(),
      });
      setSubmittedEmail(data.email.trim().toLowerCase());
      setIsSuccess(true);
      toast.success(response.data.message || 'Reset link sent to your email.');

      // Start a 60s cooldown for resend button
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Failed to process password reset.'));
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !submittedEmail) return;
    try {
      await api.post('/auth/forgot-password/', {
        email: submittedEmail,
      });
      toast.success('A new reset link has been dispatched to your email.');
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Failed to resend reset link.'));
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {!isSuccess ? (
        <>
          <div className="mb-6 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-3 text-brand-600 shadow-2xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
              Reset Password
            </h2>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              Enter your registered student Gmail to receive a password reset link.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Registered Email
                </label>
                <span className="text-xs font-medium text-gray-400">@gmail.com</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                  placeholder="e.g. student@gmail.com"
                  autoFocus
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs font-medium mt-1">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-5 disabled:opacity-70 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onBackToLogin}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-brand-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 tracking-tight font-display">
            Check your inbox
          </h2>

          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            We sent a secure password reset link to:
          </p>
          <div className="mt-1 font-semibold text-brand-600 bg-brand-50/70 border border-brand-200/60 rounded-md py-1.5 px-3 inline-block text-xs font-mono">
            {submittedEmail}
          </div>

          <div className="mt-4 bg-amber-50/80 border border-amber-200 rounded-md p-3 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>15 Minutes Expiry</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-normal">
              Click the link in your email to choose a new password. If you don't see it, check your spam folder.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleResend}
              disabled={cooldown > 0}
              type="button"
              className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-800 font-bold py-2.5 px-4 rounded-md text-xs transition-all cursor-pointer"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
            </button>

            <button
              onClick={onBackToLogin}
              type="button"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-600 hover:text-brand-600 transition-colors w-full cursor-pointer py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
