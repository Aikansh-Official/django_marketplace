import { AlertCircle } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Category Tag */}
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
          <span>Terms & Conditions</span>
          <span>•</span>
          <span>LPXchange</span>
        </div>

        {/* Page Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight font-display mb-3">
          Terms of Service
        </h1>
        <p className="text-xs text-gray-400 mb-8">
          Effective from: September 2026 • Governing transactions across Lovely Professional University
        </p>

        {/* Highlight Alert */}
        <div className="p-4 rounded-md bg-amber-50 border border-amber-200 mb-8 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Important Summary:</strong> LPXchange provides a free platform for students to discover and connect for campus trades. All payments, inspections, and physical exchanges occur directly between the buyer and seller. Always verify items in person before sending funds.
          </div>
        </div>

        {/* Main Terms Sections */}
        <div className="bg-white rounded-md border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6 text-sm text-gray-700 leading-relaxed">
          
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">1. Eligibility & Registration</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              To list items, initiate chats, or use marketplace features on LPXchange, you must be a student of Lovely Professional University with a valid 8-digit registration number. Creating fake accounts or registering on behalf of non-students is strictly prohibited.
            </p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">2. Peer-to-Peer Transactions</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              LPXchange does not own, manufacture, store, inspect, or deliver any items listed. We charge 0% commission fees. Any agreement to buy, sell, or accept a donation is strictly a private agreement between the two students involved. Both parties agree to test, inspect, and confirm item conditions at the time of meetup.
            </p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">3. Prohibited Conduct & Campus Rules</h2>
            <p className="text-xs text-gray-600 leading-relaxed mb-2">
              Users must abide by university disciplinary rules and code of conduct. You agree not to:
            </p>
            <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
              <li>List counterfeit goods, stolen campus property, or prohibited contraband.</li>
              <li>Demand advance deposits or payments without in-person handover.</li>
              <li>Harass, threaten, or abuse fellow students during negotiations.</li>
            </ul>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-base font-bold text-gray-900 mb-2">4. Disciplinary Action & Termination</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              LPXchange administrators reserve the right to suspend or permanently ban any user who engages in fraudulent activity, attempts scams, or violates these Terms. In serious cases involving theft or fraud, details may be forwarded to campus security authorities.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
