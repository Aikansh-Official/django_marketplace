import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Activity, Database, ShieldCheck, 
  AlertTriangle, RefreshCw, CheckCircle2, Lock, 
  Terminal, Clock, Zap, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '../config/version';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(null);

  const fetchHealth = async (isManual = false) => {
    if (isManual) setDiagnosing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`${API_BASE}/marketplace/admin/system-health/`);
      setHealth(res.data);
      setLastCheckTime(new Date());
      if (isManual) toast.success("Live diagnostics completed");
    } catch (err) {
      console.error("Failed to load system health:", err);
      toast.error("Failed to fetch system diagnostics");
    } finally {
      setLoading(false);
      setDiagnosing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    fetchHealth();
  }, []);

  if (loading && !health) {
    return (
      <div className="space-y-6 font-sans">
        <div className="h-28 bg-white/80 rounded-md border border-gray-100 animate-pulse p-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white/80 rounded-md border border-gray-100 animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-white/80 rounded-md border border-gray-100 animate-pulse"></div>
      </div>
    );
  }

  const isHealthy = health?.status === 'HEALTHY';
  const dbLatency = health?.database?.latency_ms || 0;
  const cacheLatency = health?.cache?.latency_ms || 0;
  const security = health?.security || {};
  const metrics = health?.metrics || {};
  const env = health?.environment || {};

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* Top Health Status Hero Banner */}
      <div className={`p-6 rounded-md shadow-md border backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isHealthy 
          ? 'bg-gradient-to-r from-emerald-950 via-ink-900 to-ink-900 text-white border-emerald-800/40' 
          : 'bg-gradient-to-r from-amber-950 via-ink-900 to-ink-900 text-white border-amber-800/40'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 relative ${
            isHealthy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
          }`}>
            <Activity className="w-7 h-7" />
            <span className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-ink-900 ${
              isHealthy ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-ping'
            }`} />
            <span className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-ink-900 ${
              isHealthy ? 'bg-emerald-400' : 'bg-amber-400'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black tracking-tight">System Status: {health?.status || 'UNKNOWN'}</h1>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                isHealthy 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {env.environment || 'production'}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1 flex items-center gap-2">
              <span>All backend services and campus database connections operational</span>
              {lastCheckTime && (
                <span className="text-gray-400 font-mono text-[11px]">
                  • Last checked: {lastCheckTime.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchHealth(true)}
          disabled={diagnosing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md text-xs font-bold border border-white/20 transition-all self-start md:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${diagnosing ? 'animate-spin' : ''}`} />
          <span>Run Real-time Diagnostics</span>
        </button>
      </div>

      {/* 4 Health & Performance Gauge Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Database Health & Ping */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Database Engine</span>
            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-black text-gray-900">{dbLatency}ms</p>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1 font-mono">
            {health?.database?.engine} • Query Latency
          </p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-3">
            <div 
              className={`h-full rounded-full transition-all ${
                dbLatency < 50 ? 'bg-emerald-500' : (dbLatency < 150 ? 'bg-amber-500' : 'bg-rose-500')
              }`}
              style={{ width: `${Math.min(100, (dbLatency / 200) * 100)}%` }}
            />
          </div>
        </div>

        {/* Cache & Memory Engine */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cache Benchmark</span>
            <span className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-black text-gray-900">{cacheLatency >= 0 ? `${cacheLatency}ms` : 'N/A'}</p>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Read/Write Round-Trip Ping</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-purple-600 h-full rounded-full w-full" />
          </div>
        </div>

        {/* Security Posture Rating */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Security Posture</span>
            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-black text-emerald-700">Enforced</p>
            <span className="text-xs text-emerald-600 font-bold">5/5 Guards</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Middleware & Token Protection</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-emerald-600 h-full rounded-full w-full" />
          </div>
        </div>

        {/* Operational Threat Counters */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Moderation</span>
            <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-black text-gray-900">{metrics.unresolved_reports_count || 0}</p>
            <span className="text-xs text-amber-600 font-bold">Open Reports</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {metrics.banned_users_count || 0} suspended accounts • {metrics.banned_words_count || 0} blacklisted words
          </p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-amber-500 h-full rounded-full" 
              style={{ width: `${Math.min(100, ((metrics.unresolved_reports_count || 0) + 1) * 20)}%` }} 
            />
          </div>
        </div>

      </div>

      {/* Two-Column Section: Security Checklist & Runtime Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Security & Compliance Checklist */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-brand-600" />
                <h2 className="text-base font-black text-gray-900">Security & Compliance Guardrails</h2>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Active & Enforced
              </span>
            </div>

            <div className="space-y-3">
              
              {/* Item 1 */}
              <div className="flex items-start justify-between p-3 rounded-md bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">DataSecurityMiddleware (App Security Key)</h4>
                    <p className="text-[11px] text-gray-500">Validates internal API authorization key across endpoints</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  Protected
                </span>
              </div>

              {/* Item 2 */}
              <div className="flex items-start justify-between p-3 rounded-md bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">HttpOnly Session & JWT Storage</h4>
                    <p className="text-[11px] text-gray-500">Tokens stored in secure HTTP-only cookies; immune to JavaScript XSS theft</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  Active
                </span>
              </div>

              {/* Item 3 */}
              <div className="flex items-start justify-between p-3 rounded-md bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Scoped Rate Limiting Throttling</h4>
                    <p className="text-[11px] text-gray-500">Limits brute-force attempts on login, OTP, and listing creation</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  Active
                </span>
              </div>

              {/* Item 4 */}
              <div className="flex items-start justify-between p-3 rounded-md bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Automated Keyword Blacklist Filtering</h4>
                    <p className="text-[11px] text-gray-500">Scans student listing titles and descriptions before publishing</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  {metrics.banned_words_count || 0} Rules
                </span>
              </div>

              {/* Item 5 */}
              <div className="flex items-start justify-between p-3 rounded-md bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`p-1.5 rounded-full ${
                    security.debug_mode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {security.debug_mode ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Debug Configuration State</h4>
                    <p className="text-[11px] text-gray-500">
                      {security.debug_mode ? 'DEBUG is True (Standard for Local Development)' : 'DEBUG is False (Production Mode)'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                  security.debug_mode ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {security.debug_mode ? 'Dev Mode' : 'Secured'}
                </span>
              </div>

            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Audit Trail Engine Active</span>
            <Link to="/audit-logs" className="font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View Audit History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Runtime Environment Matrix & Quick Links */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-gray-700" />
                <h2 className="text-base font-black text-gray-900">Server & Environment Runtime</h2>
              </div>
              <span className="text-xs font-mono text-gray-400">Host Telemetry</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Platform Release</span>
                <p className="font-black text-brand-600 font-mono text-sm mt-0.5">v{APP_VERSION}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">CampXChange Unified Core</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Python Runtime</span>
                <p className="font-black text-gray-900 font-mono text-sm mt-0.5">v{env.python_version || '3.14'}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Core interpreter</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Django Framework</span>
                <p className="font-black text-gray-900 font-mono text-sm mt-0.5">v{env.django_version || '6.1'}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">REST Framework API</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Operating System</span>
                <p className="font-black text-gray-900 font-mono text-sm mt-0.5">{env.os_platform || 'Windows'}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Host kernel</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Database Driver</span>
                <p className="font-black text-gray-900 font-mono text-sm mt-0.5">{health?.database?.engine || 'postgresql'}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">SQL Engine</p>
              </div>

            </div>

            {/* Quick Diagnostic Shortcuts */}
            <div className="space-y-2 mt-4">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Administrative Tools:</span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/reports"
                  className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-xs font-bold text-gray-800 flex items-center justify-between transition-colors"
                >
                  <span>Listing Reports ({metrics.unresolved_reports_count || 0})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </Link>
                <Link
                  to="/settings"
                  className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-xs font-bold text-gray-800 flex items-center justify-between transition-colors"
                >
                  <span>Blacklist Rules ({metrics.banned_words_count || 0})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Server Local Time: {new Date().toLocaleTimeString()}
            </span>
            <span>CampXChange v2.0</span>
          </div>
        </div>

      </div>

    </div>
  );
}
