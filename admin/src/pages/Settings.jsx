import { Save } from 'lucide-react';

export default function Settings() {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md overflow-hidden max-w-3xl">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Platform Settings</h2>
          <p className="text-sm text-gray-500">Configure global platform behavior.</p>
        </div>
      </div>
      
      <div className="p-6 space-y-8">
        
        <div>
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">General Configuration</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-700">Maintenance Mode</h4>
                <p className="text-sm text-gray-500">Temporarily disable the client site for updates.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" value="" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-700">Allow New Registrations</h4>
                <p className="text-sm text-gray-500">Enable or disable new user sign-ups.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>
          </div>
        </div>

        <div>
           <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Email Domains</h3>
           <p className="text-sm text-gray-500 mb-3">Allowed domains for student verification.</p>
           <input type="text" defaultValue="lpu.in, lpu.co.in" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500" />
        </div>

      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
         <button className="flex items-center gap-2 bg-ink-900 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-gray-800 shadow-md hover:shadow-lg transition-all">
            <Save className="h-4 w-4" /> Save Settings
         </button>
      </div>
    </div>
  );
}
