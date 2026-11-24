import { X, Loader2 } from 'lucide-react';

export default function ListingEditModal({
  listing,
  categories,
  formData,
  setFormData,
  onClose,
  onSubmit,
  actionLoading,
}) {
  if (!listing) return null;

  return (
    <div
      className="fixed inset-0 bg-ink-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !actionLoading) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 my-auto text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
          <div>
            <h3 className="text-base font-black text-gray-900">Edit Listing Information</h3>
            <p className="text-xs text-gray-500 truncate max-w-md">{listing.title}</p>
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
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Listing Title
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Condition
              </label>
              <select
                value={formData.condition || 'GOOD'}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
              >
                <option value="NEW">BRAND NEW</option>
                <option value="LIKE_NEW">LIKE NEW</option>
                <option value="GOOD">GOOD</option>
                <option value="FAIR">FAIR</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.price ?? 0}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Campus Location
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows="3"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
            />
          </div>

          {/* Status & Options */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Listing Status
              </label>
              <select
                value={formData.status || 'ACTIVE'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs font-semibold bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="HIDDEN">HIDDEN</option>
                <option value="SOLD">SOLD</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>

            <div className="flex flex-col justify-center space-y-1">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.is_negotiable}
                  onChange={(e) => setFormData({ ...formData, is_negotiable: e.target.checked })}
                  className="rounded text-brand-600"
                />
                Price Negotiable
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.is_trusted}
                  onChange={(e) => setFormData({ ...formData, is_trusted: e.target.checked })}
                  className="rounded text-brand-600"
                />
                Trusted Campus Badge
              </label>
            </div>
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
