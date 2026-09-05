import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Clock, Trash2, XCircle, ShieldCheck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING'); // 'PENDING', 'RESOLVED', 'ALL'

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/marketplace/admin/reports/`);
      setReports(res.data);
    } catch (err) {
      console.error('Failed to load reports', err);
      toast.error('Failed to load user reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (reportId, newStatus, deleteListing = false) => {
    try {
      await axios.patch(`${API_BASE}/marketplace/admin/reports/${reportId}/`, {
        status: newStatus,
        delete_listing: deleteListing
      });
      toast.success(deleteListing ? 'Listing deleted and report resolved.' : `Report marked as ${newStatus}.`);
      fetchReports();
    } catch (err) {
      console.error('Failed to update report', err);
      toast.error('Failed to update report status.');
    }
  };

  const filteredReports = reports.filter((r) => {
    if (filter === 'PENDING') return r.status === 'PENDING';
    if (filter === 'RESOLVED') return r.status === 'RESOLVED';
    return true;
  });

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Reports & Moderation</h2>
          <p className="text-sm text-gray-500">Review community flags, spam, and listing violation reports.</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {[
            { key: 'PENDING', label: `Pending (${reports.filter(r => r.status === 'PENDING').length})` },
            { key: 'RESOLVED', label: `Resolved (${reports.filter(r => r.status === 'RESOLVED').length})` },
            { key: 'ALL', label: `All (${reports.length})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                filter === tab.key
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-sm text-gray-500">
          Loading moderation reports...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-3 border border-green-100">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">
            {filter === 'PENDING' ? 'No Pending Reports!' : 'No reports found'}
          </h3>
          <p className="text-gray-500 text-sm max-w-md">
            {filter === 'PENDING'
              ? 'Your campus marketplace is running smoothly. Any reported items or peer violations will appear here.'
              : 'There are no reports recorded under this filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Reported Listing
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Reporter
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Reason & Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-gray-200 text-xs">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-sm">{report.listing_title}</div>
                    <div className="text-gray-500 text-[11px] mt-0.5">
                      Seller: @{report.listing_seller}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">@{report.reporter_username}</div>
                    <div className="text-gray-400 text-[11px]">{report.reporter_email}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-bold text-red-600">{report.reason}</div>
                    {report.details && (
                      <p className="text-gray-600 mt-1 max-w-sm line-clamp-2">{report.details}</p>
                    )}
                    <div className="text-gray-400 text-[10px] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleString()}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      report.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : report.status === 'RESOLVED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {report.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    {report.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'RESOLVED')}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 shadow-xs"
                          title="Mark Resolved"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'RESOLVED', true)}
                          className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 shadow-xs"
                          title="Remove Listing & Resolve"
                        >
                          Delete Item
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'DISMISSED')}
                          className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded text-xs font-semibold hover:bg-gray-300"
                          title="Dismiss Flag"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

