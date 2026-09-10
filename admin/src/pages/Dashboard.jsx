import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Users, ShoppingBag, CheckCircle, AlertTriangle, Tag, MapPin, ArrowRight, TrendingUp } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    verified_students: 0,
    active_listings: 0,
    total_listings: 0,
    completed_deals: 0,
    pending_reports: 0
  });
  const [recentListings, setRecentListings] = useState([]);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fast consolidated single-roundtrip endpoint
        const res = await axios.get(`${API_BASE}/marketplace/admin/dashboard-stats/`);
        if (isMounted && res.data) {
          if (res.data.stats) {
            setStats(res.data.stats);
          }
          if (res.data.recent_listings) {
            setRecentListings(res.data.recent_listings);
          }
          if (res.data.recent_students) {
            setRecentStudents(res.data.recent_students);
          }
        }
      } catch (error) {
        console.warn("Failed to fetch dashboard stats", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Dynamic Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Students</h3>
            <div className="mt-2 min-h-[36px] flex items-center">
              {loading ? (
                <div className="h-8 w-14 bg-gray-200 animate-pulse rounded-md"></div>
              ) : (
                <p className="text-3xl font-black text-gray-900">{stats.total_students}</p>
              )}
            </div>
            <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> {stats.verified_students} campus verified
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
            <div className="mt-2 min-h-[36px] flex items-center">
              {loading ? (
                <div className="h-8 w-14 bg-gray-200 animate-pulse rounded-md"></div>
              ) : (
                <p className="text-3xl font-black text-gray-900">{stats.active_listings}</p>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 font-medium">
              {stats.total_listings} total items listed
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
            <div className="mt-2 min-h-[36px] flex items-center">
              {loading ? (
                <div className="h-8 w-14 bg-gray-200 animate-pulse rounded-md"></div>
              ) : (
                <p className="text-3xl font-black text-gray-900">{stats.completed_deals}</p>
              )}
            </div>
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
            <div className="mt-2 min-h-[36px] flex items-center">
              {loading ? (
                <div className="h-8 w-14 bg-gray-200 animate-pulse rounded-md"></div>
              ) : (
                <p className={`text-3xl font-black ${stats.pending_reports > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {stats.pending_reports}
                </p>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 font-medium">
              {stats.pending_reports === 0 ? 'No open flags' : 'Requires moderation review'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.pending_reports > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics & Business Intelligence Quick Jump Banner */}
      <div className="bg-gradient-to-r from-ink-900 via-brand-950 to-ink-900 text-white p-5 rounded-md shadow-md border border-brand-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-md bg-brand-600/30 border border-brand-500/40 text-brand-400 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              Advanced Campus Analytics & Seller Leaderboards
            </h3>
            <p className="text-xs text-gray-300 mt-0.5">
              Inspect interactive turnover curves (₹ GMV), student acquisition trends, campus location hotspots & top sellers hall of fame.
            </p>
          </div>
        </div>
        <Link
          to="/analytics"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-md text-xs font-bold shadow-md transition-all whitespace-nowrap self-start sm:self-center"
        >
          <span>Open Full Analytics</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Two Column Layout: Recent Listings & Recent Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Listings */}
        <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-black text-gray-900">Recent Campus Listings</h2>
              <p className="text-xs text-gray-500">Live items posted by registered students</p>
            </div>
            <Link to="/listings" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View All ({stats.total_listings}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              // Skeleton loading rows
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-md border border-gray-100 animate-pulse">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-md bg-gray-200 flex-shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                      <div className="h-2.5 w-20 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-12 bg-gray-200 rounded" />
                </div>
              ))
            ) : recentListings.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No listings recorded yet.</p>
            ) : (
              recentListings.map((listing) => {
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
                      <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${listing.status === 'ACTIVE'
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

        {/* Recent Students */}
        <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-black text-gray-900">Registered Students</h2>
              <p className="text-xs text-gray-500">Verified peer accounts on CampusXChange</p>
            </div>
            <Link to="/students" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View All ({stats.total_students}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              // Skeleton loading rows
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-md border border-gray-100 animate-pulse">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 bg-gray-200 rounded" />
                      <div className="h-2.5 w-36 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-14 bg-gray-200 rounded" />
                </div>
              ))
            ) : recentStudents.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No students registered yet.</p>
            ) : (
              recentStudents.map((user) => (
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
