import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, MapPin, ArrowRight, GraduationCap } from 'lucide-react';

export default function About() {
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncUser = () => {
      try {
        const stored = localStorage.getItem('user');
        setUserProfile(stored ? JSON.parse(stored) : null);
      } catch {
        setUserProfile(null);
      }
    };
    window.addEventListener('auth-changed', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('auth-changed', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const isSeller = Boolean(
    userProfile && (
      userProfile.role === 'SELLER' ||
      userProfile.is_id_verified ||
      userProfile.is_staff ||
      userProfile.is_superuser
    )
  );
  const isBuyer = Boolean(userProfile && !isSeller);
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-[5%]">
        
        {/* Breadcrumb / Category Tag */}
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
          <span>Student Project</span>
          <span>•</span>
          <span>Lovely Professional University</span>
          <span>•</span>
          <span>Phagwara, Punjab</span>
        </div>

        {/* Page Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight font-display mb-3">
          About CampusXChange
        </h1>
        <p className="text-base text-gray-600 leading-relaxed max-w-2xl mb-8">
          A peer-to-peer campus exchange developed by students of Lovely Professional University as a project, built exclusively for the LPU student community.
        </p>

        {/* Highlight Stats / Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white p-5 rounded-md border border-gray-200 shadow-xs">
            <div className="w-9 h-9 rounded-md bg-orange-50 text-brand-500 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Student Verified</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Safe community restricted to university students with verified university credentials.
            </p>
          </div>

          <div className="bg-white p-5 rounded-md border border-gray-200 shadow-xs">
            <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Campus Handover</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Direct physical exchange at familiar spots like Uni-Mall, Central Library, or Hostels.
            </p>
          </div>

          <div className="bg-white p-5 rounded-md border border-gray-200 shadow-xs">
            <div className="w-9 h-9 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Zero Commission</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              100% free trading. Students keep every single rupee from their sales.
            </p>
          </div>
        </div>

        {/* Story & Mission Card */}
        <div className="bg-white rounded-md border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6 text-gray-700 leading-relaxed text-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-brand-600 text-xs font-semibold mb-3 border border-orange-200">
              <GraduationCap className="w-4 h-4" />
              <span>Student Project • Built by LPU Students</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Our Story & Mission</h2>
            <p className="text-gray-600 leading-relaxed">
              We are students currently studying at <strong>Lovely Professional University (LPU)</strong>, and we are developing <strong>CampusXChange</strong> as our project. Living on campus, we experienced firsthand how difficult it can be for students to conveniently buy, sell, or pass on essential items semester after semester.
            </p>
            <p className="text-gray-600 leading-relaxed mt-2">
              At the start of every semester, thousands of LPU students buy books, notes, stationery, and daily campus essentials. At the end of the semester or when graduating, these same essentials often go to waste or are sold for pennies to outside scrap dealers.
            </p>
            <p className="text-gray-600 leading-relaxed mt-2">
              We built <strong>CampusXChange</strong> as our campus project to bridge this gap by creating an authentic, localized student-to-student circular marketplace. Seniors can pass down their essentials and study materials to juniors, saving money for both sides while reducing campus waste.
            </p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-md border border-gray-100 space-y-1">
                <span className="text-xs font-black text-brand-500">STEP 1</span>
                <h4 className="text-xs font-bold text-gray-900">Post Item in 60s</h4>
                <p className="text-xs text-gray-500">Snap photos of your books, notes, or daily essentials, set your price or donation mode, and publish.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-100 space-y-1">
                <span className="text-xs font-black text-brand-500">STEP 2</span>
                <h4 className="text-xs font-bold text-gray-900">Connect with Peers</h4>
                <p className="text-xs text-gray-500">Interested students from your block or campus chat and arrange a safe handover.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-100 space-y-1">
                <span className="text-xs font-black text-brand-500">STEP 3</span>
                <h4 className="text-xs font-bold text-gray-900">Meet & Exchange</h4>
                <p className="text-xs text-gray-500">Meet at Uni-Mall or hostel entrance, verify the item in person, and complete the trade.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-md bg-gradient-to-r from-orange-50 via-amber-50 to-white border border-brand-200">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Ready to declutter or find campus essentials?</h3>
            <p className="text-xs text-gray-500">Join fellow LPU students trading on campus today.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-md transition-colors shadow-2xs"
            >
              Browse Items
            </Link>
            {!isBuyer && (
              <Link
                to="/sell"
                className="text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
              >
                Post an Item <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
