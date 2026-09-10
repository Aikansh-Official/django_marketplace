import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ShieldAlert, ShieldCheck, Search, Filter, RefreshCw, 
  Download, Calendar, Eye, X, User, ArrowUpRight, 
  AlertTriangle, Clock, Globe, FileText, CheckCircle2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total_count: 0,
    count_24h: 0,
    critical_count: 0,
    unique_admins: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Inspection Modal
  const [activeLog, setActiveLog] = useState(null);

  const fetchLogs = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedAction !== 'ALL') params.append('action', selectedAction);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const res = await axios.get(`${API_BASE}/marketplace/admin/audit-logs/?${params.toString()}`);
      setLogs(res.data.logs || []);
      setStats({
        total_count: res.data.total_count || 0,
        count_24h: res.data.count_24h || 0,
        critical_count: res.data.critical_count || 0,
        unique_admins: res.data.unique_admins || 0
      });
      if (isManual) toast.success("Audit trail refreshed");
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedAction, dateFrom, dateTo]);

  // Action categories mapping
  const actionCategories = {
    USER_MODERATION: ['USER_BAN', 'USER_UNBAN', 'USER_VERIFY', 'USER_REVOKE_VERIFY', 'USER_UPDATE', 'USER_DELETE'],
    LISTING_ACTIONS: ['LISTING_DELETE', 'LISTING_HIDE', 'LISTING_ACTIVATE', 'LISTING_UPDATE'],
    DEALS_DISPUTES: ['DEAL_FORCE_CANCEL', 'DEAL_FORCE_COMPLETE'],
    BROADCASTS_NOTICES: ['BROADCAST_SENT', 'DIRECT_NOTICE_SENT'],
    CATEGORIES: ['CATEGORY_CREATE', 'CATEGORY_UPDATE', 'CATEGORY_DELETE'],
    SETTINGS_SECURITY: ['SETTINGS_UPDATE', 'BANNED_WORDS_UPDATE', 'SECURITY_ALERT', 'REPORT_RESOLVED']
  };

  // Filter logs by category in frontend if selected
  const filteredLogs = useMemo(() => {
    if (selectedCategory === 'ALL') return logs;
    const allowed = actionCategories[selectedCategory] || [];
    return logs.filter(l => allowed.includes(l.action));
  }, [logs, selectedCategory]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error("No audit records to export");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "CampusXChange Administrative Audit Trail\n";
    csvContent += `Generated On,${new Date().toLocaleString()}\n`;
    csvContent += `Records Count,${filteredLogs.length}\n\n`;

    csvContent += "Log ID,Timestamp,Admin Username,Action,Action Label,Target Type,Target ID,Target Name,IP Address,Details\n";

    filteredLogs.forEach(l => {
      const detailsStr = JSON.stringify(l.details || {}).replace(/"/g, '""');
      csvContent += `${l.id},"${new Date(l.created_at).toLocaleString()}","${l.admin_username}","${l.action}","${l.action_display}","${l.target_type}","${l.target_id}","${l.target_repr || ''}","${l.ip_address || 'Localhost'}","${detailsStr}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campusxchange_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Audit log CSV exported successfully");
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'USER_BAN':
      case 'USER_DELETE':
      case 'LISTING_DELETE':
      case 'DEAL_FORCE_CANCEL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'USER_VERIFY':
      case 'DEAL_FORCE_COMPLETE':
      case 'LISTING_ACTIVATE':
      case 'CATEGORY_CREATE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'BROADCAST_SENT':
      case 'DIRECT_NOTICE_SENT':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SETTINGS_UPDATE':
      case 'BANNED_WORDS_UPDATE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'LISTING_HIDE':
      case 'USER_REVOKE_VERIFY':
      case 'REPORT_RESOLVED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-md">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Admin Audit Trail & Activity Logs</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Immutable records of all staff interventions, account suspensions, dispute overrides & platform configuration changes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md border border-gray-200 transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-xs font-bold shadow-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Audit Records</span>
            <span className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats.total_count}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Permanent immutable records</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">24h Admin Activity</span>
            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats.count_24h}</p>
          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Recent staff mutations</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Critical Interventions</span>
            <span className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{stats.critical_count}</p>
          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Bans, cancellations & deletions</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Staff Operators</span>
            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats.unique_admins}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Authorized administrator accounts</p>
        </div>

      </div>

      {/* Multi-Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-md border border-white/50 shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by admin, target entity, ID, or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-md border border-gray-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Action Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 rounded-md border border-gray-200 text-xs font-semibold focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Action Categories</option>
              <option value="USER_MODERATION">Student Account Moderation</option>
              <option value="LISTING_ACTIONS">Listing Actions (Delete/Hide)</option>
              <option value="DEALS_DISPUTES">Deals & Dispute Overrides</option>
              <option value="BROADCASTS_NOTICES">Broadcasts & Direct Notices</option>
              <option value="CATEGORIES">Category Changes</option>
              <option value="SETTINGS_SECURITY">Settings & Security</option>
            </select>
          </div>

          {/* Date From */}
          <div className="sm:col-span-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-2 bg-gray-50 rounded-md border border-gray-200 text-xs font-medium focus:bg-white focus:outline-none"
              title="From Date"
            />
          </div>

          {/* Date To */}
          <div className="sm:col-span-2">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-2 bg-gray-50 rounded-md border border-gray-200 text-xs font-medium focus:bg-white focus:outline-none"
              title="To Date"
            />
          </div>

        </div>

        {/* Quick Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 text-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Quick:</span>
          {[
            { id: 'ALL', label: 'All Logs' },
            { id: 'USER_MODERATION', label: 'Student Bans/ID' },
            { id: 'DEALS_DISPUTES', label: 'Dispute Overrides' },
            { id: 'LISTING_ACTIONS', label: 'Listings Moderation' },
            { id: 'BROADCASTS_NOTICES', label: 'Broadcasts' },
            { id: 'SETTINGS_SECURITY', label: 'Platform Config' }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setSelectedCategory(chip.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all ${
                selectedCategory === chip.id
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Staff Admin</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">IP Address / Source</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-5 w-28 bg-gray-200 rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-36 bg-gray-200 rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-gray-200 rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-gray-200 rounded"></div></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-6 w-16 bg-gray-200 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    No administrative audit records match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    
                    {/* Action Badge */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black border ${getActionBadge(log.action)}`}>
                        {log.action_display || log.action}
                      </span>
                    </td>

                    {/* Admin User */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-[10px]">
                          {log.admin_username[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 block">{log.admin_name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">@{log.admin_username}</span>
                        </div>
                      </div>
                    </td>

                    {/* Target Entity */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-gray-900 block truncate max-w-[220px]">
                          {log.target_repr || 'N/A'}
                        </span>
                        {log.target_type && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            Type: {log.target_type} {log.target_id ? `(#${log.target_id})` : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* IP Address & Network */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-gray-500 font-mono text-[11px]">
                        <Globe className="w-3 h-3 text-gray-400" />
                        <span>{log.ip_address || '127.0.0.1'}</span>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="text-gray-900 font-semibold block">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    {/* Inspection Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-brand-50 hover:text-brand-600 text-gray-700 rounded text-[11px] font-bold transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Details</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail & Diff Lightbox Modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-md shadow-2xl max-w-2xl w-full border border-gray-100 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded text-xs font-black border ${getActionBadge(activeLog.action)}`}>
                  {activeLog.action_display || activeLog.action}
                </span>
                <span className="text-xs font-mono text-gray-400">Log ID #{activeLog.id}</span>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Operator & Target Summary Grid */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md border border-gray-200/60 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Staff Operator</span>
                  <p className="font-black text-gray-900 mt-0.5">{activeLog.admin_name}</p>
                  <p className="text-gray-500 font-mono">@{activeLog.admin_username}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Entity</span>
                  <p className="font-black text-gray-900 mt-0.5">{activeLog.target_repr || 'N/A'}</p>
                  <p className="text-gray-500 font-mono">{activeLog.target_type} {activeLog.target_id ? `(#${activeLog.target_id})` : ''}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">IP Address</span>
                  <p className="font-mono text-gray-800 mt-0.5">{activeLog.ip_address || '127.0.0.1 (Local)'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Recorded Timestamp</span>
                  <p className="font-semibold text-gray-800 mt-0.5">{new Date(activeLog.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* User Agent */}
              {activeLog.user_agent && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-gray-500">Client User Agent:</span>
                  <p className="p-2.5 bg-gray-50 rounded border border-gray-200 text-[11px] font-mono text-gray-600 break-all">
                    {activeLog.user_agent}
                  </p>
                </div>
              )}

              {/* JSON Details Payload */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-500">Operation Diff & Payload Details:</span>
                <div className="bg-ink-900 text-gray-200 p-4 rounded-md font-mono text-xs overflow-x-auto max-h-64 border border-gray-800">
                  {activeLog.details && Object.keys(activeLog.details).length > 0 ? (
                    <pre>{JSON.stringify(activeLog.details, null, 2)}</pre>
                  ) : (
                    <span className="text-gray-500 italic">No custom metadata payload logged for this operation.</span>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setActiveLog(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-bold transition-colors"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
