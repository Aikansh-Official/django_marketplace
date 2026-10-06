import { X, Mail, Phone, ShieldCheck, ShieldAlert, Loader2, Maximize2, Globe, CheckCircle2, AlertTriangle, Star } from 'lucide-react';

const formatOcrKey = (key) => {
  const map = {
    batch: 'Batch / Year',
    care_of: 'Care Of / Guardian',
    careof: 'Care Of / Guardian',
    roll_no: 'Roll Number',
    rollno: 'Roll Number',
    reg_no: 'Registration No',
    regno: 'Registration No',
    program: 'Program / Degree',
    valid_upto: 'Valid Upto',
    validupto: 'Valid Upto',
    father_name: "Father's Name",
    name: 'Name on ID',
    blood_group: 'Blood Group',
    dob: 'Date of Birth',
    address: 'Address'
  };
  const clean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (map[clean]) return map[clean];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
};

const formatOcrValue = (val) => {
  if (
    val === null ||
    val === undefined ||
    val === '' ||
    String(val).trim().toLowerCase() === 'null' ||
    String(val).trim().toLowerCase() === 'none'
  ) {
    return <span className="text-gray-400 font-mono text-[11px] italic">Not detected</span>;
  }
  return <span className="font-bold text-gray-800 font-mono">{String(val)}</span>;
};

const getOcrEntries = (data) => {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).filter(([k]) => !k.startsWith('_'));
};

const hasValidOcrFields = (entries) => {
  return entries.some(([, val]) => {
    if (val === null || val === undefined) return false;
    const s = String(val).trim().toLowerCase();
    return s !== '' && s !== 'null' && s !== 'none' && s !== 'undefined';
  });
};

export default function StudentInspectModal({
  student,
  onClose,
  onOpenLightbox,
  onToggleIdVerification,
  onToggleBan,
  actionLoading,
  studentLoginLogs,
  loadingLogs,
}) {
  if (!student) return null;

  const ocrEntries = getOcrEntries(student.id_card_ocr_data);
  const hasOcr = hasValidOcrFields(ocrEntries);

  return (
    <div
      className="fixed inset-0 bg-ink-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              {student.full_name ? student.full_name.charAt(0) : student.username.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-gray-900">{student.full_name || 'Unnamed Student'}</h3>
                <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  @{student.username}
                </span>
                {student.is_id_verified && (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> ID Verified
                  </span>
                )}
                {student.is_active === false && (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full border border-red-300">
                    <AlertTriangle className="w-3 h-3 text-red-600" /> Suspended
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                <span>Joined {new Date(student.date_joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span>•</span>
                <span className="font-semibold text-gray-700">Role: {student.role || 'BUYER'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Trust Score</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-base font-black text-gray-900">{student.trust_score || 0}</span>
                <span className="text-[10px] text-gray-400 font-semibold">/ 100</span>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">ID Card Status</span>
              <div className="mt-1 flex items-center gap-1.5">
                {student.is_id_verified ? (
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                  </span>
                ) : student.has_id_card ? (
                  <span className="font-bold text-amber-700 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                  </span>
                ) : (
                  <span className="font-bold text-gray-500">Not Uploaded</span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Contact Phone</span>
              <p className="text-xs font-bold text-gray-900 mt-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-400" />
                {student.phone_number || <span className="text-gray-400 italic font-normal">None</span>}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Campus Email</span>
              <p className="text-xs font-bold text-gray-900 mt-1 truncate flex items-center gap-1" title={student.email}>
                <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="truncate">{student.email || <span className="text-gray-400 italic font-normal">None</span>}</span>
              </p>
            </div>
          </div>

          {/* Side-by-Side Face Photo & ID Card Inspection */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-gray-100/70 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                Physical ID Card & Face Verification Inspection
              </span>
              {student.id_card_image && (
                <button
                  onClick={() => onOpenLightbox(student.id_card_image)}
                  className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-800 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" /> Fullscreen Zoom
                </button>
              )}
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profile / Face Photo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Account Face Photo</span>
                  {student.profile_photo && (
                    <button
                      onClick={() => onOpenLightbox(student.profile_photo)}
                      className="text-[10px] text-gray-500 hover:text-gray-800"
                    >
                      View
                    </button>
                  )}
                </div>
                <div className="h-48 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                  {student.profile_photo ? (
                    <img
                      src={student.profile_photo}
                      alt="Student Face"
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => onOpenLightbox(student.profile_photo)}
                    />
                  ) : (
                    <div className="text-center p-4 text-gray-400">
                      <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto flex items-center justify-center font-bold text-gray-500 mb-1">
                        {student.username?.charAt(0) || 'U'}
                      </div>
                      <p className="text-[11px]">No profile photo uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Physical Student ID Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Physical ID Card Scan</span>
                  {student.id_card_image && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                      Upload Present
                    </span>
                  )}
                </div>
                <div className="h-48 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                  {student.id_card_image ? (
                    <img
                      src={student.id_card_image}
                      alt="Physical ID Card"
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => onOpenLightbox(student.id_card_image)}
                    />
                  ) : (
                    <div className="text-center p-4 text-gray-400">
                      <ShieldAlert className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                      <p className="text-[11px]">No physical ID card uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* OCR Extracted Data Sheet */}
            {hasOcr && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
                <p className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>OCR Extracted Identity Metadata</span>
                  <span className="text-[10px] font-normal text-gray-400 lowercase">(automated machine read)</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-gray-200">
                  {ocrEntries.map(([key, val]) => (
                    <div key={key} className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                        {formatOcrKey(key)}
                      </span>
                      <div className="text-xs truncate" title={String(val)}>
                        {formatOcrValue(val)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Login Session History Drawer */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-gray-100/70 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" />
                Recent Login Security Telemetry ({studentLoginLogs.length})
              </span>
              {loadingLogs && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />}
            </div>

            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {studentLoginLogs.length === 0 ? (
                <div className="p-4 text-center text-gray-400 italic">
                  {loadingLogs ? 'Loading login sessions...' : 'No login history records found for this account.'}
                </div>
              ) : (
                studentLoginLogs.map((log) => (
                  <div key={log.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 font-mono text-[11px]">{log.ip_address || 'Unknown IP'}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                            log.login_method === 'GOOGLE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {log.login_method}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                            log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate max-w-sm" title={log.user_agent}>
                          {log.user_agent || 'Standard Browser'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleIdVerification(student)}
              disabled={actionLoading}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                student.is_id_verified
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {student.is_id_verified ? 'Revoke ID Verification' : 'Verify Student Physical ID'}
            </button>

            <button
              onClick={() => onToggleBan(student)}
              disabled={actionLoading}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                student.is_active === false
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {student.is_active === false ? 'Unban & Reactivate' : 'Ban / Suspend Student'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
