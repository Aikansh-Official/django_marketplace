import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2 } from 'lucide-react';
import logoImg from '../assets/LPUTrade_logo.jpeg';
import toast from 'react-hot-toast';
import ThemeBackground from '../components/ThemeBackground';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Get Tokens
      const loginRes = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!loginRes.ok) {
        throw new Error('Invalid credentials');
      }

      const loginData = await loginRes.json();
      const accessToken = loginData.access;
      const refreshToken = loginData.refresh;

      if (!accessToken) throw new Error('Token not received from server');

      // 2. Fetch Profile to check Admin status
      const profileRes = await fetch('http://localhost:8000/api/auth/profile/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!profileRes.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profileData = await profileRes.json();

      if (profileData.is_staff || profileData.is_superuser) {
        // Success - store in localStorage and update state
        localStorage.setItem('admin_access', accessToken);
        localStorage.setItem('admin_refresh', refreshToken);
        localStorage.setItem('admin_user', JSON.stringify(profileData));
        setAuth(true);
        navigate('/');
      } else {
        // Not an admin
        throw new Error('You do not have administrative privileges.');
      }

    } catch (err) {
      toast.error(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <ThemeBackground />

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md border border-white/20 p-10 rounded-md shadow-2xl relative z-10">
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-md bg-white p-1.5 border border-gray-100 shadow-xl mb-5 rotate-3 hover:rotate-0 transition-transform">
             <img src={logoImg} alt="Logo" className="w-full h-full rounded-md object-cover" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">LPUTrade</h2>
          <p className="text-brand-500 text-xs tracking-[0.3em] font-bold mt-1">ADMIN PORTAL</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Username or Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder-gray-400"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-md pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder-gray-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-4 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
          </button>
        </form>

      </div>
    </div>
  );
}
