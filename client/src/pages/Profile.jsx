import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProfileSidebar from '../components/profile/ProfileSidebar';
import { getSavedCount } from '../utils/savedStore';
import api from '../services/api';

const PersonalInfoTab = lazy(() => import('../components/profile/PersonalInfoTab'));
const OrdersSellsTab = lazy(() => import('../components/profile/OrdersSellsTab'));
const SavedItemsTab = lazy(() => import('../components/profile/SavedItemsTab'));
const MyReportsTab = lazy(() => import('../components/profile/MyReportsTab'));
const IdVerificationTab = lazy(() => import('../components/profile/IdVerificationTab'));
const LogoutModal = lazy(() => import('../components/profile/LogoutModal'));
const UpgradeToSellerModal = lazy(() => import('../components/profile/UpgradeToSellerModal'));
const UpdateSelfieModal = lazy(() => import('../components/profile/UpdateSelfieModal'));

import UniversalLoader from '../components/common/UniversalLoader';

export default function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawTab = searchParams.get('tab');
  const normalizedTab = rawTab === 'verification' ? 'id-verification' : rawTab;
  const currentTabParam = normalizedTab || 'personal-info';
  const [activeTab, setActiveTab] = useState(
    currentTabParam === 'notifications' ? 'personal-info' : currentTabParam
  );

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listingsCount, setListingsCount] = useState(0);
  const [savedCount, setSavedCount] = useState(getSavedCount());

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSelfieModalOpen, setIsSelfieModalOpen] = useState(false);

  const isSeller = profile?.role === 'SELLER' || profile?.is_id_verified;

  // Sync tab with URL query parameter
  useEffect(() => {
    const raw = searchParams.get('tab');
    const tabFromUrl = raw === 'verification' ? 'id-verification' : raw;
    if (tabFromUrl === 'notifications') {
      navigate('/notifications', { replace: true });
      return;
    }
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, navigate]);

  // If a buyer lands on id-verification, redirect to personal-info and open upgrade modal
  useEffect(() => {
    if (profile && !isSeller && activeTab === 'id-verification') {
      setActiveTab('personal-info');
      setSearchParams({ tab: 'personal-info' });
      setIsUpgradeModalOpen(true);
    }
  }, [profile, isSeller, activeTab, setSearchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile/');
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
      await api.post('/auth/logout/');
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
    <div className="w-full px-4 sm:px-6 lg:px-[5%] py-4 sm:py-8 animate-fade-in-up">
      {/* Mobile Top Tabs Slider */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2.5 mb-4 scrollbar-none touch-pan-x touch-momentum -mx-1 px-1 pr-6">
        {[
          { id: 'personal-info', label: 'Personal Info' },
          { id: 'orders-sells', label: isSeller ? `Manage Orders (${listingsCount})` : 'My Orders & Trades' },
          ...(isSeller ? [{ id: 'id-verification', label: 'ID Verification' }] : []),
          { id: 'saved-items', label: `Saved (${savedCount})` },
          { id: 'my-reports', label: 'Reports & Disputes' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer min-h-[38px] flex items-center justify-center shrink-0 ${
              activeTab === tab.id
                ? 'bg-brand-500 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
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
          onUpgradeClick={() => setIsUpgradeModalOpen(true)}
        />

        {/* Right Active Tab Content */}
        <div className="flex-1 w-full min-w-0">
          <Suspense
            fallback={
              <div className="p-12 flex items-center justify-center">
                <UniversalLoader text="Loading section..." size="sm" />
              </div>
            }
          >
            {activeTab === 'personal-info' && (
              <PersonalInfoTab
                profile={profile}
                onProfileUpdated={fetchProfile}
                onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                onOpenSelfieModal={() => setIsSelfieModalOpen(true)}
              />
            )}

            {activeTab === 'orders-sells' && (
              <OrdersSellsTab
                profile={profile}
                isSeller={isSeller}
                onListingsCountChange={setListingsCount}
              />
            )}

            {activeTab === 'id-verification' && isSeller && (
              <IdVerificationTab
                profile={profile}
                onProfileUpdated={fetchProfile}
                onOpenSelfieModal={() => setIsSelfieModalOpen(true)}
              />
            )}

            {activeTab === 'saved-items' && (
              <SavedItemsTab onSavedCountChange={setSavedCount} />
            )}

            {activeTab === 'my-reports' && (
              <MyReportsTab />
            )}
          </Suspense>
        </div>
      </div>

      {/* Upgrade to Seller Modal */}
      {isUpgradeModalOpen && (
        <Suspense fallback={null}>
          <UpgradeToSellerModal
            isOpen={isUpgradeModalOpen}
            onClose={() => setIsUpgradeModalOpen(false)}
            profile={profile}
            onUpgradeSuccess={() => {
              fetchProfile();
              setIsUpgradeModalOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* Update Selfie Modal */}
      {isSelfieModalOpen && (
        <Suspense fallback={null}>
          <UpdateSelfieModal
            isOpen={isSelfieModalOpen}
            onClose={() => setIsSelfieModalOpen(false)}
            profile={profile}
            onProfileUpdated={fetchProfile}
          />
        </Suspense>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <Suspense fallback={null}>
          <LogoutModal
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            onConfirm={handleLogoutConfirm}
            loggingOut={loggingOut}
          />
        </Suspense>
      )}
    </div>
  );
}
