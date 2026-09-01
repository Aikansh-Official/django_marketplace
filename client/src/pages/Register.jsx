import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { GraduationCap, Loader2, Check, X } from 'lucide-react';
import axios from 'axios';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ThemeBackground from '../components/ThemeBackground';

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
      toast.success('Registration successful! Please log in.');
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
            toast.error(msg);
        }
      } else {
        toast.error('An unexpected error occurred.');
      }
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <ThemeBackground />
      <div className="max-w-xl w-full bg-white/80 backdrop-blur-md border border-white/20 p-10 rounded-md shadow-2xl space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-brand-50 rounded-md flex items-center justify-center text-brand-600 mb-6 shadow-sm border border-brand-100 rotate-3 hover:rotate-0 transition-transform">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">
            Join LPUTrade
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-gray-500">
            Only verified college students allowed.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5">
            
            {/* ROW 1: Full Name */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
              <input
                {...register('first_name')}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder-gray-400"
                placeholder="e.g. John Doe"
              />
              {errors.first_name && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.first_name.message}</p>}
            </div>
            
            {/* ROW 2: Username & Phone Number */}
            <div className="grid grid-cols-2 gap-5">
               <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Username</label>
                  <div className="relative">
                    <input
                      {...register('username')}
                      className={`w-full border text-gray-900 font-medium rounded-md px-4 py-3.5 focus:outline-none focus:ring-2 focus:bg-white transition-all placeholder-gray-400 pr-10 ${
                        usernameStatus === 'taken' ? 'bg-red-50 border-red-200 focus:ring-red-500' :
                        usernameStatus === 'available' ? 'bg-green-50 border-green-200 focus:ring-green-500' :
                        'bg-gray-50 border-gray-200 focus:ring-brand-500'
                      }`}
                      placeholder="Username"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
                      {usernameStatus === 'available' && <Check className="h-4 w-4 text-green-500" />}
                      {usernameStatus === 'taken' && <X className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                  {errors.username && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.username.message}</p>}
                  {usernameStatus === 'available' && !errors.username && <p className="text-green-600 text-xs font-medium mt-1.5">Username is available!</p>}
               </div>
               
               <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    {...register('phone_number')}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder-gray-400"
                    placeholder="9876543210"
                  />
                  {errors.phone_number && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.phone_number.message}</p>}
               </div>
            </div>

            {/* ROW 3: Email */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">College Email</label>
              <input
                type="email"
                {...register('email')}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder-gray-400"
                placeholder="student@college.edu"
              />
              {errors.email && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.email.message}</p>}
            </div>

            {/* ROW 4: Passwords */}
            <div className="grid grid-cols-2 gap-5">
                <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Password</label>
                <input
                    type="password"
                    {...register('password')}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder-gray-400"
                />
                {errors.password && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.password.message}</p>}
                </div>
                <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Confirm</label>
                <input
                    type="password"
                    {...register('password_confirm')}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder-gray-400"
                />
                {errors.password_confirm && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.password_confirm.message}</p>}
                </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || usernameStatus === 'checking' || usernameStatus === 'taken'}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? 'Registering...' : 'Create Account'}
            </button>
          </div>
          <div className="text-center pt-2">
            <Link to="/login" className="font-bold text-sm text-gray-500 hover:text-brand-600 transition-colors">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
