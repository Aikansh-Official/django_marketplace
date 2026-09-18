import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users, UserCheck, Shield, ShieldAlert, ShieldCheck,
  UserPlus, Search, Filter, RefreshCw, X, Loader2,
  CheckCircle2, AlertTriangle, Key, Clock, Mail, Phone, Lock
} from 'lucide-react';
import {
  PERMISSION_CATALOG,
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  getEffectivePermissions
} from '../utils/permissions';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Team() {
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState({
    total_staff: 0,
    super_admins: 0,
    moderators: 0,
    id_verifiers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modals
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [foundStudent, setFoundStudent] = useState(null);
  const [promoteRole, setPromoteRole] = useState('MODERATOR');
  const [promotePermissions, setPromotePermissions] = useState([...DEFAULT_ROLE_PERMISSIONS['MODERATOR']]);
  const [submittingPromote, setSubmittingPromote] = useState(false);

  // Edit / Revoke Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editPermissions, setEditPermissions] = useState([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Current logged in admin user
  const [currentAdmin, setCurrentAdmin] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        setCurrentAdmin(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchStaff = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`${API_BASE}/auth/staff/`);
      setStaff(res.data.staff || []);
      setStats(res.data.stats || { total_staff: 0, super_admins: 0, moderators: 0, id_verifiers: 0 });
      if (isManual) toast.success('Staff team list updated');
    } catch (err) {
      console.error('Failed to load staff members', err);
      toast.error('Failed to load staff directory.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      const matchesSearch =
        member.username.toLowerCase().includes(search.toLowerCase()) ||
        (member.full_name && member.full_name.toLowerCase().includes(search.toLowerCase())) ||
        (member.email && member.email.toLowerCase().includes(search.toLowerCase()));

      const matchesRole =
        roleFilter === 'ALL' || member.effective_role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [staff, search, roleFilter]);

  // Search student for promotion
  const handleSearchStudent = async () => {
    if (!studentSearch.trim()) return;
    setSearchingStudent(true);
    setFoundStudent(null);
    try {
      const res = await axios.get(`${API_BASE}/auth/users/?search=${encodeURIComponent(studentSearch.trim())}`);
      const users = res.data.results || res.data || [];
      const student = users.find(
        (u) =>
          u.username.toLowerCase() === studentSearch.trim().toLowerCase() ||
          u.email.toLowerCase() === studentSearch.trim().toLowerCase()
      );
      if (student) {
        setFoundStudent(student);
      } else if (users.length > 0) {
        setFoundStudent(users[0]);
      } else {
        toast.error('No registered student found with that registration number or email.');
      }
    } catch (err) {
      console.error('Failed to find student', err);
      toast.error('Error searching for student.');
    } finally {
      setSearchingStudent(false);
    }
  };

  const handlePromoteRoleChange = (role) => {
    setPromoteRole(role);
    if (role === 'SUPER_ADMIN') {
      setPromotePermissions([...ALL_PERMISSION_KEYS]);
    } else {
      setPromotePermissions([...(DEFAULT_ROLE_PERMISSIONS[role] || [])]);
    }
  };

  // Submit Promotion
  const handlePromoteStaff = async (e) => {
    e.preventDefault();
    if (!foundStudent) {
      toast.error('Please search and select a student first.');
      return;
    }

    setSubmittingPromote(true);
    try {
      await axios.post(`${API_BASE}/auth/staff/`, {
        user_id: foundStudent.id,
        admin_role: promoteRole,
        admin_permissions: promotePermissions,
      });
      toast.success(`Successfully appointed @${foundStudent.username} as ${promoteRole}!`);
      setPromoteModalOpen(false);
      setFoundStudent(null);
      setStudentSearch('');
      fetchStaff();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to appoint staff member.';
      toast.error(errMsg);
    } finally {
      setSubmittingPromote(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (member) => {
    setSelectedStaff(member);
    const role = member.admin_role || member.effective_role || 'MODERATOR';
    setEditRole(role);
    setEditPermissions([...getEffectivePermissions(member)]);
    setEditModalOpen(true);
  };

  const handleEditRoleChange = (role) => {
    setEditRole(role);
    if (role === 'SUPER_ADMIN') {
      setEditPermissions([...ALL_PERMISSION_KEYS]);
    } else {
      setEditPermissions([...(DEFAULT_ROLE_PERMISSIONS[role] || [])]);
    }
  };

  // Submit Role & Permissions Change
  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setSubmittingEdit(true);
    try {
      await axios.patch(`${API_BASE}/auth/staff/${selectedStaff.id}/`, {
        admin_role: editRole,
        admin_permissions: editPermissions,
      });
      toast.success(`Updated permissions and role for @${selectedStaff.username}`);
      setEditModalOpen(false);
      fetchStaff();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to update staff permissions.';
      toast.error(errMsg);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Revoke Staff Privileges
  const handleRevokeStaff = async () => {
    if (!selectedStaff) return;
    if (currentAdmin && (currentAdmin.id === selectedStaff.id || currentAdmin.username === selectedStaff.username)) {
      toast.error('You cannot revoke your own staff privileges.');
      return;
    }

    if (!window.confirm(`Are you sure you want to revoke administrative privileges for @${selectedStaff.username}? They will return to standard student access.`)) {
      return;
    }

    setSubmittingEdit(true);
    try {
      await axios.delete(`${API_BASE}/auth/staff/${selectedStaff.id}/`);
      toast.success(`Revoked staff privileges for @${selectedStaff.username}`);
      setEditModalOpen(false);
      fetchStaff();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to revoke staff access.';
      toast.error(errMsg);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            Super Admin
          </span>
        );
      case 'MODERATOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            Moderator
          </span>
        );
      case 'ID_VERIFIER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            ID Verifier
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200">
            Staff
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-brand-600" />
            Staff Team & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage administrative personnel, assign operational privileges, and supervise staff activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchStaff(true)}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            title="Refresh Staff Directory"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          <button
            onClick={() => {
              setFoundStudent(null);
              setStudentSearch('');
              setPromoteModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm shadow-brand-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Appoint / Promote Staff</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.total_staff}</p>
          <span className="text-[10px] text-gray-400">Authorized personnel</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Super Admins</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700">{stats.super_admins}</p>
          <span className="text-[10px] text-purple-600/80">Unrestricted system authority</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Moderators</span>
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-700">{stats.moderators}</p>
          <span className="text-[10px] text-sky-600/80">Catalog & dispute oversight</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">ID Verifiers</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{stats.id_verifiers}</p>
          <span className="text-[10px] text-emerald-600/80">Student verification lightbox</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff by name, @reg_no, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Staff' },
            { id: 'SUPER_ADMIN', label: 'Super Admins' },
            { id: 'MODERATOR', label: 'Moderators' },
            { id: 'ID_VERIFIER', label: 'ID Verifiers' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setRoleFilter(chip.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
                roleFilter === chip.id
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Members Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-500">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
            Loading staff directory...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-700">No staff members found matching criteria.</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Try adjusting your search query or role filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Staff Member</th>
                  <th className="px-6 py-3.5">Contact Details</th>
                  <th className="px-6 py-3.5">Assigned Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Added Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.map((member) => {
                  const isCurrent = currentAdmin && (currentAdmin.id === member.id || currentAdmin.username === member.username);
                  return (
                    <tr key={member.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Name and Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0 border border-brand-200">
                            {member.profile_photo ? (
                              <img
                                src={member.profile_photo}
                                alt={member.username}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              member.username.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">
                              {member.full_name || member.username}
                            </p>
                            <span className="font-mono text-[11px] text-gray-500">
                              @{member.username}
                            </span>
                            {isCurrent && (
                              <span className="ml-2 text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4 text-gray-600">
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1.5 text-gray-800">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{member.email || '—'}</span>
                          </p>
                          {member.phone_number && (
                            <p className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{member.phone_number}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Role & Perms */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div>{getRoleBadge(member.effective_role)}</div>
                          <div className="text-[10px] text-gray-500 font-medium">
                            <span
                              className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200"
                              title={getEffectivePermissions(member).join(', ')}
                            >
                              <Key className="w-2.5 h-2.5 text-gray-400" />
                              {getEffectivePermissions(member).length} / {ALL_PERMISSION_KEYS.length} modules
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            member.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {member.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      {/* Added Date */}
                      <td className="px-6 py-4 text-gray-500 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {member.date_joined
                              ? new Date(member.date_joined).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEditModal(member)}
                          className="px-3 py-1.5 rounded-md text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          Manage Role
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: APPOINT / PROMOTE STAFF */}
      {promoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-xl w-full my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-600" />
                <h3 className="font-black text-gray-900 text-sm">Appoint / Promote Staff Member</h3>
              </div>
              <button
                onClick={() => setPromoteModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePromoteSubmit} className="p-6 space-y-4 text-xs">
              {/* Search user */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  1. Lookup Registered Student *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter 8-digit registration no or college email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSearchStudent}
                    disabled={searchingStudent || !studentSearch.trim()}
                    className="bg-ink-900 hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {searchingStudent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Lookup</span>
                  </button>
                </div>
              </div>

              {/* Found Student Card */}
              {foundStudent && (
                <div className="p-3 bg-brand-50/60 border border-brand-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center">
                      {foundStudent.username?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{foundStudent.full_name || foundStudent.username}</p>
                      <p className="text-gray-500 text-[11px]">{foundStudent.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
                    Student Found
                  </span>
                </div>
              )}

              {/* Role Preset Selector */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  2. Base Administrative Role *
                </label>
                <select
                  value={promoteRole}
                  onChange={(e) => handlePromoteRoleChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-xs font-medium"
                >
                  <option value="MODERATOR">Content Moderator (Default: Catalog, Reports, Deals)</option>
                  <option value="ID_VERIFIER">Student ID Verifier (Default: Students & Verification)</option>
                  <option value="SUPER_ADMIN">Super Administrator (Full Unrestricted System Authority)</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Selecting a role presets recommended tabs. You can customize permissions below.
                </p>
              </div>

              {/* Step 3: Granular Permissions Checklist */}
              <div className="space-y-2.5 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-brand-600" />
                      Allowed Tabs & Sections ({promotePermissions.length} / {ALL_PERMISSION_KEYS.length} Granted)
                    </label>
                    <p className="text-[10px] text-gray-500">
                      {promoteRole === 'SUPER_ADMIN'
                        ? 'Super Admin automatically has full authority over all sections.'
                        : 'Toggle individual tabs and permissions for this staff member.'}
                    </p>
                  </div>
                  {promoteRole !== 'SUPER_ADMIN' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPromotePermissions([...ALL_PERMISSION_KEYS])}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-700 underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setPromotePermissions([...(DEFAULT_ROLE_PERMISSIONS[promoteRole] || [])])}
                        className="text-[11px] font-bold text-gray-500 hover:text-gray-700 underline cursor-pointer"
                      >
                        Reset Defaults
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {PERMISSION_CATALOG.map((perm) => {
                    const isChecked = promoteRole === 'SUPER_ADMIN' || promotePermissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2 rounded-md border transition-all ${
                          isChecked
                            ? 'bg-brand-50/70 border-brand-200 text-brand-950 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                        } ${promoteRole === 'SUPER_ADMIN' ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={promoteRole === 'SUPER_ADMIN'}
                          onChange={() => {
                            if (promoteRole === 'SUPER_ADMIN') return;
                            setPromotePermissions((prev) =>
                              prev.includes(perm.key) ? prev.filter((k) => k !== perm.key) : [...prev, perm.key]
                            );
                          }}
                          className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-bold leading-tight truncate">{perm.label}</p>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-gray-100 text-gray-500 font-mono">
                              /{perm.key}
                            </span>
                          </div>
                          <p className="text-[9px] text-gray-400 truncate mt-0.5">{perm.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPromoteModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPromote || !foundStudent}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingPromote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Confirm Promotion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE / EDIT ROLE & PERMISSIONS / REVOKE */}
      {editModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-xl w-full my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-600" />
                <h3 className="font-black text-gray-900 text-sm">
                  Manage Permissions: @{selectedStaff.username}
                </h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="p-6 space-y-4 text-xs">
              {/* Member Details */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="font-bold text-gray-900">{selectedStaff.full_name || selectedStaff.username}</p>
                <p className="text-gray-500 text-[11px]">{selectedStaff.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-gray-400 text-[10px]">Current Role:</span>
                  {getRoleBadge(selectedStaff.effective_role)}
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Administrative Role *</label>
                <select
                  value={editRole}
                  onChange={(e) => handleEditRoleChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-xs font-medium"
                >
                  <option value="SUPER_ADMIN">Super Administrator (Unrestricted)</option>
                  <option value="MODERATOR">Content Moderator (Listings, Reports, Deals)</option>
                  <option value="ID_VERIFIER">Student ID Verifier (Verification Drives)</option>
                </select>
              </div>

              {/* Granular Permissions Checklist */}
              <div className="space-y-2.5 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-brand-600" />
                      Allowed Tabs & Sections ({editPermissions.length} / {ALL_PERMISSION_KEYS.length} Granted)
                    </label>
                    <p className="text-[10px] text-gray-500">
                      {editRole === 'SUPER_ADMIN'
                        ? 'Super Admin automatically has full authority over all sections.'
                        : 'Control exactly which tabs and features this staff user can access.'}
                    </p>
                  </div>
                  {editRole !== 'SUPER_ADMIN' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditPermissions([...ALL_PERMISSION_KEYS])}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-700 underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setEditPermissions([...(DEFAULT_ROLE_PERMISSIONS[editRole] || [])])}
                        className="text-[11px] font-bold text-gray-500 hover:text-gray-700 underline cursor-pointer"
                      >
                        Reset Defaults
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {PERMISSION_CATALOG.map((perm) => {
                    const isChecked = editRole === 'SUPER_ADMIN' || editPermissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2 rounded-md border transition-all ${
                          isChecked
                            ? 'bg-brand-50/70 border-brand-200 text-brand-950 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                        } ${editRole === 'SUPER_ADMIN' ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={editRole === 'SUPER_ADMIN'}
                          onChange={() => {
                            if (editRole === 'SUPER_ADMIN') return;
                            setEditPermissions((prev) =>
                              prev.includes(perm.key) ? prev.filter((k) => k !== perm.key) : [...prev, perm.key]
                            );
                          }}
                          className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-bold leading-tight truncate">{perm.label}</p>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-gray-100 text-gray-500 font-mono">
                              /{perm.key}
                            </span>
                          </div>
                          <p className="text-[9px] text-gray-400 truncate mt-0.5">{perm.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Revoke Privileges Section */}
              <div className="pt-3 border-t border-gray-100">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-rose-900 text-xs">Revoke Administrative Privileges</h4>
                    <p className="text-[10px] text-rose-700 mt-0.5">Demote this account back to regular student user.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRevokeStaff}
                    disabled={submittingEdit}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-white border border-rose-300 hover:bg-rose-100 transition-colors shrink-0 cursor-pointer"
                  >
                    Revoke Access
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Save Permissions</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
