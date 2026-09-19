import { MapPin, AlertTriangle, CheckCircle, Mail, FileText } from 'lucide-react';

export default function Guidelines() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-[5%]">

        {/* Category Tag */}
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
          <span>Campus Safety & Etiquette</span>
          <span>•</span>
          <span>CampusXChange</span>
        </div>

        {/* Page Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight font-display mb-3">
          Community & Safety Guidelines
        </h1>
        <p className="text-base text-gray-600 leading-relaxed max-w-2xl mb-8">
          Follow these guidelines to ensure a secure, respectful, and transparent experience for everyone in our LPU student community.
        </p>

        {/* Main Content Cards */}
        <div className="space-y-6">

          {/* Section 1: Safe Handover Rules */}
          <div id="safe-handover" className="scroll-mt-24 bg-white rounded-md border border-gray-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">1. Safe Handover Rules & Campus Zones</h2>
                <p className="text-xs text-gray-500">Always meet at verified, high-visibility public spots.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="p-3.5 rounded-md bg-gray-50 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Uni-Mall Entrance & Food Court
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Best spot for daytime trades, cycle handovers, and gadget testing with ample lighting and cameras.
                </p>
              </div>

              <div className="p-3.5 rounded-md bg-gray-50 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Central Library & Block 34 Front
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ideal for exchanging textbooks, scientific calculators, drafters, and study notes.
                </p>
              </div>

              <div className="p-3.5 rounded-md bg-gray-50 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Boys Hostels (BH-1 to BH-13)
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Safe meeting point outside the warden desk or security turnstiles for room essentials.
                </p>
              </div>

              <div className="p-3.5 rounded-md bg-gray-50 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Girls Hostel Security Gates (GH Entry)
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Always meet in front of the main entry barrier / visitor reception area under security supervision.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-md text-xs text-amber-900">
              <strong>Golden Rule:</strong> Never send advance UPI payments before physically inspecting the product in person. Always inspect the item first, then pay.
            </div>
          </div>

          {/* Section 2: Honest Listings & Etiquette */}
          <div className="bg-white rounded-md border border-gray-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">2. Honest Listings & Fair Trade</h2>
                <p className="text-xs text-gray-500">Transparency builds a trusted campus community.</p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0"></span>
                <span><strong>Real Photos Only:</strong> Always upload authentic photos of the actual item showing its current condition, including any scratches, dents, or signs of wear.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0"></span>
                <span><strong>Accurate Specifications:</strong> Mention brand, model number, purchase year, and if a bill or charger is included.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0"></span>
                <span><strong>Prohibited Items:</strong> Any contraband, alcohol, weapons, hazardous chemicals, exam question leaks, or items banned by LPU campus policy are strictly forbidden and will lead to an immediate ban.</span>
              </li>
            </ul>
          </div>

          {/* Section 3: Report a Listing or Scam */}
          <div id="reporting" className="scroll-mt-24 bg-white rounded-md border border-orange-200 p-6 sm:p-8 shadow-xs bg-gradient-to-b from-orange-50/30 to-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-orange-100 text-brand-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">3. Report a Listing or Scam</h2>
                <p className="text-xs text-gray-500">How to report suspicious behavior, fraudulent sellers, or fake listings.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              If you encounter a user demanding advance bank transfers, selling non-authentic items, or harassing buyers, please report them immediately.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="p-4 rounded-md bg-white border border-gray-200">
                <h4 className="text-xs font-bold text-gray-900 mb-1">What to Include in Your Report:</h4>
                <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                  <li>Listing Title and URL / ID</li>
                  <li>Seller's name or contact info</li>
                  <li>Screenshot of chat or proof of payment demand</li>
                </ul>
              </div>

              <div className="p-4 rounded-md bg-white border border-gray-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 mb-1">Direct Help Desk</h4>
                  <p className="text-xs text-gray-500">Our campus moderators review reports within 12 hours.</p>
                </div>
                <div className="pt-2">
                  <a
                    href="mailto:support@campusxchange.in?subject=Report%20Listing%20/%20Scam"
                    className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 hover:text-brand-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-md transition-colors border border-orange-200"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    support@campusxchange.in
                  </a>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              Note: For urgent campus security matters, please notify the nearest security guard at Uni-Mall or hostel barrier desks.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
