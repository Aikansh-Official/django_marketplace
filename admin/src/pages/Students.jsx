import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Mail, Calendar, Eye, X, Phone, Globe, Star } from 'lucide-react';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/auth/users/');
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

  return (
    <>
    <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md overflow-hidden relative">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Registered Students</h2>
          <p className="text-sm text-gray-500">Manage user accounts and verifications.</p>
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
                Status
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
              <tr>
                <td colSpan="4" className="px-6 py-10 text-center text-sm text-gray-500">Loading students...</td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-10 text-center text-sm text-gray-500">No students registered yet.</td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-lg">
                        {student.first_name ? student.first_name[0].toUpperCase() : student.username[0].toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">{student.first_name} {student.last_name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {student.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.is_verified_student ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200 gap-1 items-center">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-bold">{student.trust_score}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     <button 
                       onClick={() => setSelectedStudent(student)}
                       className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:text-brand-600 shadow-sm transition-all"
                     >
                       <Eye className="h-4 w-4" /> View Details
                     </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>

      {/* Student Details Modal - Landscape */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4">
          <div className="bg-white/90 backdrop-blur-md rounded-md shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/20">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Student Profile</h3>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-10">
                {/* Left Side: Avatar and Basic Info */}
                <div className="flex flex-col items-center text-center md:w-1/3 md:border-r border-gray-100 md:pr-10">
                  <div className="h-32 w-32 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 font-black text-5xl mb-6 shadow-inner ring-4 ring-white">
                    {selectedStudent.first_name ? selectedStudent.first_name[0].toUpperCase() : selectedStudent.username[0].toUpperCase()}
                  </div>
                  <h4 className="text-2xl font-black text-gray-900 mb-1">{selectedStudent.first_name} {selectedStudent.last_name}</h4>
                  <p className="text-sm text-gray-500 font-semibold mb-6">@{selectedStudent.username}</p>
                  
                  {selectedStudent.is_verified_student ? (
                    <span className="px-4 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-green-50 text-green-700 border border-green-200 gap-1.5 items-center">
                      <ShieldCheck className="h-4 w-4" /> Verified Student
                    </span>
                  ) : (
                    <span className="px-4 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                      Unverified
                    </span>
                  )}
                </div>

                {/* Right Side: Details Grid */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-8 content-start pt-2">
                  
                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-black tracking-wider mb-1">Email Address</p>
                      <p className="text-sm font-semibold text-gray-900 break-all">{selectedStudent.email}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-black tracking-wider mb-1">Phone Number</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedStudent.phone_number || 'Not provided'}</p>
                    </div>
                  </div>

                  {/* College Domain */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-black tracking-wider mb-1">College Domain</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedStudent.college_domain || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Trust Score */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-brand-500 flex-shrink-0">
                      <Star className="h-5 w-5" />
                    </div>
                    <div className="w-full">
                      <p className="text-[11px] text-gray-400 uppercase font-black tracking-wider mb-1.5">Trust Score</p>
                      <div className="flex items-center gap-3">
                         <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                           <div className="h-full bg-brand-500 rounded-full" style={{ width: `${selectedStudent.trust_score}%` }}></div>
                         </div>
                         <p className="text-sm font-black text-gray-900 w-8">{selectedStudent.trust_score}</p>
                      </div>
                    </div>
                  </div>

                  {/* Joined Date */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-black tracking-wider mb-1">Joined Date</p>
                      <p className="text-sm font-semibold text-gray-900">{new Date(selectedStudent.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>

                </div>
              </div>
              
              {/* Bottom Actions */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-4 bg-white">
                 <button className="px-6 py-2.5 border border-gray-200 text-gray-700 bg-white rounded-md text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm">
                   Suspend User
                 </button>
                 <button className="px-6 py-2.5 bg-brand-500 rounded-md text-sm font-semibold text-white hover:bg-brand-600 shadow-md hover:shadow-lg transition-all">
                   Reset Password
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
