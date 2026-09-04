import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
import toast from 'react-hot-toast';
import { User, Mail, Phone, ShieldCheck, Star, Edit2, Save, X, School } from 'lucide-react';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: ''
  });

  const fetchProfile = async () => {
    const token = localStorage.getItem('access');
    try {
      const res = await axios.get(`${API_BASE}/auth/profile/`);
      setProfile(res.data);
      setFormData({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        phone_number: res.data.phone_number || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    try {
            await axios.patch(`${API_BASE}/auth/profile/`, formData);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Cover Area */}
        <div className="h-32 bg-gradient-to-r from-brand-500 to-brand-600 w-full relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
              <div className="w-full h-full bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-3xl font-bold">
                {(profile.first_name || profile.username)[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="pt-16 pb-8 px-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1">@{profile.username}</p>
            </div>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md transition-colors text-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Form & Info Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Editable Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Personal Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">First Name</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{profile.first_name || 'Not set'}</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Last Name</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{profile.last_name || 'Not set'}</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone Number</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {profile.phone_number || 'Not set'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address (Read-only)</label>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {profile.email}
                </div>
              </div>
            </div>

            {/* Right Column: Reputation & Status */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Student Status</h3>
              
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Verified Student</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Verified via <strong>{profile.college_domain || 'university domain'}</strong> email address. This badge increases trust across the marketplace.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    <h4 className="text-sm font-bold text-gray-900">Trust Score</h4>
                  </div>
                  <span className="text-sm font-extrabold text-brand-600">{profile.trust_score}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${profile.trust_score}%` }}></div>
                </div>
                <p className="text-xs text-gray-500">
                  Your trust score is based on your activity, positive transactions, and profile completeness.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Registration No. / Username</label>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <School className="w-4 h-4 text-gray-400" />
                  {profile.username}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
