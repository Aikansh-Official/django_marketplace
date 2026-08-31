import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/auth/users/');
        setUsers(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* Stat Cards */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Students</h3>
          {loading ? (
             <p className="mt-2 text-xl font-bold text-gray-400">Loading...</p>
          ) : (
             <p className="mt-2 text-3xl font-bold text-gray-900">{users.length}</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Listings</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          <p className="mt-1 text-sm text-gray-400 font-medium">Coming soon</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Completed Deals</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          <p className="mt-1 text-sm text-gray-400 font-medium">Coming soon</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-brand-200 bg-brand-50 shadow-sm">
          <h3 className="text-sm font-medium text-brand-700 uppercase tracking-wide">Pending Reports</h3>
          <p className="mt-2 text-3xl font-bold text-brand-600">0</p>
          <p className="mt-1 text-sm text-brand-600 font-medium">Coming soon</p>
        </div>

      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Users</h2>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading recent activity...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-500">No users registered yet.</p>
          ) : (
            users.slice(0, 5).map(user => (
              <div key={user.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">New User Registered: {user.email}</p>
                  <p className="text-xs text-gray-500">{new Date(user.date_joined).toLocaleString()}</p>
                </div>
                {user.is_verified_student ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-sm">Verified</span>
                ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-sm">Pending</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
