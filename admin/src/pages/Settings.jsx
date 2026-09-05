import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    allow_registrations: true,
    allowed_domains: 'lpu.in, lpu.co.in'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE}/marketplace/admin/settings/`);
        setSettings({
          maintenance_mode: res.data.maintenance_mode === 'true' || res.data.maintenance_mode === true,
          allow_registrations: res.data.allow_registrations !== 'false' && res.data.allow_registrations !== false,
          allowed_domains: res.data.allowed_domains || 'lpu.in, lpu.co.in'
        });
      } catch (err) {
        console.error('Failed to load settings', err);
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
        allowed_domains: settings.allowed_domains
      });
      toast.success('Platform settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings', err);
      toast.error('Failed to update platform settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md overflow-hidden max-w-3xl">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Platform Settings</h2>
          <p className="text-sm text-gray-500">Configure global platform behavior stored in the database.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-gray-500">
          Loading platform settings...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2 mb-4">
                General Configuration
              </h3>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Maintenance Mode</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Temporarily disable the client site for updates.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.maintenance_mode}
                      onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Allow New Registrations</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Enable or disable new student sign-ups.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allow_registrations}
                      onChange={(e) => setSettings({ ...settings, allow_registrations: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2 mb-4">
                Email Authentication Domains
              </h3>
              <p className="text-xs text-gray-500 mb-2">Comma-separated list of student email domains permitted during registration.</p>
              <input
                type="text"
                value={settings.allowed_domains}
                onChange={(e) => setSettings({ ...settings, allowed_domains: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500 bg-white"
                placeholder="lpu.in, lpu.co.in"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-ink-900 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-gray-800 shadow-md hover:shadow-lg transition-all text-xs disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

