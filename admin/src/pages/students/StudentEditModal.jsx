import { X, Loader2 } from 'lucide-react';

export default function StudentEditModal({
  student,
  formData,
  setFormData,
  onClose,
  onSubmit,
  actionLoading,
}) {
  if (!student) return null;

  return (
    <div
      className="fixed inset-0 bg-ink-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !actionLoading) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
          <div>
            <h3 className="text-base font-black text-gray-900">Edit Student Details</h3>
            <p className="text-xs text-gray-500 font-mono">@{student.username}</p>
          </div>
          <button
            onClick={onClose}
            disabled={actionLoading}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name || ''}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Campus Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone_number || ''}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Student Role
              </label>
              <select
                value={formData.role || 'BUYER'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
              >
                <option value="BUYER">BUYER (Browse & Purchase)</option>
                <option value="SELLER">SELLER (Post listings)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Trust Score (0 - 100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.trust_score ?? 0}
                onChange={(e) => setFormData({ ...formData, trust_score: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
              />
            </div>
          </div>

          {/* Status Switches */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-gray-700">Account Active (Not Banned)</span>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-gray-700">Physical ID Verified Status</span>
              <input
                type="checkbox"
                checked={formData.is_id_verified}
                onChange={(e) => setFormData({ ...formData, is_id_verified: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
            </label>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={actionLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
