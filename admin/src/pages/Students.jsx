import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Mail, Calendar, Eye, X, Phone, Globe, Star, ShoppingCart, Store, Filter } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL', 'BUYER', 'SELLER'

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get(`${API_BASE}/auth/users/`);
        const studentsOnly = response.data.filter(user => !user.is_staff && !user.is_superuser);
        setStudents(studentsOnly);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
      try {
        await axios.delete(`${API_BASE}/auth/users/${userId}/`);
        setStudents(students.filter(s => s.id !== userId));
        setSelectedStudent(null);
      } catch (error) {
        console.error("Failed to delete user", error);
        alert("Failed to delete user.");
      }
    }
  };

  const filteredStudents = students.filter(student => {
    const isSeller = student.role === 'SELLER' || student.is_id_verified;
    if (roleFilter === 'SELLER') return isSeller;
    if (roleFilter === 'BUYER') return !isSeller;
    return true;
  });

  return (
    <>
    <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md overflow-hidden relative">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Registered Students</h2>
          <p className="text-sm text-gray-500">Manage user accounts, roles (Buyer vs Seller), and verifications.</p>
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center bg-gray-200/80 p-1 rounded-lg self-start sm:self-auto text-xs font-bold">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              roleFilter === 'ALL'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({students.length})
          </button>
          <button
            onClick={() => setRoleFilter('BUYER')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
              roleFilter === 'BUYER'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
            Buyers ({students.filter(s => s.role !== 'SELLER' && !s.is_id_verified).length})
          </button>
          <button
            onClick={() => setRoleFilter('SELLER')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
              roleFilter === 'SELLER'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            Sellers ({students.filter(s => s.role === 'SELLER' || s.is_id_verified).length})
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                ID Verification
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Trust Score
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white/50 divide-y divide-gray-200">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="space-y-1.5">
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                        <div className="h-3 w-40 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-10 bg-gray-200 rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-7 w-20 bg-gray-200 rounded"></div>
                  </td>
                </tr>
              ))
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">
                  No students found matching current filter.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const isSeller = student.role === 'SELLER' || student.is_id_verified;
                return (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-lg">
                          {student.full_name ? student.full_name[0].toUpperCase() : student.username[0].toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{student.full_name || student.username}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isSeller ? (
                        <span className="px-2.5 py-1 inline-flex text-xs font-black rounded-full bg-purple-100 text-purple-800 border border-purple-200 items-center gap-1">
                          <Store className="w-3 h-3" /> Seller
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 inline-flex text-xs font-black rounded-full bg-blue-100 text-blue-800 border border-blue-200 items-center gap-1">
                          <ShoppingCart className="w-3 h-3" /> Buyer
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.is_id_verified ? (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800 border border-green-200 gap-1 items-center">
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified ID
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          Not Required (Buyer)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-bold">{student.trust_score} / 100</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       <button 
                         onClick={() => setSelectedStudent(student)}
                         className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:text-brand-600 shadow-sm transition-all cursor-pointer"
                       >
                         <Eye className="h-4 w-4" /> View Details
                       </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Student Details Modal */}
    {selectedStudent && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-md shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/20">
          <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Student Profile</h3>
            <button 
              onClick={() => setSelectedStudent(null)}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-10">
              {/* Left Side: Avatar and Basic Info */}
              <div className="flex flex-col items-center text-center md:w-1/3 md:border-r border-gray-100 md:pr-10">
                <div className="h-32 w-32 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 font-black text-5xl mb-4 shadow-inner ring-4 ring-white">
                  {selectedStudent.full_name ? selectedStudent.full_name[0].toUpperCase() : selectedStudent.username[0].toUpperCase()}
                </div>
                <h4 className="text-2xl font-black text-gray-900 mb-1">{selectedStudent.full_name || selectedStudent.username}</h4>
                <p className="text-sm text-gray-500 font-semibold mb-3">@{selectedStudent.username}</p>

                {/* Role Badge */}
                <div className="mb-3">
                  {selectedStudent.role === 'SELLER' || selectedStudent.is_id_verified ? (
                    <span className="px-3 py-1 inline-flex text-xs font-black rounded-full bg-purple-100 text-purple-800 border border-purple-200 items-center gap-1">
                      <Store className="w-3.5 h-3.5" /> Verified Seller
                    </span>
                  ) : (
                    <span className="px-3 py-1 inline-flex text-xs font-black rounded-full bg-blue-100 text-blue-800 border border-blue-200 items-center gap-1">
                      <ShoppingCart className="w-3.5 h-3.5" /> Registered Buyer
                    </span>
                  )}
                </div>

                {selectedStudent.is_id_verified ? (
                  <span className="px-4 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-green-50 text-green-700 border border-green-200 gap-1.5 items-center">
                    <ShieldCheck className="h-4 w-4" /> Physical ID Verified
                  </span>
                ) : (
                  <span className="px-4 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    ID Not Uploaded (Buyer)
                  </span>
                )}
              </div>

              {/* Right Side: Details Grid */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 content-start pt-2">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Email Address</span>
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {selectedStudent.email}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Phone Number</span>
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {selectedStudent.phone_number || 'Not provided'}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Account Role</span>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedStudent.role === 'SELLER' || selectedStudent.is_id_verified ? 'Seller (Can Post Items)' : 'Buyer (Can Buy & Bid)'}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Trust Score</span>
                  <p className="text-sm font-bold text-brand-600 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-brand-500 text-brand-500" />
                    {selectedStudent.trust_score} / 100
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Date Joined</span>
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {new Date(selectedStudent.date_joined).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Danger Zone</span>
                  <button
                    onClick={() => handleDeleteUser(selectedStudent.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md text-xs font-bold transition-colors cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
