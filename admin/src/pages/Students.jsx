import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheck, ShieldAlert, Eye, X,
  Star, ShoppingCart, Store, Search,
  Edit2, Trash2, RefreshCw, Download,
  CheckSquare, Square
} from 'lucide-react';
import { api } from '../config/api';
import { exportToCSV } from '../utils/csvExport';
import ConfirmModal from '../components/common/ConfirmModal';
import Pagination from '../components/common/Pagination';
import ImageLightbox from '../components/common/ImageLightbox';
import StudentInspectModal from './students/StudentInspectModal';
import StudentEditModal from './students/StudentEditModal';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL', 'BUYER', 'SELLER'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'SUSPENDED'
  const [idFilter, setIdFilter] = useState('ALL'); // 'ALL', 'VERIFIED', 'UNVERIFIED'
  const [authFilter] = useState('ALL'); // 'ALL', 'GOOGLE', 'PASSWORD'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals & Drawers
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentLoginLogs, setStudentLoginLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'danger',
    onConfirm: () => {},
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/users/');
      const studentsOnly = response.data.filter((user) => !user.is_staff && !user.is_superuser);
      setStudents(studentsOnly);

      if (selectedStudent) {
        const updated = studentsOnly.find((s) => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const isSeller = student.role === 'SELLER' || student.is_id_verified;
      if (roleFilter === 'SELLER' && !isSeller) return false;
      if (roleFilter === 'BUYER' && isSeller) return false;

      const isActive = student.is_active !== false;
      if (statusFilter === 'ACTIVE' && !isActive) return false;
      if (statusFilter === 'SUSPENDED' && isActive) return false;

      if (idFilter === 'VERIFIED' && !student.is_id_verified) return false;
      if (idFilter === 'UNVERIFIED' && student.is_id_verified) return false;

      if (authFilter === 'GOOGLE' && student.last_login_method !== 'GOOGLE') return false;
      if (authFilter === 'PASSWORD' && student.last_login_method === 'GOOGLE') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (student.full_name || '').toLowerCase();
        const username = (student.username || '').toLowerCase();
        const email = (student.email || '').toLowerCase();
        const phone = (student.phone_number || '').toLowerCase();
        return name.includes(q) || username.includes(q) || email.includes(q) || phone.includes(q);
      }

      return true;
    });
  }, [students, roleFilter, statusFilter, idFilter, authFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, roleFilter, statusFilter, idFilter, authFilter]);

  // Paginated slice
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedStudents.map((s) => s.id)));
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Inspect student details
  const handleInspectStudent = async (student) => {
    setSelectedStudent(student);
    setStudentLoginLogs([]);
    setLoadingLogs(true);
    api.get(`/auth/users/${student.id}/login-history/`)
      .then((res) => setStudentLoginLogs(res.data.logs || []))
      .catch((err) => console.error('Failed to load student login history', err))
      .finally(() => setLoadingLogs(false));

    if (!student.id_card_image && (student.has_id_card || student.is_id_verified)) {
      try {
        const res = await api.get(`/auth/users/${student.id}/`);
        if (res.data) {
          setSelectedStudent(res.data);
          setStudents((prev) => prev.map((s) => (s.id === student.id ? res.data : s)));
        }
      } catch {
        console.error('Failed to load full student ID card', err);
      }
    }
  };

  // Quick Action: Ban / Unban user with ConfirmModal
  const handleToggleBan = (user) => {
    const isCurrentlyActive = user.is_active !== false;
    const actionText = isCurrentlyActive ? 'Ban & Suspend' : 'Unban & Reactivate';

    setConfirmState({
      isOpen: true,
      title: `${actionText} Student`,
      message: `Are you sure you want to ${actionText.toLowerCase()} student "${user.full_name || user.username}"? They will ${
        isCurrentlyActive ? 'immediately lose access to campus trading.' : 'regain full access.'
      }`,
      confirmText: actionText,
      variant: isCurrentlyActive ? 'danger' : 'warning',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await api.patch(`/auth/users/${user.id}/`, {
            is_active: !isCurrentlyActive,
          });
          toast.success(`User ${!isCurrentlyActive ? 'reactivated' : 'suspended'} successfully!`);
          setStudents((prev) => prev.map((s) => (s.id === user.id ? { ...s, is_active: !isCurrentlyActive } : s)));
          if (selectedStudent?.id === user.id) setSelectedStudent(res.data);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch {
          toast.error('Failed to update account status.');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Quick Action: Toggle ID Verification
  const handleToggleIdVerification = async (user) => {
    const newStatus = !user.is_id_verified;
    setActionLoading(true);
    try {
      const payload = {
        is_id_verified: newStatus,
        ...(newStatus ? { role: 'SELLER' } : {}),
      };
      const res = await api.patch(`/auth/users/${user.id}/`, payload);
      toast.success(newStatus ? 'Student ID verified! User granted Seller privileges.' : 'ID verification revoked.');
      setStudents((prev) => prev.map((s) => (s.id === user.id ? res.data : s)));
      if (selectedStudent?.id === user.id) setSelectedStudent(res.data);
    } catch {
      toast.error('Failed to update ID verification status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Role Switch (Buyer <-> Seller)
  const handleToggleRole = async (user) => {
    const isSeller = user.role === 'SELLER' || user.is_id_verified;
    const nextRole = isSeller ? 'BUYER' : 'SELLER';

    setActionLoading(true);
    try {
      const res = await api.patch(`/auth/users/${user.id}/`, { role: nextRole });
      toast.success(`Role updated to ${nextRole}`);
      setStudents((prev) => prev.map((s) => (s.id === user.id ? res.data : s)));
      if (selectedStudent?.id === user.id) setSelectedStudent(res.data);
    } catch {
      toast.error('Failed to update user role.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete User with ConfirmModal
  const handleDeleteUser = (user) => {
    setConfirmState({
      isOpen: true,
      title: 'Permanently Delete Account',
      message: `Are you sure you want to permanently delete student account "${user.full_name || user.username}"? All listings, chats, and records will be purged permanently.`,
      confirmText: 'Delete Account Forever',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/auth/users/${user.id}/`);
          setStudents((prev) => prev.filter((s) => s.id !== user.id));
          if (selectedStudent?.id === user.id) setSelectedStudent(null);
          if (editingStudent?.id === user.id) setEditingStudent(null);
          toast.success('User account deleted permanently.');
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch {
          toast.error('Failed to delete user.');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Edit Handlers
  const handleStartEdit = (student) => {
    setEditingStudent(student);
    setEditFormData({
      full_name: student.full_name || '',
      email: student.email || '',
      phone_number: student.phone_number || '',
      role: student.role || (student.is_id_verified ? 'SELLER' : 'BUYER'),
      trust_score: student.trust_score || 0,
      is_active: student.is_active !== false,
      is_verified_student: Boolean(student.is_verified_student),
      is_id_verified: Boolean(student.is_id_verified),
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.patch(`/auth/users/${editingStudent.id}/`, editFormData);
      toast.success('User details updated successfully!');
      setStudents((prev) => prev.map((s) => (s.id === editingStudent.id ? res.data : s)));
      if (selectedStudent?.id === editingStudent.id) setSelectedStudent(res.data);
      setEditingStudent(null);
    } catch (error) {
      toast.error(error.response?.data?.email?.[0] || 'Failed to update student details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Export Students to CSV
  const handleExportCSV = (onlySelected = false) => {
    const targetList = onlySelected
      ? students.filter((s) => selectedIds.has(s.id))
      : filteredStudents;

    exportToCSV({
      data: targetList,
      headers: [
        'User ID',
        'Full Name',
        'Registration No (@Username)',
        'Campus Email',
        'Phone Number',
        'Role',
        'Trust Score',
        'ID Verified',
        'Account Status',
        'Joined Date'
      ],
      rowMapper: (s) => [
        s.id,
        s.full_name || 'N/A',
        `@${s.username}`,
        s.email,
        s.phone_number || '',
        s.role || 'BUYER',
        s.trust_score || 0,
        s.is_id_verified ? 'VERIFIED' : 'PENDING',
        s.is_active !== false ? 'ACTIVE' : 'SUSPENDED',
        new Date(s.date_joined).toLocaleDateString()
      ],
      filename: `campusxchange_students_${new Date().toISOString().split('T')[0]}.csv`
    });
  };

  // Bulk Actions
  const handleBulkVerify = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) => api.patch(`/auth/users/${id}/`, { is_id_verified: true, role: 'SELLER' }))
      );
      toast.success(`Verified ${ids.length} student physical IDs!`);
      fetchStudents();
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to complete bulk verification.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkBan = async () => {
    if (selectedIds.size === 0) return;
    setConfirmState({
      isOpen: true,
      title: 'Bulk Suspend Students',
      message: `Are you sure you want to suspend all ${selectedIds.size} selected students?`,
      confirmText: 'Suspend Selected',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const ids = Array.from(selectedIds);
          await Promise.all(
            ids.map((id) => api.patch(`/auth/users/${id}/`, { is_active: false }))
          );
          toast.success(`Suspended ${ids.length} student accounts.`);
          fetchStudents();
          setSelectedIds(new Set());
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        } catch {
          toast.error('Bulk suspend operation failed.');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        loading={actionLoading}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Student Inspector Modal */}
      {selectedStudent && (
        <StudentInspectModal
          student={selectedStudent}
          studentLoginLogs={studentLoginLogs}
          loadingLogs={loadingLogs}
          actionLoading={actionLoading}
          onClose={() => setSelectedStudent(null)}
          onOpenLightbox={(img) => setLightboxImage(img)}
          onToggleIdVerification={handleToggleIdVerification}
          onToggleBan={handleToggleBan}
        />
      )}

      {/* Student Edit Modal */}
      {editingStudent && (
        <StudentEditModal
          student={editingStudent}
          formData={editFormData}
          setFormData={setEditFormData}
          actionLoading={actionLoading}
          onClose={() => setEditingStudent(null)}
          onSubmit={handleSaveEdit}
        />
      )}

      {/* Main Table Card */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-200/80 shadow-md overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/70">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Registered Students</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                {students.length} Total
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Full administrative authority over student ID verification, physical cards, roles, and trust scores.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => handleExportCSV(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 shadow-xs cursor-pointer"
              title="Export all filtered students to CSV"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              Export CSV
            </button>

            <button
              onClick={fetchStudents}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search & Multi-Filter Suite */}
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Reg No (@username), Email, or Phone..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Role Filter */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  roleFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                All Roles
              </button>
              <button
                onClick={() => setRoleFilter('BUYER')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                  roleFilter === 'BUYER' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <ShoppingCart className="w-3 h-3 text-blue-600" /> Buyers
              </button>
              <button
                onClick={() => setRoleFilter('SELLER')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                  roleFilter === 'SELLER' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Store className="w-3 h-3 text-purple-600" /> Sellers
              </button>
            </div>

            {/* ID Verification Filter */}
            <select
              value={idFilter}
              onChange={(e) => setIdFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All ID Statuses</option>
              <option value="VERIFIED">Physical ID Verified</option>
              <option value="UNVERIFIED">Pending ID Verification</option>
            </select>

            {/* Account Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Students</option>
              <option value="SUSPENDED">Suspended / Banned</option>
            </select>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="px-6 py-2.5 bg-brand-50 border-b border-brand-200 flex items-center justify-between gap-4 text-xs">
            <span className="font-bold text-brand-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[11px]">
                {selectedIds.size}
              </span>
              Students Selected
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkVerify}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Verify Selected IDs
              </button>
              <button
                onClick={handleBulkBan}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Suspend Selected
              </button>
              <button
                onClick={() => handleExportCSV(true)}
                className="px-3 py-1 bg-white border border-gray-300 text-gray-700 font-bold rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Export Selected CSV
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-gray-500 hover:text-gray-700 ml-2 font-semibold"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100/60 text-gray-500 uppercase tracking-wider text-[10px] font-black border-b border-gray-200">
                <th className="py-3 px-4 w-10 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {selectedIds.size > 0 && selectedIds.size === paginatedStudents.length ? (
                      <CheckSquare className="w-4 h-4 text-brand-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">ID Verification</th>
                <th className="py-3 px-4">Trust Score</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="8" className="py-4 px-6">
                      <div className="h-4 bg-gray-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">
                    No students found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const isSelected = selectedIds.has(student.id);
                  const isSeller = student.role === 'SELLER' || student.is_id_verified;
                  const isActive = student.is_active !== false;

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isSelected ? 'bg-brand-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleSelect(student.id)}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Student Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center shrink-0">
                            {student.full_name ? student.full_name.charAt(0) : student.username.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-snug">
                              {student.full_name || 'Unnamed Student'}
                            </p>
                            <span className="font-mono text-[11px] text-brand-600 font-bold block">
                              @{student.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleRole(student)}
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border cursor-pointer ${
                            isSeller
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          }`}
                          title="Click to toggle role"
                        >
                          {isSeller ? 'Seller' : 'Buyer'}
                        </button>
                      </td>

                      {/* ID Verification */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleIdVerification(student)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                            student.is_id_verified
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : student.has_id_card
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                          }`}
                          title="Click to toggle verification status"
                        >
                          {student.is_id_verified ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                            </>
                          ) : student.has_id_card ? (
                            <>
                              <ShieldAlert className="w-3 h-3 text-amber-600" /> Pending Review
                            </>
                          ) : (
                            'Unverified'
                          )}
                        </button>
                      </td>

                      {/* Trust Score */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-black text-gray-900">{student.trust_score || 0}</span>
                          <span className="text-[10px] text-gray-400">/100</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-[11px] text-gray-600">
                          <p className="truncate max-w-[160px]" title={student.email}>
                            {student.email}
                          </p>
                          {student.phone_number && (
                            <p className="font-mono text-gray-500">{student.phone_number}</p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleBan(student)}
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                          title="Click to toggle account status"
                        >
                          {isActive ? 'Active' : 'Suspended'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInspectStudent(student)}
                            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors cursor-pointer"
                            title="Inspect ID Card & Login Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStartEdit(student)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Student Info"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(student)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete User Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Universal Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredStudents.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
