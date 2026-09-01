import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import ThemeBackground from '../components/ThemeBackground';

const schema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const response = await axios.post('http://localhost:8000/api/auth/login/', data);
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      window.location.href = '/';
    } catch (error) {
      console.error(error);
      toast.error('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <ThemeBackground />
      <div className="max-w-md w-full bg-white/80 backdrop-blur-md border border-white/20 p-10 rounded-md shadow-2xl space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-brand-50 rounded-md flex items-center justify-center text-brand-600 mb-6 shadow-sm border border-brand-100 rotate-3 hover:rotate-0 transition-transform">
            <span className="material-icons-outlined text-4xl">gpp_good</span>
          </div>
          <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-gray-500">
            Or{' '}
            <Link to="/register" className="font-bold text-brand-500 hover:text-brand-600">
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Username</label>
              <input
                {...register('username')}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder-gray-400"
                placeholder="Enter your username"
              />
              {errors.username && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.username.message}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                {...register('password')}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder-gray-400"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.password.message}</p>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-4 active:scale-[0.98]"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
