import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Save, Loader2, CheckCircle2, Megaphone, Info, AlertTriangle,
  AlertCircle, Sparkles, X, ExternalLink, ShieldCheck, Sliders,
  Lock, Clock, Users, ArrowRight, ShieldAlert, Key, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Settings() {
  const [activeTab, setActiveTab] = useState('CONSTRAINTS'); // CONSTRAINTS | ANNOUNCEMENT | SECURITY | TEAM
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    // Constraints
    max_active_listings_per_student: 10,
    min_trust_score_to_sell: 0,
    handover_qr_expiry_minutes: 30,
    otp_daily_limit: 5,

    // Announcement
    announcement_enabled: false,
    announcement_text: '',
    announcement_type: 'INFO',
    announcement_link: '',
    announcement_dismissible: true,

    // Security & Operations
    maintenance_mode: false,
    maintenance_message: 'CampusXChange is currently undergoing scheduled campus maintenance. Please check back shortly.',
    allow_registrations: true,
    allowed_domains: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE}/marketplace/admin/settings/`);
        const data = res.data;
        setSettings({
          max_active_listings_per_student: parseInt(data.max_active_listings_per_student) || 10,
          min_trust_score_to_sell: parseInt(data.min_trust_score_to_sell) || 0,
          handover_qr_expiry_minutes: parseInt(data.handover_qr_expiry_minutes) || 30,
          otp_daily_limit: parseInt(data.otp_daily_limit) || 5,

          announcement_enabled: data.announcement_enabled === 'true' || data.announcement_enabled === true,
          announcement_text: data.announcement_text || '',
          announcement_type: (data.announcement_type || 'INFO').toUpperCase(),
          announcement_link: data.announcement_link || '',
          announcement_dismissible: data.announcement_dismissible !== 'false' && data.announcement_dismissible !== false,

          maintenance_mode: data.maintenance_mode === 'true' || data.maintenance_mode === true,
          maintenance_message: data.maintenance_message || 'CampusXChange is currently undergoing scheduled campus maintenance. Please check back shortly.',
          allow_registrations: data.allow_registrations !== 'false' && data.allow_registrations !== false,
          allowed_domains: data.allowed_domains || '',
        });
      } catch (err) {
        console.error('Failed to load settings', err);
        toast.error('Failed to load settings from server.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/marketplace/admin/settings/`, {
        max_active_listings_per_student: String(settings.max_active_listings_per_student),
        min_trust_score_to_sell: String(settings.min_trust_score_to_sell),
        handover_qr_expiry_minutes: String(settings.handover_qr_expiry_minutes),
        otp_daily_limit: String(settings.otp_daily_limit),

        announcement_enabled: settings.announcement_enabled ? 'true' : 'false',
        announcement_text: settings.announcement_text,
        announcement_type: settings.announcement_type,
        announcement_link: settings.announcement_link,
        announcement_dismissible: settings.announcement_dismissible ? 'true' : 'false',

        maintenance_mode: settings.maintenance_mode ? 'true' : 'false',
        maintenance_message: settings.maintenance_message,
        allow_registrations: settings.allow_registrations ? 'true' : 'false',
        allowed_domains: settings.allowed_domains,
      });
      toast.success('Platform configuration saved successfully!');
    } catch (err) {
      console.error('Failed to save settings', err);
      const errMsg = err.response?.data?.error || 'Failed to update platform settings.';
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Banner preview styling
  const getTypeBadge = (type) => {
    switch (type) {
      case 'WARNING':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-900',
          badgeBg: 'bg-amber-500 text-white',
          icon: AlertTriangle,
          label: 'Warning Notice'
        };
      case 'ALERT':
        return {
          bg: 'bg-rose-50 border-rose-300 text-rose-900',
          badgeBg: 'bg-rose-600 text-white animate-pulse',
          icon: AlertCircle,
          label: 'Urgent Alert'
        };
      case 'PROMO':
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-900',
          badgeBg: 'bg-emerald-600 text-white',
          icon: Sparkles,
          label: 'Campus Promo'
        };
      case 'INFO':
      default:
        return {
          bg: 'bg-blue-50 border-blue-300 text-blue-900',
          badgeBg: 'bg-blue-600 text-white',
          icon: Info,
          label: 'Official Info'
        };
    }
  };

  const previewStyle = getTypeBadge(settings.announcement_type);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Bar */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-lg border border-gray-200 shadow-sm">
        <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-brand-600" />
          Platform Configuration & Operational Controls
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure marketplace operational constraints, campus broadcast notices, security rules, and staff roles.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-lg px-4 gap-2 shadow-sm">
        {[
          { id: 'CONSTRAINTS', label: 'Operational Constraints', icon: Sliders },
          { id: 'ANNOUNCEMENT', label: 'Campus Announcement Banner', icon: Megaphone },
          { id: 'SECURITY', label: 'Platform Access & Security', icon: Lock },
          { id: 'TEAM', label: 'Staff Team & Roles', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                isActive
                  ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white p-16 rounded-b-lg border border-gray-200 text-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Loading system settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* TAB 1: OPERATIONAL CONSTRAINTS */}
          {activeTab === 'CONSTRAINTS' && (
            <div className="bg-white rounded-b-lg border border-gray-200 shadow-sm p-6 space-y-6 text-xs animate-fade-in">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-600" />
                  Marketplace Trading Constraints & Rules
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Set guardrails on listings, peer trading requirements, and time-sensitive transaction sessions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Max Active Listings */}
                <div className="p-4 bg-gray-50/80 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-900">Max Active Listings per Student</label>
                    <span className="font-mono px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-black border border-brand-200">
                      {settings.max_active_listings_per_student} items
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Maximum simultaneous active listings allowed per student account. Prevents catalog spamming.
                  </p>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.max_active_listings_per_student}
                    onChange={(e) =>
                      setSettings({ ...settings, max_active_listings_per_student: parseInt(e.target.value) || 1 })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                {/* Min Trust Score to Sell */}
                <div className="p-4 bg-gray-50/80 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-900">Minimum Trust Score to Sell</label>
                    <span className="font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-black border border-amber-200">
                      {settings.min_trust_score_to_sell}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Threshold score required to list items for sale. Set to 0 to permit any verified student seller.
                  </p>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.min_trust_score_to_sell}
                    onChange={(e) =>
                      setSettings({ ...settings, min_trust_score_to_sell: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                {/* Handover QR Expiry */}
                <div className="p-4 bg-gray-50/80 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-900">Handover QR & PIN Expiry</label>
                    <span className="font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-black border border-sky-200">
                      {settings.handover_qr_expiry_minutes} mins
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Validity window for seller-generated QR codes and 6-digit confirmation PINs.
                  </p>
                  <select
                    value={settings.handover_qr_expiry_minutes}
                    onChange={(e) =>
                      setSettings({ ...settings, handover_qr_expiry_minutes: parseInt(e.target.value) || 30 })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="10">10 Minutes (Tight window)</option>
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes (Recommended)</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes (Maximum)</option>
                  </select>
                </div>

                {/* Daily OTP Limit */}
                <div className="p-4 bg-gray-50/80 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-900">Daily OTP Resend Limit</label>
                    <span className="font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-black border border-emerald-200">
                      {settings.otp_daily_limit} attempts
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Maximum email OTP dispatch requests allowed per address in a 24-hour window.
                  </p>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    value={settings.otp_daily_limit}
                    onChange={(e) =>
                      setSettings({ ...settings, otp_daily_limit: parseInt(e.target.value) || 5 })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANNOUNCEMENT BANNER */}
          {activeTab === 'ANNOUNCEMENT' && (
            <div className="bg-white rounded-b-lg border border-gray-200 shadow-sm p-6 space-y-5 text-xs animate-fade-in">
              <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-brand-600" />
                    Campus Announcement & Emergency Notice Banner
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Broadcast sticky emergency alerts or important announcements across the top of the student marketplace.
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    settings.announcement_enabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}
                >
                  {settings.announcement_enabled ? '● Broadcast Active' : '○ Inactive'}
                </span>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">Publish Announcement Banner</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    When active, this banner appears immediately for every student browsing CampusXChange.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.announcement_enabled}
                    onChange={(e) => setSettings({ ...settings, announcement_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>

              {/* Type and Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Banner Type / Severity</label>
                  <select
                    value={settings.announcement_type}
                    onChange={(e) => setSettings({ ...settings, announcement_type: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="INFO">Blue — Official Information / General Notice</option>
                    <option value="WARNING">Amber — Caution / Handover Safety Advisory</option>
                    <option value="ALERT">Red — Urgent Security Alert / Maintenance Notice</option>
                    <option value="PROMO">Green — Campus Fest / Goodwill Exchange Drive</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Target Link (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. /guidelines or https://notice.lpu.in"
                    value={settings.announcement_link}
                    onChange={(e) => setSettings({ ...settings, announcement_link: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Announcement Message *</label>
                <textarea
                  rows={2}
                  required={settings.announcement_enabled}
                  placeholder="e.g. 📢 Campus Advisory: Please conduct all physical item handovers inside well-lit campus zones..."
                  value={settings.announcement_text}
                  onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })}
                  className="w-full border border-gray-300 rounded p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Dismissible */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.announcement_dismissible}
                  onChange={(e) => setSettings({ ...settings, announcement_dismissible: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span className="font-semibold text-gray-700">
                  Allow students to dismiss (close) the banner for their current browser session
                </span>
              </label>

              {/* Live Preview */}
              <div className="pt-3 border-t border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                  Live Student Browser Preview:
                </span>
                <div className={`p-3.5 rounded-lg border transition-all ${previewStyle.bg}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${previewStyle.badgeBg}`}>
                        {previewStyle.label}
                      </span>
                      <p className="font-medium text-xs truncate">
                        {settings.announcement_text || 'Your announcement headline will be previewed here in real-time...'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {settings.announcement_link && (
                        <span className="text-[11px] font-bold underline flex items-center gap-1">
                          Learn more <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                      {settings.announcement_dismissible && (
                        <button type="button" className="opacity-60 hover:opacity-100 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLATFORM ACCESS & SECURITY */}
          {activeTab === 'SECURITY' && (
            <div className="bg-white rounded-b-lg border border-gray-200 shadow-sm p-6 space-y-6 text-xs animate-fade-in">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-brand-600" />
                  Platform Availability & Onboarding Security
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Control campus maintenance mode, onboarding throttles, and authorized domain whitelists.
                </p>
              </div>

              {/* Maintenance Mode */}
              <div className="p-4 bg-gray-50/80 rounded-lg border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs">Campus Maintenance Mode</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Temporarily freeze student write actions (postings, negotiations) during scheduled updates.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.maintenance_mode}
                      onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                  </label>
                </div>

                {settings.maintenance_mode && (
                  <div className="pt-2 border-t border-gray-200">
                    <label className="block font-bold text-gray-700 mb-1">Maintenance Advisory Message</label>
                    <textarea
                      rows={2}
                      value={settings.maintenance_message}
                      onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                      className="w-full border border-gray-300 rounded p-2.5 bg-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Allow Registrations */}
              <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">Permit Student Sign-ups</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Toggle to permit new campus registrations or temporarily pause onboarding.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_registrations}
                    onChange={(e) => setSettings({ ...settings, allow_registrations: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>

              {/* Allowed Domains */}
              <div className="p-4 bg-gray-50/80 rounded-lg border border-gray-200 space-y-2">
                <label className="block font-bold text-gray-700">Whitelisted College Email Domains</label>
                <p className="text-[11px] text-gray-500">
                  Comma-separated domains (e.g. <span className="font-mono font-bold">lpu.in, alumni.lpu.in</span>). Leave blank to accept all valid domains.
                </p>
                <input
                  type="text"
                  value={settings.allowed_domains}
                  onChange={(e) => setSettings({ ...settings, allowed_domains: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-gray-800 bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="lpu.in, thapar.edu"
                />
              </div>
            </div>
          )}

          {/* TAB 4: TEAM & RBAC LINK */}
          {activeTab === 'TEAM' && (
            <div className="bg-white rounded-b-lg border border-gray-200 shadow-sm p-8 space-y-6 text-xs animate-fade-in text-center">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-gray-900">Staff Team & Role-Based Access Control</h3>
                <p className="text-xs text-gray-500">
                  Manage appointed administrators, promote verified student users to Content Moderators or ID Verifiers, and supervise operational authority.
                </p>
                <div className="pt-2">
                  <Link
                    to="/team"
                    className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-bold text-xs transition-all shadow-sm shadow-brand-600/20"
                  >
                    <span>Open Staff Team Directory</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Submit Action Bar */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
            <p className="text-[11px] text-gray-500">
              Settings update immediately across student client apps, database checks, and API caches.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-brand-500/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
