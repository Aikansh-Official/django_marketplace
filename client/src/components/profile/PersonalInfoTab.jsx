import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  Star,
  Edit2,
  Save,
  X,
  School,
  Calendar,
  CheckCircle2,
  Lock,
  Sparkles,
  Building2,
  BadgeCheck,
  Check,
  Camera
} from 'lucide-react';
import UpdateSelfieModal from './UpdateSelfieModal';

export default function PersonalInfoTab({ profile, onProfileUpdated, onUpgradeClick, onOpenSelfieModal }) {
  const isSeller = profile?.role === 'SELLER' || profile?.is_id_verified;
  const [isEditing, setIsEditing] = useState(false);
  const [internalSelfieModalOpen, setInternalSelfieModalOpen] = useState(false);
  const handleOpenSelfie = onOpenSelfieModal || (() => setInternalSelfieModalOpen(true));
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || profile?.first_name || '',
    phone_number: profile?.phone_number || ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/profile/', formData);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMsg =
        err.response?.data?.phone_number?.[0] ||
        'Failed to update profile. Please verify your phone number.';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || profile?.first_name || '',
      phone_number: profile?.phone_number || ''
    });
    setIsEditing(false);
  };

  const fullName = profile?.full_name || profile?.first_name || profile?.username;
  const firstLetter = (fullName || 'U')[0].toUpperCase();

  const hasEmail = Boolean(profile?.email && profile?.email.trim());
  const hasIdVerified = Boolean(profile?.is_id_verified);
  const tradesCount = Number(profile?.completed_trades_count || 0);
  const trustScore = profile?.trust_score !== undefined
    ? profile.trust_score
    : (hasEmail ? 5 : 0) + (hasIdVerified ? 5 : 0) + (tradesCount * 5);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Active Student';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Active Student';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cover Banner & Clean Profile Header */}
      <div className="bg-white rounded-md border border-gray-200/90 shadow-sm overflow-hidden">
        {/* Cover Gradient with generous height */}
        <div className="h-36 sm:h-44 bg-gradient-to-r from-brand-500 via-brand-600 to-orange-500 w-full relative">
          <div className="absolute inset-0 bg-black/5"></div>
        </div>

        {/* Profile Identity Bar */}
        <div className="px-4 sm:px-8 pb-5 sm:pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
            {/* Avatar & Name Row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3.5 sm:gap-6">
              {/* Large Avatar with Single Clean Selfie Update Badge */}
              <div className="relative group -mt-12 sm:-mt-18 w-24 h-24 sm:w-32 sm:h-32 rounded-md bg-white p-1.5 sm:p-2 shadow-xl ring-4 ring-white flex-shrink-0 z-10">
                <div
                  onClick={handleOpenSelfie}
                  title="Click to update profile photo"
                  className="w-full h-full rounded-md overflow-hidden relative cursor-pointer"
                >
                  {profile?.profile_photo ? (
                    <img
                      src={profile.profile_photo}
                      alt={fullName}
                      className="w-full h-full object-cover rounded-md shadow-inner transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full rounded-md bg-gradient-to-tr from-brand-500 to-brand-400 text-white flex items-center justify-center text-3xl sm:text-5xl font-black shadow-inner">
                      {firstLetter}
                    </div>
                  )}
                </div>

                {/* Floating camera badge button - single clean trigger */}
                <button
                  type="button"
                  onClick={handleOpenSelfie}
                  title="Update profile photo"
                  aria-label="Update profile photo"
                  className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center shadow-lg border-2 border-white cursor-pointer transition-transform hover:scale-110 z-20"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Name, Badges & Reg No - Generous top spacing from banner */}
              <div className="pt-2 sm:pt-5 pb-1 sm:pb-2 min-w-0 space-y-1 sm:space-y-1.5">
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {fullName}
                  </h1>
                  {profile?.is_id_verified && (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-xs">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      ID Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-500 flex-wrap">
                  <span>
                    Registration No: <strong className="text-gray-900">@{profile?.username}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button: Edit or Save */}
            <div className="pb-1 sm:pb-2 self-start sm:self-end flex-shrink-0">
              {!isEditing ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-2.5 px-4 sm:px-5 rounded-md transition-all text-xs shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-md transition-colors text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-5 rounded-md transition-all text-xs shadow-md hover:shadow-lg cursor-pointer"
                  >
                    {saving ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Details on Left & Trust/Status on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Personal Information Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-md border border-gray-200/90 p-4 sm:p-6 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              Personal Details
            </h3>
            {isEditing && (
              <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                Edit Mode Active
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Anshuman Sharma"
                  className="w-full bg-white border border-gray-300 rounded-md px-3.5 py-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all shadow-xs font-medium"
                />
              ) : (
                <div className="text-xs font-semibold text-gray-900 bg-gray-50 border border-gray-200/80 rounded-md px-3.5 py-2.5">
                  {profile?.full_name || profile?.first_name || <span className="text-gray-400">Not specified</span>}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                Phone Number (WhatsApp & Trade Calls)
              </label>
              {isEditing ? (
                <div className="relative">
                  <div className="absolute left-3.5 top-2.5 flex items-center gap-1 text-gray-400 text-xs font-bold pointer-events-none">
                    <Phone className="w-3.5 h-3.5" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="w-full bg-white border border-gray-300 rounded-md pl-16 pr-3.5 py-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-900 bg-gray-50 border border-gray-200/80 rounded-md px-3.5 py-2.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>{profile?.phone_number || <span className="text-gray-400">No phone added</span>}</span>
                  {profile?.phone_number && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded-md ml-auto">
                      Direct WhatsApp Ready
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-gray-600 uppercase">
                  Email Address
                </label>
                <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-gray-400" /> Verified Account Email
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-gray-900 bg-gray-50 border border-gray-200/80 rounded-md px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 truncate">
                  <Mail className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <span className="truncate">{profile?.email}</span>
                </div>
                {(profile?.is_verified_student ?? Boolean(profile?.email)) && (
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2"
                    title="Verified Email"
                  />
                )}
              </div>
            </div>

            {/* Registration Number */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                Registration Number / Username
              </label>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-900 bg-gray-50 border border-gray-200/80 rounded-md px-3.5 py-2.5">
                <School className="w-4 h-4 text-gray-500" />
                <span>{profile?.username}</span>
                <span className="text-[10px] text-gray-400 font-normal ml-auto">8-digit student UID</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Status, Trust, & Perks (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Campus Trust Score Breakdown */}
          <div className="bg-white rounded-md border border-gray-200/90 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                  Campus Trust Score
                </h4>
              </div>
              <span className="text-base font-black text-brand-600">
                {trustScore}/100
              </span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 via-orange-500 to-brand-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, trustScore))}%` }}
              />
            </div>

            <div className="space-y-2 pt-1 text-[11px]">
              {/* Item 1: Email Authenticated */}
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-600 flex items-center gap-1.5 font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasEmail ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                  Email Authenticated
                </span>
                {hasEmail ? (
                  <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    +5 Points
                  </span>
                ) : (
                  <span className="font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                    0/5 Points
                  </span>
                )}
              </div>

              {/* Item 2: Student ID Card Upload or Buyer Status */}
              {isSeller ? (
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-600 flex items-center gap-1.5 font-medium">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasIdVerified ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                    Student ID Card Upload
                  </span>
                  {hasIdVerified ? (
                    <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      +5 Points
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                      0/5 Points
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-600 flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Student Buyer Status
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Active Student Buyer
                  </span>
                </div>
              )}

              {/* Item 3: Successful Peer Trades */}
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 flex items-center gap-1.5 font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full ${tradesCount > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                  Successful Peer Trades {tradesCount > 0 && <span className="text-gray-400 font-normal">({tradesCount})</span>}
                </span>
                {tradesCount > 0 ? (
                  <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    +{tradesCount * 5} Points
                  </span>
                ) : (
                  <span className="font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                    0/5 Points
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Member Join Date */}
          <div className="bg-white rounded-md border border-gray-200/90 p-4 shadow-sm flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-2 font-medium">
              <Calendar className="w-4 h-4 text-gray-400" />
              Member Since
            </span>
            <span className="font-bold text-gray-900">{formatDate(profile?.date_joined)}</span>
          </div>
        </div>
      </div>

      {/* Update Selfie Modal Fallback */}
      {!onOpenSelfieModal && (
        <UpdateSelfieModal
          isOpen={internalSelfieModalOpen}
          onClose={() => setInternalSelfieModalOpen(false)}
          profile={profile}
          onProfileUpdated={onProfileUpdated}
        />
      )}
    </div>
  );
}
