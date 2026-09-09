import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ProfileSidebar from '../components/profile/ProfileSidebar';
import PersonalInfoTab from '../components/profile/PersonalInfoTab';
import OrdersSellsTab from '../components/profile/OrdersSellsTab';
import IdVerificationTab from '../components/profile/IdVerificationTab';
import SavedItemsTab from '../components/profile/SavedItemsTab';
import LogoutModal from '../components/profile/LogoutModal';
import { getSavedCount } from '../utils/savedStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

import UniversalLoader from '../components/common/UniversalLoader';

export default function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentTabParam = searchParams.get('tab') || 'personal-info';
  const [activeTab, setActiveTab] = useState(
    currentTabParam === 'notifications' ? 'personal-info' : currentTabParam
  );

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listingsCount, setListingsCount] = useState(0);
  const [savedCount, setSavedCount] = useState(getSavedCount());

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Sync tab with URL query parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'notifications') {
      navigate('/notifications', { replace: true });
      return;
    }
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, navigate]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/profile/`);
      setProfile(res.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Listen to saved items updates
    const handleSavedUpdate = (e) => {
      setSavedCount(e.detail?.count ?? getSavedCount());
    };
    window.addEventListener('saved-items-updated', handleSavedUpdate);

    return () => {
      window.removeEventListener('saved-items-updated', handleSavedUpdate);
    };
  }, []);

  const handleLogoutConfirm = async () => {
    setLoggingOut(true);
    try {
      await axios.post(`${API_BASE}/auth/logout/`);
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      setIsLogoutModalOpen(false);
      setLoggingOut(false);
      toast.success('Logged out successfully.');
      navigate('/');
      // Trigger a window event so navbar refreshes
      window.dispatchEvent(new Event('auth-changed'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <UniversalLoader text="Loading profile..." />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 animate-fade-in-up">
      {/* Mobile Top Tabs Slider */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none touch-pan-x -mx-1 px-1">
        {[
          { id: 'personal-info', label: 'Personal Info' },
          { id: 'orders-sells', label: `Manage Orders (${listingsCount})` },
          { id: 'id-verification', label: 'ID Verification' },
          { id: 'saved-items', label: `Saved (${savedCount})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-3.5 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-brand-500 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Dashboard Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sidebar */}
        <ProfileSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          profile={profile}
          listingsCount={listingsCount}
          savedCount={savedCount}
          onLogoutClick={() => setIsLogoutModalOpen(true)}
        />

        {/* Right Active Tab Content */}
        <div className="flex-1 w-full min-w-0">
          {activeTab === 'personal-info' && (
            <PersonalInfoTab profile={profile} onProfileUpdated={fetchProfile} />
          )}

          {activeTab === 'orders-sells' && (
            <OrdersSellsTab onListingsCountChange={setListingsCount} />
          )}

          {activeTab === 'id-verification' && (
            <IdVerificationTab profile={profile} onProfileUpdated={fetchProfile} />
          )}

          {activeTab === 'saved-items' && (
            <SavedItemsTab onSavedCountChange={setSavedCount} />
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        loggingOut={loggingOut}
      />
    </div>
  );
}
