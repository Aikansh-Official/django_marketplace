import { AlertTriangle, Clock } from 'lucide-react';

export default function Reports() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Reports</h2>
          <p className="text-sm text-gray-500">Manage flags, spam, and inappropriate behavior.</p>
        </div>
      </div>
      
      <div className="p-16 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4 border border-green-100">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">No Reports Pending!</h3>
        <p className="text-gray-500 max-w-md">Your community is behaving well. When users report listings or other users, they will appear here for your review.</p>
        
        <button className="mt-6 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
           <Clock className="h-4 w-4" /> View Resolved Reports
        </button>
      </div>
    </div>
  );
}
