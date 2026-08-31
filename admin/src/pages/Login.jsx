import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import logoImg from '../assets/LPUTrade_logo.jpeg';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
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
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500 rounded-full blur-[150px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-600 rounded-full blur-[150px] opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-md bg-ink-800/80 backdrop-blur-xl border border-gray-700 p-8 rounded-2xl shadow-2xl relative z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-ink-900 p-1 border-2 border-brand-500 shadow-[0_0_20px_rgba(251,86,7,0.4)] mb-4">
             <img src={logoImg} alt="Logo" className="w-full h-full rounded-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide uppercase">LPUTrade</h2>
          <p className="text-brand-400 text-sm tracking-[0.2em] font-bold mt-1">ADMIN PORTAL</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Username or Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-ink-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all placeholder-gray-500"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-ink-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all placeholder-gray-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-brand-500/30 transition-all duration-300 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}
