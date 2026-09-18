import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ShieldCheck, ShieldAlert, Mail, Calendar, Eye, X, Phone,
  Star, ShoppingCart, Store, Search, Ban, CheckCircle2,
  Edit2, Trash2, Maximize2, Loader2, RefreshCw, AlertTriangle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Clean OCR metadata formatters
const formatOcrKey = (key) => {
  const map = {
    batch: 'Batch / Year',
    care_of: 'Care Of / Guardian',
    careof: 'Care Of / Guardian',
    roll_no: 'Roll Number',
    rollno: 'Roll Number',
    reg_no: 'Registration No',
    regno: 'Registration No',
    program: 'Program / Degree',
    valid_upto: 'Valid Upto',
    validupto: 'Valid Upto',
    father_name: "Father's Name",
    name: 'Name on ID',
    blood_group: 'Blood Group',
    dob: 'Date of Birth',
    address: 'Address'
  };
  const clean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (map[clean]) return map[clean];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
};

const formatOcrValue = (val) => {
  if (
    val === null ||
    val === undefined ||
    val === '' ||
    String(val).trim().toLowerCase() === 'null' ||
    String(val).trim().toLowerCase() === 'none'
  ) {
    return <span className="text-gray-400 font-mono text-[11px] italic">Not detected</span>;
  }
  return <span className="font-bold text-gray-800 font-mono">{String(val)}</span>;
};

const getOcrEntries = (data) => {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).filter(([k]) => !k.startsWith('_'));
};

const hasValidOcrFields = (entries) => {
  return entries.some(([, val]) => {
    if (val === null || val === undefined) return false;
    const s = String(val).trim().toLowerCase();
    return s !== '' && s !== 'null' && s !== 'none' && s !== 'undefined';
  });
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL', 'BUYER', 'SELLER'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'SUSPENDED'
  const [idFilter, setIdFilter] = useState('ALL'); // 'ALL', 'VERIFIED', 'UNVERIFIED'

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/auth/users/`);
      const studentsOnly = response.data.filter(user => !user.is_staff && !user.is_superuser);
      setStudents(studentsOnly);
      
      // If modal was open, refresh selected student
      if (selectedStudent) {
        const updated = studentsOnly.find(s => s.id === selectedStudent.id);
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
    fetchStudents();
  }, []);

  // Keyboard shortcut: close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxImage) setLightboxImage(null);
        else if (selectedStudent) setSelectedStudent(null);
        else if (editingStudent) setEditingStudent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, selectedStudent, editingStudent]);

  // Quick action: Ban / Unban user
  const handleToggleBan = async (user) => {
    const isCurrentlyActive = user.is_active !== false;
    const actionText = isCurrentlyActive ? 'Ban & Suspend' : 'Unban & Reactivate';
    
    if (!window.confirm(`Are you sure you want to ${actionText} student "${user.full_name || user.username}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await axios.patch(`${API_BASE}/auth/users/${user.id}/`, {
        is_active: !isCurrentlyActive
      });
      toast.success(`User ${!isCurrentlyActive ? 'reactivated' : 'suspended'} successfully!`);
      
      setStudents(prev => prev.map(s => s.id === user.id ? { ...s, is_active: !isCurrentlyActive } : s));
      if (selectedStudent && selectedStudent.id === user.id) {
        setSelectedStudent(res.data);
      }
    } catch (error) {
      console.error('Failed to toggle ban', error);
      toast.error('Failed to update account status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick action: Toggle ID verification status
  const handleToggleIdVerification = async (user) => {
    const newStatus = !user.is_id_verified;
    setActionLoading(true);
    try {
      const payload = {
        is_id_verified: newStatus,
        // If verifying ID, automatically ensure role is SELLER if requested
        ...(newStatus ? { role: 'SELLER' } : {})
      };

      const res = await axios.patch(`${API_BASE}/auth/users/${user.id}/`, payload);
      toast.success(newStatus ? 'Student ID verified! User granted Seller privileges.' : 'ID verification revoked.');
      
      setStudents(prev => prev.map(s => s.id === user.id ? res.data : s));
      if (selectedStudent && selectedStudent.id === user.id) {
        setSelectedStudent(res.data);
      }
    } catch (error) {
      console.error('Failed to update verification', error);
      toast.error('Failed to update ID verification status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick action: Switch Role (Buyer <-> Seller)
  const handleToggleRole = async (user) => {
    const isSeller = user.role === 'SELLER' || user.is_id_verified;
    const nextRole = isSeller ? 'BUYER' : 'SELLER';

    setActionLoading(true);
    try {
      const res = await axios.patch(`${API_BASE}/auth/users/${user.id}/`, {
        role: nextRole
      });
      toast.success(`Role updated to ${nextRole}`);
      
      setStudents(prev => prev.map(s => s.id === user.id ? res.data : s));
      if (selectedStudent && selectedStudent.id === user.id) {
        setSelectedStudent(res.data);
      }
    } catch (error) {
      console.error('Failed to switch role', error);
      toast.error('Failed to update user role.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to permanently delete this user account? All their listings, bids, and profile data will be permanently erased.")) {
      setActionLoading(true);
      try {
        await axios.delete(`${API_BASE}/auth/users/${userId}/`);
        setStudents(prev => prev.filter(s => s.id !== userId));
        if (selectedStudent && selectedStudent.id === userId) {
          setSelectedStudent(null);
        }
        if (editingStudent && editingStudent.id === userId) {
          setEditingStudent(null);
        }
        toast.success("User account deleted permanently.");
      } catch (error) {
        console.error("Failed to delete user", error);
        toast.error("Failed to delete user.");
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Open Edit Modal
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
      is_id_verified: Boolean(student.is_id_verified)
    });
  };

  // Submit Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await axios.patch(`${API_BASE}/auth/users/${editingStudent.id}/`, editFormData);
      toast.success("User details updated successfully!");
      
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? res.data : s));
      if (selectedStudent && selectedStudent.id === editingStudent.id) {
        setSelectedStudent(res.data);
      }
      setEditingStudent(null);
    } catch (error) {
      console.error("Failed to update user", error);
      toast.error(error.response?.data?.email?.[0] || error.response?.data?.phone_number?.[0] || "Failed to update student details.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInspectStudent = async (student) => {
    setSelectedStudent(student);
    if (!student.id_card_image && (student.has_id_card || student.is_id_verified)) {
      try {
        const res = await axios.get(`${API_BASE}/auth/users/${student.id}/`);
        if (res.data) {
          setSelectedStudent(res.data);
          setStudents(prev => prev.map(s => s.id === student.id ? res.data : s));
        }
      } catch (err) {
        console.error("Failed to load full student ID card", err);
      }
    }
  };

  // Filtered List
  const filteredStudents = students.filter(student => {
    // Role filter
    const isSeller = student.role === 'SELLER' || student.is_id_verified;
    if (roleFilter === 'SELLER' && !isSeller) return false;
    if (roleFilter === 'BUYER' && isSeller) return false;

    // Status filter
    const isActive = student.is_active !== false;
    if (statusFilter === 'ACTIVE' && !isActive) return false;
    if (statusFilter === 'SUSPENDED' && isActive) return false;

    // ID verification filter
    if (idFilter === 'VERIFIED' && !student.is_id_verified) return false;
    if (idFilter === 'UNVERIFIED' && student.is_id_verified) return false;

    // Search query
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

  return (
    <>
      <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md overflow-hidden relative">
        {/* Header with Title & Stats */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/70">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Registered Students</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                {students.length} Total
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Full control over student verification, physical ID cards, roles, trust scores, and bans.
            </p>
          </div>

          <button
            onClick={fetchStudents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm cursor-pointer self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Search Bar & Multi-Filter Controls */}
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Reg No (@username), Email, or Phone..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50/50"
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

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Role Filter */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  roleFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                All Roles
              </button>
              <button
                onClick={() => setRoleFilter('BUYER')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                  roleFilter === 'BUYER' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <ShoppingCart className="w-3 h-3 text-blue-600" /> Buyers
              </button>
              <button
                onClick={() => setRoleFilter('SELLER')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                  roleFilter === 'SELLER' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Store className="w-3 h-3 text-purple-600" /> Sellers
              </button>
            </div>

            {/* ID Verification Filter */}
            <select
              value={idFilter}
              onChange={(e) => setIdFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All ID Statuses</option>
              <option value="VERIFIED">Physical ID Verified</option>
              <option value="UNVERIFIED">Pending / No ID</option>
            </select>

            {/* Account Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Accounts</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended / Banned</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  ID Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Account Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Trust Score
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">
                  Admin Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="space-y-1.5">
                          <div className="h-4 w-32 bg-gray-200 rounded"></div>
                          <div className="h-3 w-20 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-36 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-5 w-16 bg-gray-200 rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-gray-200 rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="h-5 w-16 bg-gray-200 rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-7 w-28 bg-gray-200 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-gray-400" />
                      <p className="font-semibold text-gray-700">No students found matching your criteria.</p>
                      <button
                        onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); setStatusFilter('ALL'); setIdFilter('ALL'); }}
                        className="text-xs font-bold text-brand-600 hover:underline"
                      >
                        Reset all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isSeller = student.role === 'SELLER' || student.is_id_verified;
                  const isActive = student.is_active !== false;

                  return (
                    <tr key={student.id} className={`hover:bg-gray-50/80 transition-colors ${!isActive ? 'bg-red-50/30' : ''}`}>
                      {/* Student Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="relative">
                            {student.profile_photo ? (
                              <img
                                src={student.profile_photo}
                                alt=""
                                className="h-10 w-10 rounded-full object-cover border border-gray-200 shadow-sm"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-black text-sm">
                                {student.full_name ? student.full_name[0].toUpperCase() : student.username[0].toUpperCase()}
                              </div>
                            )}
                            {/* Verified Badge Icon */}
                            {student.is_id_verified && (
                              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 text-white ring-2 ring-white">
                                <ShieldCheck className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                          <div className="ml-3.5">
                            <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                              {student.full_name || student.username}
                              {!isActive && (
                                <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-black rounded">
                                  BANNED
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              @{student.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-700 font-medium flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{student.email}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-1 font-mono">
                          <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span>{student.phone_number || 'No phone'}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isSeller ? (
                          <span className="px-2.5 py-0.5 inline-flex text-xs font-black rounded-full bg-purple-100 text-purple-800 border border-purple-200 items-center gap-1">
                            <Store className="w-3 h-3 text-purple-600" /> Seller
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 inline-flex text-xs font-black rounded-full bg-blue-100 text-blue-800 border border-blue-200 items-center gap-1">
                            <ShoppingCart className="w-3 h-3 text-blue-600" /> Buyer
                          </span>
                        )}
                      </td>

                      {/* Physical ID Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.is_id_verified ? (
                          <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-200 gap-1 items-center">
                            <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> Verified ID
                          </span>
                        ) : (student.id_card_image || student.has_id_card) ? (
                          <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 gap-1 items-center">
                            <Eye className="h-3.5 w-3.5 text-amber-600" /> Needs Review
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            Not Uploaded
                          </span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200 items-center gap-1">
                            <Ban className="w-3 h-3" /> Suspended
                          </span>
                        )}
                      </td>

                      {/* Trust Score */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-black text-gray-900">{student.trust_score}</span>
                          <span className="text-[10px] text-gray-400">/ 100</span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInspectStudent(student)}
                            title="Inspect Profile & ID Card"
                            className="p-1.5 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg border border-gray-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleStartEdit(student)}
                            title="Edit Student Info"
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleBan(student)}
                            title={isActive ? "Ban / Suspend Account" : "Reactivate Account"}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isActive
                                ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50 border-gray-200'
                                : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {isActive ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(student.id)}
                            title="Permanently Delete"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 transition-colors"
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
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: STUDENT PROFILE & PHYSICAL ID CARD INSPECTION MODAL */}
      {/* ========================================================================= */}
      {selectedStudent && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-ink-950/75 backdrop-blur-sm animate-fade-in">
          {/* Backdrop Click Dismiss */}
          <div className="fixed inset-0 -z-10" onClick={() => setSelectedStudent(null)} />

          {/* Modal Container */}
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header - Pinned Top */}
            <div className="shrink-0 px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-11 w-11 shrink-0 bg-gradient-to-tr from-brand-600 to-brand-500 text-white rounded-full flex items-center justify-center font-black text-base shadow-sm ring-2 ring-brand-100">
                  {selectedStudent.full_name ? selectedStudent.full_name[0].toUpperCase() : selectedStudent.username[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-gray-900 leading-tight truncate">
                    {selectedStudent.full_name || selectedStudent.username}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    Registration No:
                    <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">
                      @{selectedStudent.username}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100 transition-colors"
                title="Close dialog (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
              {/* Account Quick Status Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-md border border-gray-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Role</span>
                  <span className="text-xs font-black text-gray-900 mt-1 flex items-center gap-1.5">
                    {selectedStudent.role === 'SELLER' ? (
                      <Store className="w-3.5 h-3.5 text-purple-600" />
                    ) : (
                      <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    {selectedStudent.role || 'BUYER'}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-md border border-gray-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ID Verification</span>
                  <span className={`text-xs font-black mt-1 flex items-center gap-1.5 ${selectedStudent.is_id_verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedStudent.is_id_verified ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Verified ID
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Unverified
                      </>
                    )}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-md border border-gray-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Trust Score</span>
                  <span className="text-xs font-black text-brand-600 mt-1 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-gray-900">{selectedStudent.trust_score}</span>
                    <span className="text-gray-400 font-normal">/ 100</span>
                  </span>
                </div>

                <div className="p-3 bg-white rounded-md border border-gray-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Account Status</span>
                  <span className={`text-xs font-black mt-1 flex items-center gap-1.5 ${selectedStudent.is_active !== false ? 'text-emerald-700' : 'text-red-700'}`}>
                    <span className={`w-2 h-2 rounded-full ${selectedStudent.is_active !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {selectedStudent.is_active !== false ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>

              {/* Student Identification & Face Verification Section */}
              <div className="border border-gray-200 rounded-lg p-5 bg-gradient-to-br from-white to-gray-50/70">
                <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-gray-200">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    Identity & ID Card Verification
                  </h4>
                  <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
                    Physical ID Card vs Face Liveness Selfie
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Physical Student ID Card */}
                  <div className="flex flex-col">
                    <div className="text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                        Physical Student ID Card:
                      </span>
                      {selectedStudent.id_card_image && (
                        <button
                          onClick={() => setLightboxImage(selectedStudent.id_card_image)}
                          className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
                        >
                          <Maximize2 className="w-3 h-3" /> Full View
                        </button>
                      )}
                    </div>

                    {selectedStudent.id_card_image ? (
                      <div
                        onClick={() => setLightboxImage(selectedStudent.id_card_image)}
                        className="relative group rounded-md overflow-hidden border border-gray-200 bg-slate-900/5 h-64 sm:h-72 flex items-center justify-center p-2 shadow-inner cursor-zoom-in"
                      >
                        <img
                          src={selectedStudent.id_card_image}
                          alt="Physical Student ID"
                          className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="absolute top-2.5 right-2.5">
                          <span className="px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[11px] font-bold rounded-md backdrop-blur-md flex items-center gap-1.5 shadow-md transition-all pointer-events-none">
                            <Maximize2 className="w-3 h-3" /> Full View
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border-2 border-dashed border-gray-200 p-8 text-center bg-gray-50 h-64 sm:h-72 flex flex-col items-center justify-center text-gray-400">
                        <ShieldAlert className="w-10 h-10 mb-2.5 text-gray-300" />
                        <p className="text-xs font-bold text-gray-600">No Student ID Card Uploaded</p>
                        <p className="text-[11px] text-gray-400 mt-1 max-w-[220px]">
                          Student registered as a Buyer without physical ID verification.
                        </p>
                      </div>
                    )}

                    {/* Extracted OCR Data */}
                    {selectedStudent.id_card_data && (() => {
                      const entries = getOcrEntries(selectedStudent.id_card_data);
                      if (entries.length === 0) return null;
                      if (!hasValidOcrFields(entries)) {
                        return (
                          <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-md text-xs">
                            <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>OCR Auto-Scan: No Clear Fields Detected</span>
                            </div>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                              Automated text extraction could not parse clear text fields from this card. Please inspect the card image manually above.
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-3 p-3.5 bg-white border border-gray-200 rounded-md text-xs space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 mb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              Extracted ID OCR Metadata
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Auto-Extracted
                            </span>
                          </div>
                          {entries.map(([k, v]) => (
                            <div key={k} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                              <span className="text-gray-500 font-medium">{formatOcrKey(k)}:</span>
                              <div>{formatOcrValue(v)}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right: Liveness Face Selfie */}
                  <div className="flex flex-col">
                    <div className="text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-brand-600" />
                        Face Liveness Selfie Photo:
                      </span>
                      {selectedStudent.profile_photo && (
                        <button
                          onClick={() => setLightboxImage(selectedStudent.profile_photo)}
                          className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
                        >
                          <Maximize2 className="w-3 h-3" /> Full View
                        </button>
                      )}
                    </div>

                    {selectedStudent.profile_photo ? (
                      <div
                        onClick={() => setLightboxImage(selectedStudent.profile_photo)}
                        className="relative group rounded-md overflow-hidden border border-gray-200 bg-slate-900/5 h-64 sm:h-72 flex items-center justify-center p-2 shadow-inner cursor-zoom-in"
                      >
                        <img
                          src={selectedStudent.profile_photo}
                          alt="Face Selfie"
                          className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="absolute top-2.5 right-2.5">
                          <span className="px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[11px] font-bold rounded-md backdrop-blur-md flex items-center gap-1.5 shadow-md transition-all pointer-events-none">
                            <Maximize2 className="w-3 h-3" /> Full View
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border-2 border-dashed border-gray-200 p-8 text-center bg-gray-50 h-64 sm:h-72 flex flex-col items-center justify-center text-gray-400">
                        <Eye className="w-10 h-10 mb-2.5 text-gray-300" />
                        <p className="text-xs font-bold text-gray-600">No Live Selfie Uploaded</p>
                        <p className="text-[11px] text-gray-400 mt-1">Student has not taken a face verification selfie.</p>
                      </div>
                    )}

                    {/* Verification Guidance Box */}
                    <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-md text-xs text-blue-950">
                      <div className="flex items-center gap-2 font-bold text-blue-900 mb-1">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Administrative Verification Checklist</span>
                      </div>
                      <p className="text-[11px] text-blue-800 leading-relaxed">
                        Verify that the face in the selfie photo matches the ID card photo, and confirm that the student name and registration number match their campus account records.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Profile Information Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-200 pt-4">
                <div className="p-3 bg-gray-50/80 rounded-md border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Full Name</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{selectedStudent.full_name || 'Not provided'}</p>
                </div>
                <div className="p-3 bg-gray-50/80 rounded-md border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Official Email</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{selectedStudent.email}</span>
                  </p>
                </div>
                <div className="p-3 bg-gray-50/80 rounded-md border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Phone Number</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5 flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{selectedStudent.phone_number || 'Not provided'}</span>
                  </p>
                </div>
                <div className="p-3 bg-gray-50/80 rounded-md border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">College Domain</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{selectedStudent.college_domain || 'General'}</p>
                </div>
                <div className="p-3 bg-gray-50/80 rounded-md border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Joined Date</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{new Date(selectedStudent.date_joined).toLocaleDateString()}</span>
                  </p>
                </div>
                <div className="p-3 bg-gray-50/80 rounded-md border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Completed Trades</span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">
                    {selectedStudent.completed_trades_count || 0} Peer Deals
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer - Pinned Toolbar */}
            <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50/90 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Toggle ID Verification */}
                <button
                  onClick={() => handleToggleIdVerification(selectedStudent)}
                  disabled={actionLoading}
                  className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    selectedStudent.is_id_verified
                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {selectedStudent.is_id_verified ? 'Revoke ID Verification' : 'Approve Student ID'}
                </button>

                {/* Toggle Role */}
                <button
                  onClick={() => handleToggleRole(selectedStudent)}
                  disabled={actionLoading}
                  className="px-3.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Store className="w-4 h-4" />
                  {selectedStudent.role === 'SELLER' || selectedStudent.is_id_verified
                    ? 'Demote to Buyer'
                    : 'Promote to Seller'}
                </button>

                {/* Toggle Ban */}
                <button
                  onClick={() => handleToggleBan(selectedStudent)}
                  disabled={actionLoading}
                  className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all border ${
                    selectedStudent.is_active !== false
                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  {selectedStudent.is_active !== false ? 'Ban Account' : 'Reactivate'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const studentToEdit = selectedStudent;
                    setSelectedStudent(null);
                    handleStartEdit(studentToEdit);
                  }}
                  className="px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Details
                </button>

                <button
                  onClick={() => handleDeleteUser(selectedStudent.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT STUDENT DETAILS FORM */}
      {/* ========================================================================= */}
      {editingStudent && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="fixed inset-0 -z-10" onClick={() => setEditingStudent(null)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-base font-black text-gray-900">Edit Student Information</h3>
                <p className="text-xs text-gray-500 font-mono">@{editingStudent.username}</p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editFormData.phone_number}
                    onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="10-digit mobile"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Account Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="BUYER">BUYER</option>
                    <option value="SELLER">SELLER</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Trust Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editFormData.trust_score}
                    onChange={(e) => setEditFormData({ ...editFormData, trust_score: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span className="font-bold text-gray-800">Account Active (Uncheck to Ban / Suspend)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.is_id_verified}
                    onChange={(e) => setEditFormData({ ...editFormData, is_id_verified: e.target.checked })}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span className="font-semibold text-gray-700">Physical ID Card Verified</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.is_verified_student}
                    onChange={(e) => setEditFormData({ ...editFormData, is_verified_student: e.target.checked })}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span className="font-semibold text-gray-700">Student Email Verified</span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LIGHTBOX FOR FULL-RESOLUTION IMAGE ZOOM */}
      {/* ========================================================================= */}
      {lightboxImage && createPortal(
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 sm:p-6 backdrop-blur-md cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Expanded Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/20"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white p-2.5 rounded-full transition-colors shadow-lg border border-white/20"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
