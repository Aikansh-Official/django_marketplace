import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api, { getErrorMessage } from '../services/api';
import toast from 'react-hot-toast';
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { resetPasswordSchema } from '../components/auth/authSchemas';
import logoImg from '../assets/CampusXChange_Logo.jpeg';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordValue = watch('password', '');

  // Live password validation checklist
  const hasMinLength = passwordValue.length >= 8;
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(passwordValue);

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Reset token is missing. Please use the link provided in your email.');
      return;
    }

    try {
      const response = await api.post('/auth/reset-password/', {
        token: token.trim(),
        password: data.password,
        password_confirm: data.password_confirm,
      });

      setIsSuccess(true);
      toast.success(response.data.message || 'Password reset successfully!');
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Failed to reset password. The link may have expired.'));
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 px-6 py-8 text-center text-white relative">
          <div className="w-14 h-14 mx-auto mb-3 bg-white rounded-xl p-1.5 shadow-md flex items-center justify-center">
            <img src={logoImg} alt="CampusXChange" className="w-full h-full object-cover rounded-lg" />
          </div>
          <h1 className="text-2xl font-black tracking-tight font-display text-white">
            CampusXChange
          </h1>
          <p className="text-xs text-white/80 uppercase tracking-widest mt-1 font-semibold">
            Account Security &bull; Password Reset
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {!token ? (
            /* Missing Token Error State */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Invalid Reset Link</h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                This password reset link is missing a security token or is invalid. Please request a new link from the login page.
              </p>
              <div className="mt-6">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition-colors shadow-sm"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : !isSuccess ? (
            /* Reset Password Form */
            <div>
              <div className="mb-6 text-center">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight font-display">
                  Create New Password
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Choose a secure password for your student account.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
                      {...register('password')}
                      className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                      placeholder="At least 8 characters"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs font-medium mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Password Strength Requirements Helper */}
                <div className="bg-gray-50 border border-gray-200/80 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                        hasMinLength ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span className={hasMinLength ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                        hasSpecialChar ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span className={hasSpecialChar ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                      At least one special character (!@#$%^&*)
                    </span>
                  </div>
                </div>

                {/* Confirm Password */}
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
                      {...register('password_confirm')}
                      className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
                      placeholder="Re-enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password_confirm && (
                    <p className="text-red-500 text-xs font-medium mt-1">
                      {errors.password_confirm.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg mt-6 disabled:opacity-70 text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/"
                  className="text-xs font-semibold text-gray-500 hover:text-brand-600 transition-colors"
                >
                  Back to CampusXChange
                </Link>
              </div>
            </div>
          ) : (
            /* Success State */
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <h2 className="text-2xl font-black text-gray-900 tracking-tight font-display">
                Password Reset!
              </h2>

              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Your password has been successfully updated. You can now sign in using your student registration number and your new password.
              </p>

              <div className="mt-6">
                <button
                  onClick={() => navigate('/')}
                  className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-4 rounded-lg text-sm transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <span>Go to Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Footer Note */}
        <div className="bg-gray-50/80 px-6 py-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
          <span>Protected by CampusXChange Security &bull; 256-Bit Encrypted</span>
        </div>
      </div>
    </div>
  );
}
