import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  ShieldAlert, ShieldCheck, Search, RefreshCw, 
  Download, Eye, X, 
  AlertTriangle, Clock, Globe, Key
} from 'lucide-react';
import { api } from '../config/api';
import { exportToCSV } from '../utils/csvExport';
import Pagination from '../components/common/Pagination';

// Action categories mapping
const actionCategories = {
  USER_MODERATION: ['USER_BAN', 'USER_UNBAN', 'USER_VERIFY', 'USER_REVOKE_VERIFY', 'USER_UPDATE', 'USER_DELETE'],
  LISTING_ACTIONS: ['LISTING_DELETE', 'LISTING_HIDE', 'LISTING_ACTIVATE', 'LISTING_UPDATE'],
  DEALS_DISPUTES: ['DEAL_FORCE_CANCEL', 'DEAL_FORCE_COMPLETE'],
  BROADCASTS_NOTICES: ['BROADCAST_SENT', 'DIRECT_NOTICE_SENT'],
  CATEGORIES: ['CATEGORY_CREATE', 'CATEGORY_UPDATE', 'CATEGORY_DELETE'],
  SETTINGS_SECURITY: ['SETTINGS_UPDATE', 'BANNED_WORDS_UPDATE', 'SECURITY_ALERT', 'REPORT_RESOLVED']
};

export default function AuditLogs() {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'login_security'

  // Staff Audit Logs State
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total_count: 0,
    count_24h: 0,
    critical_count: 0,
    unique_admins: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const selectedAction = 'ALL';
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [staffCurrentPage, setStaffCurrentPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(25);
  const [activeLog, setActiveLog] = useState(null);

  // Student Login Security Audits State
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginStats, setLoginStats] = useState({
    total_count: 0,
    google_success: 0,
    password_success: 0,
    total_failed: 0,
  });
  const [loadingLoginLogs, setLoadingLoginLogs] = useState(false);
  const [loginSearch, setLoginSearch] = useState('');
  const [loginMethodFilter, setLoginMethodFilter] = useState('ALL'); // ALL, GOOGLE, PASSWORD
  const [loginStatusFilter, setLoginStatusFilter] = useState('ALL'); // ALL, SUCCESS, FAILED
  const [loginCurrentPage, setLoginCurrentPage] = useState(1);
  const [loginPageSize, setLoginPageSize] = useState(25);

  // Fetch Staff Logs
  const fetchLogs = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedAction !== 'ALL') params.action = selectedAction;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/marketplace/admin/audit-logs/', { params });
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

  // Fetch Student Login Logs
  const fetchLoginLogs = async () => {
    setLoadingLoginLogs(true);
    try {
      const params = {};
      if (loginSearch.trim()) params.search = loginSearch.trim();
      if (loginMethodFilter !== 'ALL') params.method = loginMethodFilter;
      if (loginStatusFilter !== 'ALL') params.status = loginStatusFilter;

      const res = await api.get('/auth/login-logs/', { params });
      setLoginLogs(res.data.logs || []);
      setLoginStats({
        total_count: res.data.total_count || 0,
        google_success: res.data.google_success || 0,
        password_success: res.data.password_success || 0,
        total_failed: res.data.total_failed || 0,
      });
    } catch (err) {
      console.error("Failed to load login security logs:", err);
    } finally {
      setLoadingLoginLogs(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (activeTab === 'staff') {
        fetchLogs();
      } else {
        fetchLoginLogs();
      }
    }, 250);
    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedAction, dateFrom, dateTo, activeTab, loginSearch, loginMethodFilter, loginStatusFilter]);

  // Action categories mapping moved outside component

  // Filter logs by category
  const filteredLogs = useMemo(() => {
    if (selectedCategory === 'ALL') return logs;
    const allowed = actionCategories[selectedCategory] || [];
    return logs.filter(l => allowed.includes(l.action));
  }, [logs, selectedCategory]);

  // Paginated Staff Logs
  const paginatedStaffLogs = useMemo(() => {
    const start = (staffCurrentPage - 1) * staffPageSize;
    return filteredLogs.slice(start, start + staffPageSize);
  }, [filteredLogs, staffCurrentPage, staffPageSize]);

  // Paginated Login Logs
  const paginatedLoginLogs = useMemo(() => {
    const start = (loginCurrentPage - 1) * loginPageSize;
    return loginLogs.slice(start, start + loginPageSize);
  }, [loginLogs, loginCurrentPage, loginPageSize]);

  // Export Staff Logs CSV
  const handleExportStaffCSV = () => {
    exportToCSV({
      data: filteredLogs,
      headers: [
        'Log ID',
        'Timestamp',
        'Admin Username',
        'Action Category',
        'Action Label',
        'Target Type',
        'Target ID',
        'Target Entity',
        'Client IP'
      ],
      rowMapper: (l) => [
        l.id,
        new Date(l.created_at).toLocaleString(),
        l.admin_username,
        l.action,
        l.action_display,
        l.target_model,
        l.target_id || '',
        l.target_repr || '',
        l.ip_address || ''
      ],
      filename: `campxchange_audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    });
  };

  // Export Login Security Logs CSV
  const handleExportLoginCSV = () => {
    exportToCSV({
      data: loginLogs,
      headers: [
        'Session ID',
        'Attempted Reg No',
        'Attempted Email',
        'Login Method',
        'Status',
        'Failure Reason',
        'IP Address',
        'User Agent',
        'Timestamp'
      ],
      rowMapper: (l) => [
        l.id,
        l.reg_no_attempted || l.user?.username || '',
        l.email_attempted || l.user?.email || '',
        l.login_method,
        l.status,
        l.failure_reason || 'N/A',
        l.ip_address || '',
        l.user_agent || '',
        new Date(l.created_at).toLocaleString()
      ],
      filename: `campxchange_login_security_${new Date().toISOString().split('T')[0]}.csv`
    });
  };

  const getActionBadgeColor = (severity) => {
    switch (severity) {
      case 'DANGER':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Top Header & Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-gray-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-brand-600" />
            <h1 className="text-xl font-black text-gray-900 tracking-tight">System Audit & Security Logs</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
              Immutable Records
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            Real-time telemetry tracking staff administration mutations and student login security attempts.
          </p>
        </div>

        {/* Tab Switcher & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                activeTab === 'staff'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Staff Action Trail ({stats.total_count})
            </button>
            <button
              onClick={() => setActiveTab('login_security')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'login_security'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Student Login Audits ({loginStats.total_count})
            </button>
          </div>

          <button
            onClick={activeTab === 'staff' ? handleExportStaffCSV : handleExportLoginCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Export CSV
          </button>

          <button
            onClick={() => activeTab === 'staff' ? fetchLogs(true) : fetchLoginLogs()}
            disabled={loading || refreshing || loadingLoginLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || refreshing || loadingLoginLogs) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ================= TAB 1: STAFF ACTION TRAIL ================= */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Recorded Actions</span>
                <span className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{stats.total_count}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Platform audit timeline</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">24h Admin Activity</span>
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{stats.count_24h}</p>
              <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Recent staff mutations</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Critical Interventions</span>
                <span className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-rose-700 mt-2">{stats.critical_count}</p>
              <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Bans, cancellations & deletions</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-gray-200/80 shadow-2xs">
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

          {/* Filter Bar */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by admin, target entity, ID, or IP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs font-semibold focus:bg-white focus:outline-none"
                >
                  <option value="ALL">All Action Categories</option>
                  <option value="USER_MODERATION">User Moderation & Bans</option>
                  <option value="LISTING_ACTIONS">Listing Takedowns & Edits</option>
                  <option value="DEALS_DISPUTES">Deals & Handover Interventions</option>
                  <option value="BROADCASTS_NOTICES">Broadcasts & Student Warnings</option>
                  <option value="CATEGORIES">Category Administration</option>
                  <option value="SETTINGS_SECURITY">Platform Configuration & Security</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-1/2 px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 text-[11px] font-medium"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-1/2 px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 text-[11px] font-medium"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200/80 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/60 text-gray-500 uppercase tracking-wider text-[10px] font-black border-b border-gray-200">
                    <th className="py-3 px-5">Timestamp</th>
                    <th className="py-3 px-5">Staff Member</th>
                    <th className="py-3 px-5">Action Category</th>
                    <th className="py-3 px-5">Target Entity</th>
                    <th className="py-3 px-5">Client IP</th>
                    <th className="py-3 px-5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan="6" className="py-4 px-5">
                          <div className="h-4 bg-gray-100 rounded w-full" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedStaffLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-400">
                        No audit log entries matching criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedStaffLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-5 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-[10px]">
                              {log.admin_username?.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-bold text-gray-900">@{log.admin_username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getActionBadgeColor(log.severity)}`}>
                            {log.action_display || log.action}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <div className="max-w-xs truncate">
                            <span className="font-bold text-gray-800">{log.target_repr || 'N/A'}</span>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              {log.target_model} {log.target_id ? `(#${log.target_id})` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-5 font-mono text-gray-500 text-[11px]">
                          {log.ip_address || 'Internal/CLI'}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button
                            onClick={() => setActiveLog(log)}
                            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                            title="Inspect Payload"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={staffCurrentPage}
              totalItems={filteredLogs.length}
              pageSize={staffPageSize}
              onPageChange={setStaffCurrentPage}
              onPageSizeChange={setStaffPageSize}
            />
          </div>
        </div>
      )}

      {/* ================= TAB 2: STUDENT LOGIN SECURITY AUDITS ================= */}
      {activeTab === 'login_security' && (
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Logins Attempted</span>
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{loginStats.total_count}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Campus auth telemetry</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Google OAuth Logins</span>
                <span className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  G
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">{loginStats.google_success}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Verified university accounts</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Password Sign-Ins</span>
                <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{loginStats.password_success}</p>
              <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Direct credentials logins</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-5 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Failed Attempts / Anomalies</span>
                <span className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-rose-700 mt-2">{loginStats.total_failed}</p>
              <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Rejected or invalid attempts</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student reg no, email, IP address, or failure reason..."
                value={loginSearch}
                onChange={(e) => setLoginSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={loginMethodFilter}
                onChange={(e) => setLoginMethodFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs font-semibold focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Auth Methods</option>
                <option value="GOOGLE">Google OAuth</option>
                <option value="PASSWORD">Password Login</option>
              </select>

              <select
                value={loginStatusFilter}
                onChange={(e) => setLoginStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs font-semibold focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200/80 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/60 text-gray-500 uppercase tracking-wider text-[10px] font-black border-b border-gray-200">
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Attempted Student</th>
                    <th className="py-3 px-5">Method</th>
                    <th className="py-3 px-5">Client IP Address</th>
                    <th className="py-3 px-5">Device / Browser</th>
                    <th className="py-3 px-5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingLoginLogs ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan="6" className="py-4 px-5">
                          <div className="h-4 bg-gray-100 rounded w-full" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedLoginLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-400">
                        No login session records matching current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedLoginLogs.map((log) => {
                      const isSuccess = log.status === 'SUCCESS';

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              {log.status}
                            </span>
                            {log.failure_reason && (
                              <span className="text-[10px] text-red-500 block mt-0.5 italic">
                                {log.failure_reason}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-5">
                            <div>
                              <p className="font-bold text-gray-900 font-mono text-[11px]">
                                {log.reg_no_attempted ? `@${log.reg_no_attempted}` : log.user?.username ? `@${log.user.username}` : 'Anonymous Attempt'}
                              </p>
                              <span className="text-[10px] text-gray-500 truncate block max-w-xs">
                                {log.email_attempted || log.user?.email || 'No email provided'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                              log.login_method === 'GOOGLE'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {log.login_method}
                            </span>
                          </td>
                          <td className="py-3 px-5 font-mono text-gray-600 text-[11px] whitespace-nowrap">
                            {log.ip_address || 'Unknown IP'}
                          </td>
                          <td className="py-3 px-5">
                            <p className="text-[11px] text-gray-600 truncate max-w-xs" title={log.user_agent}>
                              {log.user_agent || 'Standard Web Client'}
                            </p>
                          </td>
                          <td className="py-3 px-5 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={loginCurrentPage}
              totalItems={loginLogs.length}
              pageSize={loginPageSize}
              onPageChange={setLoginCurrentPage}
              onPageSizeChange={setLoginPageSize}
            />
          </div>
        </div>
      )}

      {/* Staff Log Payload Inspection Modal */}
      {activeLog && (
        <div
          className="fixed inset-0 bg-ink-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveLog(null);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-base font-black text-gray-900">Audit Action Details</h3>
                <span className="font-mono text-xs text-gray-400">Log #{activeLog.id}</span>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Admin Actor</span>
                  <p className="font-bold text-gray-900 mt-0.5">@{activeLog.admin_username}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Action Code</span>
                  <p className="font-mono font-bold text-brand-600 mt-0.5">{activeLog.action}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">IP Address</span>
                  <p className="font-mono text-gray-800 mt-0.5">{activeLog.ip_address || 'Internal'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Timestamp</span>
                  <p className="text-gray-800 mt-0.5">{new Date(activeLog.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1">
                  Target Entity
                </span>
                <p className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 font-semibold text-gray-800">
                  {activeLog.target_repr || 'N/A'}
                  <span className="text-gray-400 font-mono text-[10px] block font-normal">
                    Model: {activeLog.target_model} | ID: {activeLog.target_id}
                  </span>
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1">
                  JSON Mutation Payload
                </span>
                <pre className="p-3 bg-ink-950 text-brand-300 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48 border border-gray-800">
                  {JSON.stringify(activeLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/80 flex justify-end">
              <button
                onClick={() => setActiveLog(null)}
                className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
