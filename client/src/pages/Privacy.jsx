import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Database, 
  UserCheck, 
  CreditCard, 
  Smartphone, 
  Trash2, 
  FileImage,
  Sparkles
} from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Category Tag */}
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
          <span>Transparency & Student Privacy</span>
          <span>•</span>
          <span>LPUTrade</span>
        </div>

        {/* Page Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight font-display mb-3">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-2xl">
          At LPUTrade, your privacy and campus safety are our top priorities. Here is a clear, transparent breakdown of exactly what data we collect, why we collect it, and how your information is protected.
        </p>

        {/* Commitment Banner */}
        <div className="p-4 sm:p-5 rounded-md bg-gradient-to-r from-orange-50 via-amber-50 to-white border border-brand-200 mb-8 flex items-start gap-3.5 text-xs text-gray-700 leading-relaxed shadow-xs">
          <div className="p-2 rounded-md bg-brand-500 text-white flex-shrink-0 mt-0.5 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Our Student Privacy Guarantee</h3>
            <p className="text-gray-600">
              LPUTrade is built by students, for students. We collect only what is strictly necessary to verify active university enrollment and enable safe campus exchanges. <strong>We do not sell, rent, or monetize student personal data to any advertisers, telemarketers, or loan agencies.</strong>
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6">

          {/* Section 1: Exact Data We Collect */}
          <div className="bg-white rounded-md border border-gray-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-md bg-brand-50 text-brand-500 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">1. Exact Data We Collect & Why</h2>
                <p className="text-xs text-gray-500">Categorized overview of all data stored on LPUTrade.</p>
              </div>
            </div>

            <div className="space-y-4">
              
              {/* Account & Identity */}
              <div className="p-4 rounded-md bg-gray-50 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-3 text-brand-600">
                  <UserCheck className="w-4 h-4" />
                  A. Account & Student Verification Data
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-md border border-gray-100">
                    <p className="font-bold text-gray-800">Full Name</p>
                    <p className="text-gray-500 mt-0.5">Displayed on your profile and listings so fellow students know who they are trading with.</p>
                  </div>
                  <div className="p-3 bg-white rounded-md border border-gray-100">
                    <p className="font-bold text-gray-800">Student Email Address</p>
                    <p className="text-gray-500 mt-0.5">Used for account login, security alerts, and 6-digit OTP verification.</p>
                  </div>
                  <div className="p-3 bg-white rounded-md border border-gray-100">
                    <p className="font-bold text-gray-800">Phone / WhatsApp Number</p>
                    <p className="text-gray-500 mt-0.5">Stored so interested buyers or sellers can coordinate physical handover at Uni-Mall or hostel gates.</p>
                  </div>
                  <div className="p-3 bg-white rounded-md border border-gray-100">
                    <p className="font-bold text-gray-800">Encrypted Password</p>
                    <p className="text-gray-500 mt-0.5">Securely hashed using industry-standard PBKDF2/SHA-256 algorithms. No one, including admins, can view your raw password.</p>
                  </div>
                </div>
              </div>

              {/* Student ID Card Data */}
              <div className="p-4 rounded-md bg-gray-50 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-2 text-brand-600">
                  <FileImage className="w-4 h-4" />
                  B. Student ID Verification (Optional Verification)
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  Students may optionally upload a photo of their physical LPU student ID card to earn the <strong>"LPU Verified"</strong> badge and increase their campus Trust Score.
                </p>
                <div className="p-3 bg-white rounded-md border border-gray-100 text-xs text-gray-600 space-y-1">
                  <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <strong>Private to Admins:</strong> ID card photos are strictly used for credential checks and are NEVER shown publicly to other students.
                  </p>
                  <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <strong>Protected Storage:</strong> Stored securely in verified server directories and accessible only during verification.
                  </p>
                </div>
              </div>

              {/* Listings & Handover */}
              <div className="p-4 rounded-md bg-gray-50 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-2 text-brand-600">
                  <Smartphone className="w-4 h-4" />
                  C. Listing Information & Campus Zones
                </h3>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                  <li><strong>Item Details:</strong> Title, description, price, condition (New, Like New, Good, Fair), and product photos you upload.</li>
                  <li><strong>Campus Handover Spot:</strong> Selected pickup spot (e.g., Uni-Mall, Central Library, BH-1 to BH-13, Girls Hostel gate).</li>
                  <li><strong>Trade History:</strong> Record of completed offers used solely to calculate your campus Trust Score.</li>
                </ul>
              </div>

              {/* Local Storage Data */}
              <div className="p-4 rounded-md bg-gray-50 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 mb-2 text-brand-600">
                  <Lock className="w-4 h-4" />
                  D. Browser Local Storage Data
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  For your convenience, your browser stores temporary session tokens (<code className="bg-white px-1 py-0.5 rounded-md border border-gray-200">access</code> and <code className="bg-white px-1 py-0.5 rounded-md border border-gray-200">refresh</code>) so you don't need to re-login every time you open the site. Your bookmarked wishlist items (<code className="bg-white px-1 py-0.5 rounded-md border border-gray-200">lputrade_saved_items</code>) are also stored locally on your device.
                </p>
              </div>

            </div>
          </div>

          {/* Section 2: What We NEVER Collect */}
          <div className="bg-white rounded-md border border-gray-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">2. What We NEVER Collect (Zero-Tolerance)</h2>
                <p className="text-xs text-gray-500">Items we will never ask for or store.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-rose-50/50 rounded-md border border-rose-100">
                <h4 className="font-bold text-rose-900 mb-1">No Banking or UPI MPINs</h4>
                <p className="text-rose-700/90 leading-relaxed">
                  We do not process in-app payments. All UPI or cash payments occur directly between students in person.
                </p>
              </div>

              <div className="p-3.5 bg-rose-50/50 rounded-md border border-rose-100">
                <h4 className="font-bold text-rose-900 mb-1">No Real-time GPS Tracking</h4>
                <p className="text-rose-700/90 leading-relaxed">
                  We do not track your phone’s live background location. You choose your preferred campus meetup spot manually.
                </p>
              </div>

              <div className="p-3.5 bg-rose-50/50 rounded-md border border-rose-100">
                <h4 className="font-bold text-rose-900 mb-1">No Third-Party Ad Brokers</h4>
                <p className="text-rose-700/90 leading-relaxed">
                  No advertising trackers or cookies selling student profiles to external marketers or data brokers.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: How Your Data is Used */}
          <div className="bg-white rounded-md border border-gray-200 p-6 sm:p-8 shadow-xs space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">3. How Your Data is Used</h2>
                <p className="text-xs text-gray-500">Purposes for which stored information is utilized.</p>
              </div>
            </div>

            <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside leading-relaxed">
              <li><strong>Campus Identity & Trust:</strong> Verifying that sellers and buyers are authentic students of Lovely Professional University.</li>
              <li><strong>Marketplace Functionality:</strong> Publishing your listing details so students can browse, search, and contact you for handover.</li>
              <li><strong>Safety & Scam Prevention:</strong> Detecting fraudulent accounts, spam, duplicate fake listings, or repeated policy violations.</li>
              <li><strong>Trust Score Calculation:</strong> Awarding positive trust points when you complete legitimate campus transactions.</li>
            </ul>
          </div>

          {/* Section 4: Your Rights & Data Deletion */}
          <div className="bg-white rounded-md border border-gray-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">4. Your Control & Data Deletion Rights</h2>
                <p className="text-xs text-gray-500">You remain in full control of your listings and account.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <p>
                <strong>Edit or Remove Listings:</strong> You can edit the price, photos, or description, or mark any listing as sold/deleted at any time from your <strong>My Listings</strong> dashboard.
              </p>
              <p>
                <strong>Complete Account Deletion:</strong> If you are graduating or wish to remove your account and all associated data permanently from our database, you can submit a deletion request anytime by writing to us at <a href="mailto:support@lputrade.in" className="text-brand-600 font-bold hover:underline">support@lputrade.in</a>. All personal profile records, ID verification data, and active posts will be purged within 48 hours.
              </p>
            </div>
          </div>

          {/* Section 5: Contact & Inquiries */}
          <div className="p-5 rounded-md bg-white border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div>
              <h4 className="font-bold text-gray-900 mb-0.5">Have a privacy question or concerns?</h4>
              <p className="text-gray-500">Our campus team is here to help with any data questions.</p>
            </div>
            <a
              href="mailto:support@lputrade.in?subject=Privacy%20Inquiry"
              className="font-bold text-brand-600 hover:text-brand-700 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-md transition-colors border border-orange-200 flex-shrink-0"
            >
              Contact support@lputrade.in
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}
