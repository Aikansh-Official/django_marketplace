import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Save, Loader2, CheckCircle2, Megaphone, Info, AlertTriangle,
  AlertCircle, Sparkles, X, ExternalLink, ShieldCheck
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    allow_registrations: true,
    allowed_domains: '',
    announcement_enabled: false,
    announcement_text: '',
    announcement_type: 'INFO',
    announcement_link: '',
    announcement_dismissible: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE}/marketplace/admin/settings/`);
        setSettings({
          maintenance_mode: res.data.maintenance_mode === 'true' || res.data.maintenance_mode === true,
          allow_registrations: res.data.allow_registrations !== 'false' && res.data.allow_registrations !== false,
          allowed_domains: res.data.allowed_domains || '',
          announcement_enabled: res.data.announcement_enabled === 'true' || res.data.announcement_enabled === true,
          announcement_text: res.data.announcement_text || '',
          announcement_type: (res.data.announcement_type || 'INFO').toUpperCase(),
          announcement_link: res.data.announcement_link || '',
          announcement_dismissible: res.data.announcement_dismissible !== 'false' && res.data.announcement_dismissible !== false,
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
        maintenance_mode: settings.maintenance_mode ? 'true' : 'false',
        allow_registrations: settings.allow_registrations ? 'true' : 'false',
        allowed_domains: settings.allowed_domains,
        announcement_enabled: settings.announcement_enabled ? 'true' : 'false',
        announcement_text: settings.announcement_text,
        announcement_type: settings.announcement_type,
        announcement_link: settings.announcement_link,
        announcement_dismissible: settings.announcement_dismissible ? 'true' : 'false',
      });
      toast.success('Platform settings & announcement saved successfully!');
    } catch (err) {
      console.error('Failed to save settings', err);
      toast.error('Failed to update platform settings.');
    } finally {
      setSaving(false);
    }
  };

  // Type styling details for live preview
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
  const PreviewIcon = previewStyle.icon;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-lg border border-gray-200 shadow-sm">
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Platform Configuration</h1>
        <p className="text-xs text-gray-500 mt-1">
          Manage platform availability, student domain whitelists, and broadcast campus-wide announcement banners.
        </p>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Loading settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION 1: GLOBAL CAMPUS ANNOUNCEMENT BANNER */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-50 rounded-lg text-brand-600 border border-brand-100">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Campus Announcement & Emergency Notice Banner
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Broadcast sticky emergency alerts or important announcements across the top of the student marketplace.
                  </p>
                </div>
              </div>

              {/* Active Pill */}
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

            <div className="p-6 space-y-5 text-xs">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">Publish Announcement Banner</h3>
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

              {/* Type and Dismissible */}
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
                    <option value="ALERT">Red — Urgent Security Alert / System Maintenance Notice</option>
                    <option value="PROMO">Green — Campus Fest / Special Discount Offer</option>
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

              {/* Message Text */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Announcement Message *</label>
                <textarea
                  rows={2}
                  required={settings.announcement_enabled}
                  placeholder="e.g. 📢 Campus Advisory: Please conduct all physical item handovers inside well-lit campus zones (Uni-Mall / Central Library). Never share OTP before inspecting the item."
                  value={settings.announcement_text}
                  onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })}
                  className="w-full border border-gray-300 rounded p-3 focus:ring-2 focus:ring-brand-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Dismissible Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.announcement_dismissible}
                  onChange={(e) => setSettings({ ...settings, announcement_dismissible: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span className="font-semibold text-gray-700">
                  Allow students to dismiss (close) the banner for their browsing session
                </span>
              </label>

              {/* Real-time Interactive Live Preview */}
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
          </div>

          {/* SECTION 2: PLATFORM OPERATIONS & DOMAINS */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex items-center gap-2.5">
              <div className="p-2 bg-brand-50 rounded-lg text-brand-600 border border-brand-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  Platform Operations & Access Controls
                </h2>
                <p className="text-[11px] text-gray-500">
                  Control maintenance mode and student registration email domains.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-gray-50/80 rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">Maintenance Mode</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Temporarily disable marketplace browsing for scheduled upgrades.
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

              <div className="flex items-center justify-between p-3.5 bg-gray-50/80 rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900 text-xs">Allow Student Sign-ups</h3>
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

              <div>
                <label className="block font-bold text-gray-700 mb-1">Whitelisted Email Domains</label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Comma-separated domains (e.g. <span className="font-mono">lpu.in, alumnus.lpu.in</span>). Leave blank to accept any valid student domain.
                </p>
                <input
                  type="text"
                  value={settings.allowed_domains}
                  onChange={(e) => setSettings({ ...settings, allowed_domains: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="lpu.in, mylpu.in"
                />
              </div>
            </div>
          </div>

          {/* Form Submit Bar */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
            <p className="text-[11px] text-gray-500">
              All changes are updated immediately across client apps and API caches.
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
