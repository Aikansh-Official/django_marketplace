import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
import toast from 'react-hot-toast';
import { X, Loader2, Check, GraduationCap } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().regex(/^\d{8}$/, { message: 'Enter your 8-digit registration number' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const registerSchema = z.object({
  first_name: z.string().min(6, { message: 'Name must be at least 6 characters' }).max(50, { message: 'Name cannot exceed 50 characters' }),
  username: z.string().regex(/^\d{8}$/, { message: 'Registration number must be exactly 8 digits' }),
  phone_number: z.string().regex(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' }),
  email: z.string().email({ message: 'Must be a valid email' }).regex(/@lpu\.in$/i, { message: 'Only @lpu.in emails are allowed' }),
  otp: z.string().optional(),
  password: z.string()
    .min(8, { message: 'Must be at least 8 characters' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Must contain at least one special character' }),
  password_confirm: z.string().min(1, { message: 'Please confirm your password' }),
}).refine((data) => {
  return data.password === data.password_confirm;
}, {
  message: "Passwords don't match",
  path: ["password_confirm"],
});

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-gray-900/60 backdrop-blur-sm">
      <div className="flex min-h-full p-4 sm:p-6">
        <div className="m-auto w-full max-w-4xl bg-white rounded-md shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-200">

          {/* Left Side - Branding */}
          <div className="hidden md:flex md:w-1/2 relative bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 flex-col justify-center items-center text-center text-white overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
              <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white blur-3xl"></div>
              <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-white blur-3xl"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-white/30 overflow-hidden">
                <img src="src\assets\LPUTrade_logo.jpeg" alt="LPUTrade Logo" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-4xl font-black mb-4 tracking-tight">LPUTrade</h2>
              <div className="w-16 h-1 bg-brand-400 rounded-full mb-6"></div>
              <p className="text-brand-100 text-lg leading-relaxed font-medium">
                The exclusive campus marketplace. Buy, sell, and trade textbooks, electronics, and essentials securely with verified students.
              </p>
            </div>
          </div>

          {/* Right Side - Form Content */}
          <div className="w-full md:w-1/2 relative flex flex-col bg-white">

            {/* Header with Close Button */}
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-200 rounded-full p-2 transition-colors shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-8 pb-10 pt-12 flex-grow">
              {mode === 'login' ? (
                <LoginForm
                  onSwitch={() => setMode('register')}
                  onSuccess={() => { onClose(); if (onSuccess) onSuccess(); }}
                />
              ) : (
                <RegisterForm
                  onSwitch={() => setMode('login')}
                  onSuccess={() => { onClose(); if (onSuccess) onSuccess(); }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSwitch, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      const response = await axios.post(`${API_BASE}/auth/login/`, data);
      toast.success('Successfully logged in!');
      onSuccess();
      window.location.reload(); // Refresh to update navbar state
    } catch (error) {
      console.error(error);
      toast.error('Login failed. Please check your credentials.');
    }
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto h-12 w-12 bg-brand-50 rounded-md flex items-center justify-center text-brand-600 mb-4 shadow-sm border border-brand-100">
          <span className="material-icons-outlined text-3xl">gpp_good</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900">Welcome back</h2>
        <p className="text-sm text-gray-500 mt-2">Sign in to your account</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Registration Number</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            {...register('username')}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
            placeholder="e.g. 12200000"
          />
          {errors.username && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.username.message}</p>}
        </div>
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Password</label>
          <input
            type="password"
            {...register('password')}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
            placeholder="••••••••"
          />
          {errors.password && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-6 disabled:opacity-70"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm font-medium text-gray-500">
        Don't have an account?{' '}
        <button onClick={onSwitch} type="button" className="text-brand-500 hover:text-brand-600 font-bold transition-colors">
          Sign up
        </button>
      </div>
    </div>
  );
}


function RegisterForm({ onSwitch, onSuccess }) {
  const { register, handleSubmit, watch, setError, clearErrors, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const usernameValue = watch("username");

  useEffect(() => {
    if (!usernameValue || usernameValue.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const checkAvailability = async () => {
      setUsernameStatus('checking');
      try {
        const response = await axios.get(`${API_BASE}/auth/check-username/?username=${usernameValue}`);
        if (response.data.available) {
          setUsernameStatus('available');
          clearErrors("username");
        } else {
          setUsernameStatus('taken');
          setError("username", { type: "manual", message: "This username is already taken" });
        }
      } catch (error) {
        setUsernameStatus('idle');
      }
    };

    const debounceTimer = setTimeout(() => { checkAvailability(); }, 500);
    return () => clearTimeout(debounceTimer);
  }, [usernameValue, setError, clearErrors]);

  const handleVerifyNow = async () => {
    const isValid = await trigger(['first_name', 'username', 'phone_number', 'email']);
    if (!isValid || usernameStatus === 'taken' || usernameStatus === 'checking') return;

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/send-otp/`, { email: watch('email') });
      toast.success("OTP sent to your email! (Check server console)");
      setStep(2);
    } catch (e) {
      toast.error(e.response?.data?.email?.[0] || "Failed to send OTP.");
    }
    setIsLoading(false);
  };

  const handleVerifyOTP = async () => {
    const isValid = await trigger(['otp']);
    if (!isValid) return;

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/verify-otp/`, {
        email: watch('email'),
        otp: watch('otp')
      });
      toast.success("Email verified successfully!");
      setStep(3);
    } catch (e) {
      toast.error(e.response?.data?.error || "Invalid OTP");
    }
    setIsLoading(false);
  }

  const onSubmit = async (data) => {
    if (step !== 3) return;
    if (usernameStatus === 'taken') return;

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/register/`, data);

      // Auto login after successful registration
      const loginResponse = await axios.post(`${API_BASE}/auth/login/`, {
        username: data.username,
        password: data.password
      });

      toast.success('Registration successful! Automatically logged in.');
      onSuccess();
      window.location.reload();
    } catch (error) {
      if (error.response?.data) {
        const errorsData = error.response.data;
        let handled = false;
        ['username', 'email', 'phone_number', 'password'].forEach(field => {
          if (errorsData[field]) {
            setError(field, { type: 'manual', message: errorsData[field][0] });
            handled = true;
          }
        });
        if (!handled) toast.error(errorsData.detail || 'Registration failed.');
      } else {
        toast.error('An unexpected error occurred.');
      }
    }
    setIsLoading(false);
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto h-12 w-12 bg-brand-50 rounded-md flex items-center justify-center text-brand-600 mb-3 shadow-sm border border-brand-100">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">Create Account</h2>
        <p className="text-sm text-gray-500 mt-1">Join the exclusive student marketplace</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

        {step === 1 && (
          <>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
              <input
                {...register('first_name')}
                maxLength={50}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                placeholder="Enter your full name"
              />
              {errors.first_name && <p className="text-red-500 text-xs font-medium mt-1">{errors.first_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Registration Number</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    {...register('username')}
                    className={`w-full border text-gray-900 font-medium rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:border-brand-500 transition-all pr-10 ${usernameStatus === 'taken' ? 'bg-red-50 border-red-200 focus:ring-red-500 focus:border-red-500' :
                      usernameStatus === 'available' ? 'bg-green-50 border-green-200 focus:ring-green-500 focus:border-green-500' :
                        'bg-gray-50 border-gray-200 focus:ring-brand-500'
                      }`}
                    placeholder="e.g. 12200000"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
                    {usernameStatus === 'available' && <Check className="h-4 w-4 text-green-500" />}
                    {usernameStatus === 'taken' && <X className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                {errors.username && <p className="text-red-500 text-xs font-medium mt-1">{errors.username.message}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Phone</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  {...register('phone_number')}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                  placeholder="Enter 10-digit number"
                />
                {errors.phone_number && <p className="text-red-500 text-xs font-medium mt-1">{errors.phone_number.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">College Email</label>
              <input
                type="email"
                {...register('email')}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                placeholder="student@lpu.in"
              />
              {errors.email && <p className="text-red-500 text-xs font-medium mt-1">{errors.email.message}</p>}
            </div>

            <button
              type="button"
              onClick={handleVerifyNow}
              disabled={isLoading || usernameStatus === 'checking' || usernameStatus === 'taken'}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-6 disabled:opacity-70"
            >
              {isLoading ? 'Sending OTP...' : 'Verify Now'}
            </button>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 text-blue-800 rounded-md mb-4 border border-blue-100">
              <p className="text-sm font-medium">An OTP has been sent to <strong>{watch('email')}</strong></p>
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Enter 6-Digit OTP</label>
              <input
                type="text"
                {...register('otp')}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-center font-black tracking-[0.5em] text-xl rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                placeholder="••••••"
                maxLength={6}
              />
              {errors.otp && <p className="text-red-500 text-xs font-medium mt-1">{errors.otp.message}</p>}
            </div>

            <button
              type="button"
              onClick={handleVerifyOTP}
              disabled={isLoading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-6 disabled:opacity-70"
            >
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-3 px-4 rounded-md transition-all mt-2"
            >
              Back to Email
            </button>
          </div>
        )}

        {step === 3 && (
          <>
            <div className="text-center p-4 bg-green-50 text-green-800 rounded-md mb-4 border border-green-100 flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              <p className="text-sm font-semibold">Email Verified!</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Set Password</label>
                <input
                  type="password"
                  {...register('password')}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                />
                {errors.password && <p className="text-red-500 text-xs font-medium mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Confirm</label>
                <input
                  type="password"
                  {...register('password_confirm')}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                />
                {errors.password_confirm && <p className="text-red-500 text-xs font-medium mt-1">{errors.password_confirm.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-6 disabled:opacity-70"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </>
        )}
      </form>

      <div className="mt-6 text-center text-sm font-medium text-gray-500">
        Already have an account?{' '}
        <button onClick={onSwitch} type="button" className="text-brand-500 hover:text-brand-600 font-bold transition-colors">
          Sign in
        </button>
      </div>
    </div>
  );
}
