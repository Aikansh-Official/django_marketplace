import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  School,
  Building,
  Image as ImageIcon,
  Clock,
  Sparkles,
  Camera,
  X,
  BadgeCheck,
  Zap
} from 'lucide-react';

export default function IdVerificationTab({ profile }) {
  const [verificationData, setVerificationData] = useState(() => {
    try {
      const saved = localStorage.getItem('lputrade_id_verification');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [idFrontImage, setIdFrontImage] = useState(verificationData?.frontImage || null);
  const [degree, setDegree] = useState(verificationData?.degree || '');
  const [residence, setResidence] = useState(verificationData?.residence || '');
  const [regNo, setRegNo] = useState(profile?.username || verificationData?.regNo || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.username && !regNo) {
      setRegNo(profile.username);
    }
  }, [profile]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid photo (JPG, PNG, or WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size allowed is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setIdFrontImage(reader.result);
      toast.success('Front ID photo uploaded!');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!idFrontImage) {
      toast.error('Please upload the Front side photo of your LPU ID card.');
      return;
    }
    if (!degree) {
      toast.error('Please select your Degree Program.');
      return;
    }
    if (!residence) {
      toast.error('Please select your Campus Residence / Hostel.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const dataToSave = {
        frontImage: idFrontImage,
        degree,
        residence,
        regNo,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString()
      };
      localStorage.setItem('lputrade_id_verification', JSON.stringify(dataToSave));
      setVerificationData(dataToSave);
      setSubmitting(false);
      toast.success('LPU ID card submitted! Fast-track review in progress.', { icon: '🎉' });
    }, 800);
  };

  const handleResetVerification = () => {
    localStorage.removeItem('lputrade_id_verification');
    setVerificationData(null);
    setIdFrontImage(null);
    toast.success('Ready to submit fresh ID document.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Student ID Card Verification
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload the Front Side of your university identity card to earn your verified badge and achieve a 100/100 trust score.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {verificationData?.status === 'SUBMITTED' ? (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Under Fast-Track Review
            </span>
          ) : profile?.id_verified ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full">
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Verification Pending
            </span>
          )}

          {verificationData && (
            <button
              type="button"
              onClick={handleResetVerification}
              className="text-xs text-brand-600 hover:text-brand-700 font-bold hover:underline ml-2"
            >
              Re-upload ID Card
            </button>
          )}
        </div>
      </div>

      {/* Under Review Notice (if submitted) */}
      {verificationData?.status === 'SUBMITTED' && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-md p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 space-y-1">
              <div className="font-extrabold text-sm text-emerald-950">
                Front ID Card Uploaded Successfully!
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Student Reg No: <strong>{verificationData.regNo}</strong> • Department: <strong>{verificationData.degree}</strong> • Residence: <strong>{verificationData.residence}</strong>
              </p>
              <p className="text-emerald-700 text-[11px]">
                Your profile is in the fast-track review queue. You will receive an alert as soon as verification completes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Form on Left & Perks on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Form - 7 cols */}
        <div className="lg:col-span-7 bg-white rounded-md border border-gray-200/90 p-6 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-600" />
              Student ID Card (Front Side Only)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ensure student photo, full name, and registration number are clearly legible.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Front Photo Dropzone */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                Front Side Photo (JPG, PNG, WEBP)
              </label>

              {idFrontImage ? (
                <div className="border-2 border-dashed border-emerald-300 rounded-md p-3 bg-emerald-50/20 flex flex-col items-center">
                  <div className="w-full max-h-56 rounded-md overflow-hidden flex items-center justify-center bg-white border border-gray-200 shadow-xs">
                    <img
                      src={idFrontImage}
                      alt="LPU ID Front Preview"
                      className="max-h-56 w-auto object-contain rounded-md"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIdFrontImage(null)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Remove & Upload Another Photo
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-300 hover:border-brand-500 rounded-md p-8 flex flex-col items-center justify-center cursor-pointer bg-gray-50/40 hover:bg-white transition-all group shadow-2xs">
                  <div className="w-12 h-12 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-gray-800">
                    Click to browse or take ID card photo
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1">
                    Front side only • Clear portrait & details (Max 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Registration Number */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                Registration Number
              </label>
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="e.g. 12414950"
                maxLength={8}
                className="w-full bg-white border border-gray-300 rounded-md px-3.5 py-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none font-medium shadow-xs"
              />
            </div>

            {/* Program / School */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                Program / Department
              </label>
              <select
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-3.5 py-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none font-medium shadow-xs cursor-pointer"
              >
                <option value="" disabled>-- Select Degree Program --</option>
                <option value="B.Tech - Computer Science & Engineering">B.Tech - Computer Science & Engineering</option>
                <option value="B.Tech - Mechanical / Civil / Aerospace">B.Tech - Mechanical / Civil / Aerospace</option>
                <option value="B.Tech - Electronics & Communication">B.Tech - Electronics & Communication</option>
                <option value="MBA / BBA - Mittal School of Business">MBA / BBA - Mittal School of Business</option>
                <option value="B.Des - Fashion & Interior Design">B.Des - Fashion & Interior Design</option>
                <option value="B.Pharm / Biotechnology">B.Pharm / Biotechnology</option>
                <option value="Law / Agriculture / Hotel Management">Law / Agriculture / Hotel Management</option>
                <option value="Other LPU Program">Other LPU Program</option>
              </select>
            </div>

            {/* Residence / Hostel Block */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">
                Campus Residence / Hostel Block
              </label>
              <select
                value={residence}
                onChange={(e) => setResidence(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md px-3.5 py-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none font-medium shadow-xs cursor-pointer"
              >
                <option value="" disabled>-- Select Campus Residence --</option>
                <option value="BH-1 (Boys Hostel)">BH-1 (Boys Hostel)</option>
                <option value="BH-2 (Boys Hostel)">BH-2 (Boys Hostel)</option>
                <option value="BH-3 (Boys Hostel)">BH-3 (Boys Hostel)</option>
                <option value="BH-4 (Boys Hostel)">BH-4 (Boys Hostel)</option>
                <option value="BH-5 (Boys Hostel)">BH-5 (Boys Hostel)</option>
                <option value="BH-6 (Boys Hostel)">BH-6 (Boys Hostel)</option>
                <option value="BH-7 (Boys Hostel)">BH-7 (Boys Hostel)</option>
                <option value="GH-1 to GH-6 (Girls Hostel)">GH-1 to GH-6 (Girls Hostel)</option>
                <option value="Day Scholar (Law Gate / Phagwara / Jalandhar)">Day Scholar (Law Gate / Phagwara / Jalandhar)</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {verificationData ? 'Update ID Verification Submission' : 'Submit Front ID for Verification'}
            </button>
          </form>
        </div>

        {/* Perks & Benefits Sidebar - 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-gradient-to-br from-brand-50/70 via-white to-orange-50/50 border border-brand-200/80 rounded-md p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-brand-800 font-extrabold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Perks of Physical ID Verification
            </div>

            <ul className="space-y-3 text-xs text-gray-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>100/100 Trust Score:</strong> Maximize your trustworthiness among campus hostel mates.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Golden Verified Badge:</strong> Stand out in all marketplace search and explore feeds.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Priority Inquiries:</strong> Receive up to 3x faster replies from genuine LPU student buyers.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-md border border-gray-200/90 p-5 shadow-sm space-y-2">
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-gray-400" />
              Submission Guidelines
            </h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              • Only official Lovely Professional University student ID cards are accepted.
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              • Do not blur or obstruct your student photo or registration barcode.
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              • Images are encrypted and used solely for student authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
