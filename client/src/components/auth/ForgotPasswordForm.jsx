import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api, { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Hash,
  RefreshCw,
  Check
} from 'lucide-react';
import { forgotPasswordSchema, forgotPasswordResetOTPSchema } from './authSchemas';

export default function ForgotPasswordForm({ onBackToLogin }) {
  // Step 1: 'verify-details', Step 2: 'enter-otp-reset', Step 3: 'success'
  const [step, setStep] = useState('verify-details');
  const [submittedData, setSubmittedData] = useState({ reg_no: '', email: '' });
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Form for Step 1: Registration Number + Email
  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    formState: { errors: errorsStep1, isSubmitting: isSubmittingStep1 },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      reg_no: '',
      email: '',
    },
  });

  // Form for Step 2: OTP + New Password + Confirm Password
  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    watch: watchStep2,
    formState: { errors: errorsStep2, isSubmitting: isSubmittingStep2 },
  } = useForm({
    resolver: zodResolver(forgotPasswordResetOTPSchema),
    defaultValues: {
      otp: '',
      password: '',
      password_confirm: '',
    },
  });

  const passwordValue = watchStep2('password', '');
  const hasMinLength = (passwordValue || '').length >= 8;
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(passwordValue || '');

  // Handle countdown cooldown
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1 Submit: Check DB and Send OTP
  const onSendOTP = async (data) => {
    const cleanRegNo = data.reg_no.trim().replace('@', '');
    const cleanEmail = data.email.trim().toLowerCase();

    try {
      const response = await api.post('/auth/forgot-password/', {
        reg_no: cleanRegNo,
        email: cleanEmail,
      });

      setSubmittedData({ reg_no: cleanRegNo, email: cleanEmail });
      setStep('enter-otp-reset');
      setCooldown(60);
      toast.success(response.data.message || 'Verification code sent to your email.');
    } catch (error) {
      console.error('Password reset request error:', error);
      toast.error(getErrorMessage(error, 'Credentials did not match any registered student account.'));
    }
  };

  // Resend OTP handler
  const handleResendOTP = async () => {
    if (cooldown > 0 || !submittedData.email || isResending) return;

    try {
      setIsResending(true);
      const response = await api.post('/auth/forgot-password/', {
        reg_no: submittedData.reg_no,
        email: submittedData.email,
      });

      setCooldown(60);
      toast.success(response.data.message || 'A new verification code has been dispatched.');
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error(getErrorMessage(error, 'Failed to resend verification code.'));
    } finally {
      setIsResending(false);
    }
  };

  // Step 2 Submit: Verify OTP and Set New Password
  const onResetPassword = async (data) => {
    try {
      const response = await api.post('/auth/reset-password/', {
        reg_no: submittedData.reg_no,
        email: submittedData.email,
        otp: data.otp.trim(),
        password: data.password,
        password_confirm: data.password_confirm,
      });

      setStep('success');
      toast.success(response.data.message || 'Password reset successfully!');
    } catch (error) {
      console.error('Password reset submit error:', error);
      toast.error(getErrorMessage(error, 'Failed to reset password. Please verify the OTP.'));
    }
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      {/* STEP 1: Verify Registration Number & Email */}
      {step === 'verify-details' && (
        <>
          <div className="mb-6 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-3 text-brand-600 shadow-2xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
              Reset Password
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">
              Enter your student credentials to verify your account and receive a reset OTP.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmitStep1(onSendOTP)}>
            {/* Registration Number */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Registration Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={8}
                  {...registerStep1('reg_no')}
                  className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                  placeholder="e.g. 12109876"
                  autoFocus
                />
              </div>
              {errorsStep1.reg_no && (
                <p className="text-red-500 text-xs font-medium mt-1">{errorsStep1.reg_no.message}</p>
              )}
            </div>

            {/* Registered Email */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Registered Email
                </label>
                <span className="text-[11px] font-medium text-gray-400">@gmail.com</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  {...registerStep1('email')}
                  className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                  placeholder="student@gmail.com"
                />
              </div>
              {errorsStep1.email && (
                <p className="text-red-500 text-xs font-medium mt-1">{errorsStep1.email.message}</p>
              )}
            </div>

            {/* Security Verification Notice */}
            <div className="bg-brand-50/60 border border-brand-100 rounded-md p-2.5 flex items-start gap-2 text-[11px] text-brand-900">
              <ShieldCheck className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <span>
                Your Registration Number and Email must both match your registered student account in the database before an OTP is dispatched.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmittingStep1}
              className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-5 disabled:opacity-70 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingStep1 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying & Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send Reset OTP</span>
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
      )}

      {/* STEP 2: Enter OTP & Create New Password */}
      {step === 'enter-otp-reset' && (
        <>
          <div className="mb-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600 shadow-2xs">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight font-display">
              Enter Reset OTP
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              We sent a 6-digit code to{' '}
              <span className="font-semibold text-gray-800">{submittedData.email}</span>
            </p>
            <div className="mt-1 flex items-center justify-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                Reg No: {submittedData.reg_no}
              </span>
              <button
                type="button"
                onClick={() => setStep('verify-details')}
                className="text-brand-600 hover:text-brand-700 font-bold text-xs underline cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmitStep2(onResetPassword)}>
            {/* 6-Digit OTP */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  6-Digit OTP Code
                </label>
                <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  Valid 10 mins
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  {...registerStep2('otp')}
                  className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-mono tracking-widest text-base font-bold rounded-md pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                  placeholder="123456"
                  autoFocus
                />
              </div>
              {errorsStep2.otp && (
                <p className="text-red-500 text-xs font-medium mt-1">{errorsStep2.otp.message}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...registerStep2('password')}
                  className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorsStep2.password && (
                <p className="text-red-500 text-xs font-medium mt-1">{errorsStep2.password.message}</p>
              )}
            </div>

            {/* Password Validation Checklist */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                    hasMinLength ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className={hasMinLength ? 'text-emerald-700 font-semibold text-[11px]' : 'text-gray-500 text-[11px]'}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                    hasSpecialChar ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className={hasSpecialChar ? 'text-emerald-700 font-semibold text-[11px]' : 'text-gray-500 text-[11px]'}>
                  At least one special character (!@#$%^&*)
                </span>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...registerStep2('password_confirm')}
                  className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorsStep2.password_confirm && (
                <p className="text-red-500 text-xs font-medium mt-1">
                  {errorsStep2.password_confirm.message}
                </p>
              )}
            </div>

            {/* Reset Password Button */}
            <button
              type="submit"
              disabled={isSubmittingStep2}
              className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-5 disabled:opacity-70 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingStep2 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Resend OTP & Change info actions */}
          <div className="mt-5 space-y-2.5 text-center">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={cooldown > 0 || isResending}
              className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 font-bold py-2.5 px-4 rounded-md text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Resending...</span>
                </>
              ) : cooldown > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span>Resend code in {cooldown}s</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend Verification Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-600 hover:text-brand-600 transition-colors w-full cursor-pointer py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </button>
          </div>
        </>
      )}

      {/* STEP 3: Password Successfully Reset */}
      {step === 'success' && (
        <div className="text-center py-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 tracking-tight font-display">
            Password Reset Successful!
          </h2>

          <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed max-w-sm mx-auto">
            Your student account password has been updated. You can now sign in using your registration number (<span className="font-bold font-mono text-gray-800">{submittedData.reg_no}</span>) and your new password.
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-4 rounded-md text-sm transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
