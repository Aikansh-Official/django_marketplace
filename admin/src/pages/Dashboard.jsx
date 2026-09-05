import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Users, ShoppingBag, CheckCircle, AlertTriangle, Tag, MapPin, ArrowRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [usersRes, listingsRes, reportsRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/auth/users/`),
          axios.get(`${API_BASE}/marketplace/admin/listings/`),
          axios.get(`${API_BASE}/marketplace/admin/reports/`)
        ]);

        if (usersRes.status === 'fulfilled') {
          setUsers(usersRes.value.data);
        }
        if (listingsRes.status === 'fulfilled') {
          setListings(listingsRes.value.data);
        }
        if (reportsRes.status === 'fulfilled') {
          setReports(reportsRes.value.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Compute real dynamic statistics
  const students = users.filter((u) => !u.is_staff && !u.is_superuser);
  const verifiedStudents = students.filter((u) => u.is_verified_student).length;
  const activeListings = listings.filter((l) => l.status === 'ACTIVE').length;
  const completedDeals = listings.filter((l) => l.status === 'SOLD').length;
  const pendingReports = reports.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-8">
      {/* Dynamic Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Students</h3>
            <p className="mt-2 text-3xl font-black text-gray-900">
              {loading ? '...' : students.length}
            </p>
            <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> {verifiedStudents} campus verified
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Active Listings */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Listings</h3>
            <p className="mt-2 text-3xl font-black text-gray-900">
              {loading ? '...' : activeListings}
            </p>
            <p className="mt-1 text-xs text-gray-500 font-medium">
              {listings.length} total items listed
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Completed Deals */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completed Deals</h3>
            <p className="mt-2 text-3xl font-black text-gray-900">
              {loading ? '...' : completedDeals}
            </p>
            <p className="mt-1 text-xs text-emerald-600 font-semibold">
              Items marked as sold
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Reports */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Reports</h3>
            <p className={`mt-2 text-3xl font-black ${pendingReports > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {loading ? '...' : pendingReports}
            </p>
            <p className="mt-1 text-xs text-gray-500 font-medium">
              {pendingReports === 0 ? 'No open flags' : 'Requires moderation review'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pendingReports > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Listings & Recent Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Listings from Database */}
        <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-black text-gray-900">Recent Campus Listings</h2>
              <p className="text-xs text-gray-500">Live items posted by registered students</p>
            </div>
            <Link to="/listings" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View All ({listings.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-xs text-gray-500 py-6 text-center">Loading marketplace items...</p>
            ) : listings.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No listings recorded yet.</p>
            ) : (
              listings.slice(0, 5).map((listing) => {
                const cover = listing.images?.find((img) => img.is_primary)?.image_url || listing.images?.[0]?.image_url;
                return (
                  <div key={listing.id} className="flex items-center justify-between p-2.5 rounded-md hover:bg-gray-50 transition-colors border border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-md bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-200">
                        {cover ? (
                          <img src={cover} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Tag className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{listing.title}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" /> {listing.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className="text-xs font-black text-gray-900 block">
                        {listing.transaction_type === 'DONATE' ? 'Free' : `₹${listing.price}`}
                      </span>
                      <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        listing.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : listing.status === 'SOLD'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {listing.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Students from Database */}
        <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-black text-gray-900">Registered Students</h2>
              <p className="text-xs text-gray-500">Verified peer accounts on LPUTrade</p>
            </div>
            <Link to="/students" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View All ({students.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-xs text-gray-500 py-6 text-center">Loading student records...</p>
            ) : students.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No students registered yet.</p>
            ) : (
              students.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2.5 rounded-md hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                      {(user.full_name || user.username)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    {user.is_verified_student ? (
                      <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold rounded-full">
                        Verified
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full">
                        Pending
                      </span>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">Trust: {user.trust_score}/100</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

