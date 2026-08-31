import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { GraduationCap, Loader2, Check, X } from 'lucide-react';
import axios from 'axios';
import { useState, useEffect } from 'react';

const schema = z.object({
  first_name: z.string().min(1, { message: 'Name is required' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  phone_number: z.string().min(10, { message: 'Enter a valid phone number' }),
  email: z.string().email({ message: 'Must be a valid email' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  password_confirm: z.string().min(6, { message: 'Confirm password must be at least 6 characters' }),
}).refine((data) => data.password === data.password_confirm, {
  message: "Passwords don't match",
  path: ["password_confirm"],
});

export default function Register() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setError, clearErrors, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, checking, available, taken
  
  const usernameValue = watch("username");

  useEffect(() => {
    if (!usernameValue || usernameValue.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const checkAvailability = async () => {
      setUsernameStatus('checking');
      try {
        const response = await axios.get(`http://localhost:8000/api/auth/check-username/?username=${usernameValue}`);
        if (response.data.available) {
          setUsernameStatus('available');
          clearErrors("username");
        } else {
          setUsernameStatus('taken');
          setError("username", { type: "manual", message: "This username is already taken" });
        }
      } catch (error) {
        console.error("Failed to check username", error);
        setUsernameStatus('idle');
      }
    };

    const debounceTimer = setTimeout(() => {
      checkAvailability();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [usernameValue, setError, clearErrors]);

  const onSubmit = async (data) => {
    if (usernameStatus === 'taken') return; // Prevent submission if username is taken

    try {
      await axios.post('http://localhost:8000/api/auth/register/', data);
      alert('Registration successful! Please log in.');
      navigate('/login');
    } catch (error) {
      console.error(error);
      if (error.response?.data) {
        const errorsData = error.response.data;
        let handled = false;
        
        // Map Django field errors to React Hook Form
        ['username', 'email', 'phone_number'].forEach(field => {
          if (errorsData[field]) {
            setError(field, { type: 'manual', message: errorsData[field][0] });
            handled = true;
          }
        });
        
        if (!handled) {
            const msg = errorsData.detail || 'Registration failed. Please try again.';
            alert(msg);
        }
      } else {
        alert('An unexpected error occurred.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 glass p-10 rounded-xl shadow-xl border-t-4 border-t-brand-500">
        <div>
          <div className="mx-auto h-12 w-12 bg-cream-100 rounded-full flex items-center justify-center text-brand-600 mb-4 border border-brand-200">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-center text-3xl font-black text-ink-900 tracking-tight uppercase">
            Join LPUTrade
          </h2>
          <p className="mt-2 text-center text-sm text-ink-800 font-medium">
            Only verified college students allowed.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            
            {/* ROW 1: Full Name */}
            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wide">Full Name</label>
              <input
                {...register('first_name')}
                className="mt-1 block w-full px-3 py-2 border border-cream-300 rounded-sm shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm bg-white"
                placeholder="e.g. John Doe"
              />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            
            {/* ROW 2: Username & Phone Number */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-ink-800 uppercase tracking-wide">Username</label>
                  <div className="relative mt-1">
                    <input
                      {...register('username')}
                      className={`block w-full px-3 py-2 border rounded-sm shadow-sm focus:outline-none sm:text-sm bg-white pr-10 ${
                        usernameStatus === 'taken' ? 'border-red-500 focus:ring-red-500 focus:border-red-500' :
                        usernameStatus === 'available' ? 'border-green-500 focus:ring-green-500 focus:border-green-500' :
                        'border-cream-300 focus:ring-brand-500 focus:border-brand-500'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
                      {usernameStatus === 'available' && <Check className="h-4 w-4 text-green-500" />}
                      {usernameStatus === 'taken' && <X className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                  {usernameStatus === 'available' && !errors.username && <p className="text-green-600 text-xs mt-1 font-medium">Username is available!</p>}
               </div>
               
               <div>
                  <label className="block text-xs font-bold text-ink-800 uppercase tracking-wide">Phone Number</label>
                  <input
                    {...register('phone_number')}
                    className="mt-1 block w-full px-3 py-2 border border-cream-300 rounded-sm shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm bg-white"
                    placeholder="9876543210"
                  />
                  {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number.message}</p>}
               </div>
            </div>

            {/* ROW 3: Email */}
            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wide">College Email</label>
              <input
                type="email"
                {...register('email')}
                className="mt-1 block w-full px-3 py-2 border border-cream-300 rounded-sm shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm bg-white"
                placeholder="student@college.edu"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* ROW 4: Passwords */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-xs font-bold text-ink-800 uppercase tracking-wide">Password</label>
                <input
                    type="password"
                    {...register('password')}
                    className="mt-1 block w-full px-3 py-2 border border-cream-300 rounded-sm shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm bg-white"
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <div>
                <label className="block text-xs font-bold text-ink-800 uppercase tracking-wide">Confirm</label>
                <input
                    type="password"
                    {...register('password_confirm')}
                    className="mt-1 block w-full px-3 py-2 border border-cream-300 rounded-sm shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm bg-white"
                />
                {errors.password_confirm && <p className="text-red-500 text-xs mt-1">{errors.password_confirm.message}</p>}
                </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || usernameStatus === 'checking' || usernameStatus === 'taken'}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-sm shadow-md text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors uppercase tracking-wider"
            >
              {isSubmitting ? 'Registering...' : 'Create Account'}
            </button>
          </div>
          <div className="text-center">
            <Link to="/login" className="font-bold text-sm text-ink-900 hover:text-brand-600 uppercase transition-colors">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
