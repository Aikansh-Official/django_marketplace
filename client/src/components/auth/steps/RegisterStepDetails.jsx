import React from 'react';
import {
  User,
  UserCheck,
  Phone,
  Mail,
  Loader2,
  Check,
  X,
  ArrowRight,
  ShoppingCart,
  Store
} from 'lucide-react';

export default function RegisterStepDetails({
  register,
  errors,
  usernameStatus,
  phoneStatus = 'idle',
  emailStatus = 'idle',
  isLoading = false,
  onProceed,
  role = 'BUYER',
  onRoleChange
}) {
  return (
    <div className="space-y-4">
      <div className="mb-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
          Create Student Account
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter your student information to get started
        </p>
      </div>

      {/* Role Selection */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Register As</span>
          <span className="text-[11px] font-medium text-gray-500 normal-case">
            {role === 'BUYER' ? '⚡ No ID card required' : '🛡️ Requires Student ID card'}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onRoleChange && onRoleChange('BUYER')}
            className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${role === 'BUYER'
                ? 'bg-emerald-50/80 border-emerald-500 text-emerald-700 shadow-2xs'
                : 'bg-gray-50/80 hover:bg-white border-gray-200 text-gray-600'
              }`}
          >
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span>Buyer</span>
          </button>

          <button
            type="button"
            onClick={() => onRoleChange && onRoleChange('SELLER')}
            className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${role === 'SELLER'
                ? 'bg-brand-50/80 border-brand-500 text-brand-600 shadow-2xs'
                : 'bg-gray-50/80 hover:bg-white border-gray-200 text-gray-600'
              }`}
          >
            <Store className="w-4 h-4 text-brand-600" />
            <span>Seller</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
          Full Name (as on ID card)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <User className="w-4 h-4" />
          </div>
          <input
            {...register('full_name')}
            maxLength={50}
            className="w-full bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 text-gray-900 font-medium rounded-md pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-gray-400"
            placeholder="e.g. Anshu"
          />
        </div>
        {errors.full_name && <p className="text-red-500 text-xs font-medium mt-1">{errors.full_name.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Registration Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              {...register('username')}
              className={`w-full border text-gray-900 font-medium rounded-md pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-brand-500 transition-all placeholder:text-gray-400 ${usernameStatus === 'taken'
                ? 'bg-red-50/80 border-red-200 focus:ring-red-500/20'
                : usernameStatus === 'available'
                  ? 'bg-emerald-50/80 border-emerald-200 focus:ring-emerald-500/20'
                  : 'bg-gray-50/80 hover:bg-white focus:bg-white border-gray-200 focus:ring-brand-500/20'
                }`}
              placeholder="e.g. 12345678"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
              {usernameStatus === 'available' && <Check className="h-4 w-4 text-emerald-600" />}
              {usernameStatus === 'taken' && <X className="h-4 w-4 text-red-500" />}
            </div>
          </div>
          {errors.username && <p className="text-red-500 text-xs font-medium mt-1">{errors.username.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Phone
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              {...register('phone_number')}
              className={`w-full border text-gray-900 font-medium rounded-md pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-brand-500 transition-all placeholder:text-gray-400 ${phoneStatus === 'taken'
                ? 'bg-red-50/80 border-red-200 focus:ring-red-500/20'
                : phoneStatus === 'available'
                  ? 'bg-emerald-50/80 border-emerald-200 focus:ring-emerald-500/20'
                  : 'bg-gray-50/80 hover:bg-white focus:bg-white border-gray-200 focus:ring-brand-500/20'
                }`}
              placeholder="10-digit phone"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {phoneStatus === 'checking' && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
              {phoneStatus === 'available' && <Check className="h-4 w-4 text-emerald-600" />}
              {phoneStatus === 'taken' && <X className="h-4 w-4 text-red-500" />}
            </div>
          </div>
          {errors.phone_number && <p className="text-red-500 text-xs font-medium mt-1">{errors.phone_number.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
          Email
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Mail className="w-4 h-4" />
          </div>
          <input
            type="email"
            {...register('email')}
            className={`w-full border text-gray-900 font-medium rounded-md pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-brand-500 transition-all placeholder:text-gray-400 ${emailStatus === 'taken'
              ? 'bg-red-50/80 border-red-200 focus:ring-red-500/20'
              : emailStatus === 'available'
                ? 'bg-emerald-50/80 border-emerald-200 focus:ring-emerald-500/20'
                : 'bg-gray-50/80 hover:bg-white focus:bg-white border-gray-200 focus:ring-brand-500/20'
              }`}
            placeholder="yourname@gmail.com"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {emailStatus === 'checking' && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
            {emailStatus === 'available' && <Check className="h-4 w-4 text-emerald-600" />}
            {emailStatus === 'taken' && <X className="h-4 w-4 text-red-500" />}
          </div>
        </div>
        {errors.email && <p className="text-red-500 text-xs font-medium mt-1">{errors.email.message}</p>}
      </div>

      <button
        type="button"
        onClick={onProceed}
        disabled={
          isLoading ||
          usernameStatus === 'checking' || usernameStatus === 'taken' ||
          phoneStatus === 'checking' || phoneStatus === 'taken' ||
          emailStatus === 'checking' || emailStatus === 'taken'
        }
        className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-md transition-all shadow-md hover:shadow-lg mt-5 disabled:opacity-60 text-sm flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying Availability...</span>
          </>
        ) : (
          <>
            <span>{role === 'BUYER' ? 'Continue to Email Verification' : 'Proceed to Step 2: ID Verification'}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
