import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { compressImage } from '../utils/compressImage';
import {
  UploadCloud,
  X,
  Star,
  Tag,
  IndianRupee,
  MapPin,
  Phone,
  MessageSquare,
  Sparkles,
  Info,
  Check,
  ChevronRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Repeat,
  Camera,
  AlertTriangle,
  Lock,
  ShieldAlert,
  TrendingUp,
  Clock
} from 'lucide-react';
import api, { getPlatformConfig, getCategories } from '../services/api';
import CategoryIcon from '../components/CategoryIcon';
import UpgradeToSellerModal from '../components/profile/UpgradeToSellerModal';
import LivePhotoModal from '../components/common/LivePhotoModal';
import { getSafeImageUrl } from '../utils/imageUrl';

const CONDITIONS = [
  { value: 'NEW', label: 'Brand New', desc: 'Unopened / with original tags' },
  { value: 'LIKE_NEW', label: 'Like New', desc: 'Barely used, flawless condition' },
  { value: 'GOOD', label: 'Good', desc: 'Gently used, fully functional' },
  { value: 'FAIR', label: 'Fair', desc: 'Visible wear, works fine' },
  { value: 'POOR', label: 'For Parts / Poor', desc: 'Needs repair or for parts' },
];

const CONTACT_PREFERENCES = [
  { value: 'ALL', label: 'All Channels', desc: 'In-app Chat, WhatsApp & Phone Call' },
  { value: 'WHATSAPP', label: 'WhatsApp Preferred', desc: 'Buyer contacts directly via WhatsApp' },
  { value: 'CALL', label: 'Phone Call Preferred', desc: 'Direct voice calls' },
  { value: 'CHAT', label: 'In-App Chat Only', desc: 'Keeps your phone number private' },
  { value: 'MEETUP', label: 'Campus Meetup Only', desc: 'Coordinate spot on campus' },
];

export default function CreateListing() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionType, setTransactionType] = useState('SELL'); // SELL, EXCHANGE, DONATE
  const [isExchangeAllowed, setIsExchangeAllowed] = useState(false);
  const [exchangePreferences, setExchangePreferences] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [hasSaleTimer, setHasSaleTimer] = useState(false);
  const [saleDuration, setSaleDuration] = useState('24h'); // '12h', '24h', '48h', '3d', '7d', 'custom'
  const [customSaleEndTime, setCustomSaleEndTime] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [condition, setCondition] = useState('GOOD');
  const [location, setLocation] = useState('');
  const [contactPreference, setContactPreference] = useState('ALL');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [platformConfig, setPlatformConfig] = useState(null);
  const [activeListingsCount, setActiveListingsCount] = useState(0);

  const calculateSaleEndTime = () => {
    if (!hasSaleTimer) return null;
    if (saleDuration === 'custom') {
      return customSaleEndTime ? new Date(customSaleEndTime).toISOString() : null;
    }
    const now = new Date();
    if (saleDuration === '12h') now.setHours(now.getHours() + 12);
    else if (saleDuration === '24h') now.setHours(now.getHours() + 24);
    else if (saleDuration === '48h') now.setHours(now.getHours() + 48);
    else if (saleDuration === '3d') now.setDate(now.getDate() + 3);
    else if (saleDuration === '7d') now.setDate(now.getDate() + 7);
    return now.toISOString();
  };

  const calculatedDiscount = React.useMemo(() => {
    const orig = parseFloat(originalPrice);
    const curr = parseFloat(price);
    if (orig && curr && orig > curr && curr > 0) {
      return Math.round(((orig - curr) / orig) * 100);
    }
    return 0;
  }, [originalPrice, price]);

  // Fetch categories, user profile & platform config
  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch categories (cached)
      try {
        const catData = await getCategories();
        setCategories(catData);
        if (catData.length > 0) {
          setCategoryId(catData[0].id);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }

      // 2. Fetch platform operational constraints
      try {
        const config = await getPlatformConfig();
        setPlatformConfig(config);
      } catch (err) {
        console.error('Failed to load platform config', err);
      }

      // 3. Fetch user profile & active listings count
      const token = localStorage.getItem('access');
      if (token) {
        try {
          const profileRes = await api.get('/auth/profile/');
          setUserProfile(profileRes.data);
          if (profileRes.data.phone_number) {
            setContactPhone(profileRes.data.phone_number);
            setContactWhatsapp(profileRes.data.phone_number);
          }
        } catch (err) {
          console.error('Failed to load profile', err);
        }

        try {
          const myListingsRes = await api.get('/marketplace/my-listings/?status=ACTIVE');
          if (Array.isArray(myListingsRes.data)) {
            setActiveListingsCount(myListingsRes.data.length);
          }
        } catch (err) {
          // ignore
        }
      }
    };
    fetchData();
  }, []);

  // Image Upload Handlers — uploads file to Cloudinary via backend
  const uploadImageFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    if (images.length + files.length > 4) {
      toast.error('You can upload up to 4 images maximum.');
      return;
    }

    const token = localStorage.getItem('access');
    if (!token) {
      toast.error('Please login to upload images.');
      return;
    }

    setUploading(true);
    let uploadedCount = 0;

    for (const file of files) {
      if (!file.type || !file.type.startsWith('image/')) {
        toast.error(`${file.name || 'File'} is not an image file.`);
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name || 'File'} exceeds 15MB limit.`);
        continue;
      }

      // Compress large images before uploading
      const compressed = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.75,
        maxSizeKB: 500,
      });

      const formData = new FormData();
      formData.append('image', compressed);

      try {
        const res = await api.post(
          '/marketplace/upload-image/',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        setImages((prev) => [...prev, res.data.url]);
        uploadedCount++;
      } catch (err) {
        console.error(`Failed to upload ${file.name || 'image'}`, err);
        const errMsg = err.response?.data?.error || `Failed to upload ${file.name || 'image'}.`;
        toast.error(errMsg);
      }
    }

    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} image${uploadedCount > 1 ? 's' : ''} uploaded!`);
    }
    setUploading(false);
  };

  const handleFileUpload = (e) => {
    if (e.target && e.target.files) {
      uploadImageFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleCameraPhotoCaptured = (file) => {
    uploadImageFiles([file]);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (primaryIndex === index) {
      setPrimaryIndex(0);
    } else if (primaryIndex > index) {
      setPrimaryIndex((prev) => prev - 1);
    }
  };



  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a product title.');
      return;
    }
    if (!categoryId) {
      toast.error('Please select a category for your item.');
      return;
    }
    if (images.length === 0) {
      toast.error('Please add at least 1 real photo of your item.');
      return;
    }
    if (uploading) {
      toast.error('Please wait for photos to finish uploading.');
      return;
    }
    if (transactionType === 'SELL' && (!price || Number(price) <= 0)) {
      toast.error('Please enter a valid selling price.');
      return;
    }
    if (transactionType === 'EXCHANGE' && !exchangePreferences.trim()) {
      toast.error('Please specify what item or gear you want in exchange.');
      return;
    }
    if (!location.trim()) {
      toast.error('Please specify a campus location.');
      return;
    }
    if (!description.trim()) {
      toast.error('Please provide a short description.');
      return;
    }

    setLoading(true);

    const isExchange = transactionType === 'EXCHANGE' || isExchangeAllowed;
    const computedPrice = transactionType === 'DONATE'
      ? '0.00'
      : transactionType === 'EXCHANGE'
        ? (price ? parseFloat(price).toFixed(2) : '0.00')
        : parseFloat(price).toFixed(2);

    const payload = {
      title: title.trim(),
      category: categoryId || null,
      transaction_type: transactionType,
      is_exchange_allowed: isExchange,
      exchange_preferences: isExchange ? exchangePreferences.trim() : '',
      price: computedPrice,
      original_price: (transactionType === 'SELL' && originalPrice) ? parseFloat(originalPrice).toFixed(2) : null,
      sale_end_time: (transactionType === 'SELL' && hasSaleTimer) ? calculateSaleEndTime() : null,
      is_negotiable: transactionType === 'DONATE' ? false : isNegotiable,
      condition,
      location: location.trim(),
      contact_preference: contactPreference,
      contact_phone: contactPhone.trim(),
      contact_whatsapp: contactWhatsapp.trim(),
      description: description.trim(),
      status: 'ACTIVE',
      uploaded_images: images,
      primary_image_index: primaryIndex
    };

    try {
      const response = await api.post(
        '/marketplace/listings/',
        payload
      );
      const createdId = response.data?.id || response.data?._id;
      toast.success('Listing created successfully!');
      if (createdId) {
        navigate(`/listing/${createdId}`);
      } else {
        navigate('/my-listings');
      }
    } catch (err) {
      console.error('Failed to create listing', err);
      const data = err.response?.data;
      let errMsg = 'Failed to create listing. Please check required fields.';
      if (typeof data === 'string') errMsg = data;
      else if (data?.detail) errMsg = data.detail;
      else if (data?.error) errMsg = data.error;
      else if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          const val = data[firstKey];
          errMsg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
        }
      }
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const isSeller = Boolean(
    userProfile && (
      userProfile.is_staff ||
      userProfile.is_superuser ||
      (userProfile.role === 'SELLER' && userProfile.is_id_verified)
    )
  );

  // Gate check: If user is a Buyer without verified ID, prompt them to verify
  if (userProfile && !isSeller) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 animate-fade-in-up">
        <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl rounded-md p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="w-20 h-20 bg-brand-50 border-2 border-brand-200 text-brand-600 rounded-md flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldCheck className="w-10 h-10 text-brand-600" />
          </div>

          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider rounded-full mb-3">
            Seller Verification Required
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Become a Verified Seller
          </h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-lg mx-auto mt-3 leading-relaxed">
            Your account is currently registered as a <strong>Buyer</strong>. To protect the campus community from scams and ensure 100% genuine peer deals, sellers must verify their physical Student ID card.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8 text-left max-w-xl mx-auto">
            <div className="bg-gray-50 border border-gray-100 rounded-md p-4">
              <div className="text-brand-600 font-black text-lg mb-1">✓ Unlimited</div>
              <p className="text-xs text-gray-600">List as many campus items or books as you want for free.</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-md p-4">
              <div className="text-emerald-600 font-black text-lg mb-1">✓ Trust Badge</div>
              <p className="text-xs text-gray-600">Earn the Verified Student badge & boost buyer inquiries.</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-md p-4">
              <div className="text-blue-600 font-black text-lg mb-1">✓ Instant OCR</div>
              <p className="text-xs text-gray-600">Takes less than 15 seconds to scan and unlock selling.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 px-8 rounded-md shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Verify Student ID & Start Selling</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-6 rounded-md transition-all text-sm cursor-pointer"
            >
              Back to Marketplace
            </button>
          </div>

          <UpgradeToSellerModal
            isOpen={isUpgradeModalOpen}
            onClose={() => setIsUpgradeModalOpen(false)}
            profile={userProfile}
            onUpgradeSuccess={(upgradedUser) => {
              setUserProfile(upgradedUser);
              setIsUpgradeModalOpen(false);
            }}
          />
        </div>
      </div>
    );
  }

  const minScore = platformConfig?.min_trust_score_to_sell ?? 0;
  const isScoreTooLow = Boolean(
    userProfile &&
    minScore > 0 &&
    (userProfile.trust_score || 0) < minScore &&
    !userProfile.is_staff &&
    !userProfile.is_superuser
  );

  if (userProfile && isSeller && isScoreTooLow) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 animate-fade-in-up">
        <div className="bg-white/95 backdrop-blur-md border border-amber-200 shadow-xl rounded-md p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 text-amber-600 rounded-md flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock className="w-10 h-10 text-amber-600" />
          </div>

          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider rounded-full mb-3">
            Minimum Trust Score Requirement
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Trust Score {minScore} Required to Sell
          </h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-lg mx-auto mt-3 leading-relaxed">
            Campus safety policies require a minimum Trust Score of <strong>{minScore}</strong> to post active listings. Your current trust score is <span className="font-bold text-amber-600">{userProfile.trust_score || 0}</span>.
          </p>

          <div className="bg-amber-50/70 border border-amber-200 rounded-md p-4 max-w-md mx-auto my-6 text-left text-xs text-amber-900 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Ways to boost your campus trust score:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
              <li>Upload and verify your physical Student ID card (+15 Trust Points).</li>
              <li>Complete real-time face liveness verification (+5 Trust Points).</li>
              <li>Successfully complete verified QR handovers (+5 Trust Points per trade).</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/profile?tab=id-verification')}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-8 rounded-md shadow-md transition-all text-sm cursor-pointer"
            >
              Verify Profile & Boost Trust
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-6 rounded-md transition-all text-sm cursor-pointer"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxLimit = platformConfig?.max_active_listings_per_student ?? 10;
  const isQuotaReached = Boolean(
    activeListingsCount >= maxLimit &&
    !userProfile?.is_staff &&
    !userProfile?.is_superuser
  );

  const PROHIBITED_WORDS = ['vape', 'alcohol', 'beer', 'whiskey', 'weed', 'cannabis', 'weapon', 'knife', 'gun', 'cheat', 'exam paper', 'fake id', 'porn', 'cigarette', 'hookah'];
  const detectedProhibitedWords = PROHIBITED_WORDS.filter((w) =>
    (title && title.toLowerCase().includes(w)) || (description && description.toLowerCase().includes(w))
  );

  const selectedCategoryObj = categories.find((c) => String(c.id) === String(categoryId));
  const coverImage = images[primaryIndex] || images[0] || '';
  return (
    <div className="w-full px-4 sm:px-6 lg:px-[5%] py-5 sm:py-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Post a Listing
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Sell or donate items to verified students across LPU Campus.
          </p>
        </div>
      </div>

      {/* Active Listings Quota & Trust Score Header Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className={`p-4 rounded-md border flex items-center justify-between ${isQuotaReached
          ? 'bg-red-50 border-red-300 text-red-900'
          : 'bg-white/90 border-gray-200 text-gray-800 shadow-sm'
          }`}>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Active Listings Quota
            </div>
            <div className="text-sm font-extrabold mt-0.5">
              {activeListingsCount} of {maxLimit} Active Listings
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isQuotaReached
            ? 'bg-red-200 text-red-800'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
            {isQuotaReached ? 'Limit Reached' : `${maxLimit - activeListingsCount} Slots Available`}
          </span>
        </div>

        <div className="p-4 rounded-md border bg-white/90 border-gray-200 text-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Your Campus Trust Score
            </div>
            <div className="text-sm font-extrabold text-emerald-600 mt-0.5">
              {userProfile?.trust_score ?? 100} / 100 Score
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Trader
          </span>
        </div>
      </div>

      {isQuotaReached && (
        <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm mb-0.5">Active Listings Limit Reached ({maxLimit})</p>
            <p>To keep the campus marketplace fresh, each student can maintain up to {maxLimit} active listings simultaneously. Please go to <button type="button" onClick={() => navigate('/my-listings')} className="underline font-semibold">My Listings</button> to mark sold items or delete inactive listings.</p>
          </div>
        </div>
      )}

      {detectedProhibitedWords.length > 0 && (
        <div className="mb-6 p-3.5 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Prohibited Content Warning:</span> Your text includes "{detectedProhibitedWords.join(', ')}". Items under campus restricted categories are automatically flagged and hidden by moderation.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left / Main Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6 sm:space-y-8">

          {/* Section 1: Photos */}
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-md p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-brand-500" />
                  Upload Product Photos
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add up to 4 real photos of your item. First photo will be the main cover.
                </p>
              </div>
              <span className="text-xs font-bold text-gray-400">
                {images.length}/4 Photos
              </span>
            </div>

            {/* Anti-Fraud Notice: URLs Disabled */}
            <div className="mb-4 bg-amber-50/90 border border-amber-200 rounded-md p-3 flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Real Product Photos Only:</span> Direct web image URLs are permanently disabled to prevent fake products and stock images. Please upload genuine pictures from your device or snap a photo directly using your camera.
              </div>
            </div>

            {/* Dual Action: Upload from Gallery vs Take Live Photo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3">
              {/* Option 1: Upload from Gallery / Files */}
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading || images.length >= 4}
              />
              <label
                htmlFor="file-upload"
                className={`group relative flex flex-col items-center justify-center p-5 rounded-md border-2 border-dashed transition-all text-center select-none ${uploading || images.length >= 4
                  ? 'border-gray-200 bg-gray-50/70 text-gray-400 cursor-not-allowed opacity-60'
                  : 'border-gray-300 hover:border-brand-500 bg-white hover:bg-brand-50/20 cursor-pointer shadow-sm hover:shadow active:scale-[0.99]'
                  }`}
              >
                <div className="w-12 h-12 rounded-full bg-brand-50 group-hover:bg-brand-100 text-brand-600 flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>
                <div className="font-bold text-sm text-gray-900 group-hover:text-brand-600">
                  {uploading ? 'Uploading photos...' : 'Upload from Device'}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Browse phone gallery or computer files
                </p>
                <span className="mt-2.5 inline-flex items-center text-[10px] font-semibold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                  Select Files
                </span>
              </label>

              {/* Option 2: Snap Live Photo via Camera */}
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                disabled={uploading || images.length >= 4}
                className={`group relative flex flex-col items-center justify-center p-5 rounded-md border-2 border-dashed transition-all text-center select-none ${uploading || images.length >= 4
                  ? 'border-gray-200 bg-gray-50/70 text-gray-400 cursor-not-allowed opacity-60'
                  : 'border-orange-300 hover:border-orange-500 bg-orange-50/30 hover:bg-orange-50/70 cursor-pointer shadow-sm hover:shadow active:scale-[0.99]'
                  }`}
              >
                <div className="w-12 h-12 rounded-full bg-orange-100 group-hover:bg-orange-200 text-orange-600 flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm text-gray-900 group-hover:text-orange-600 flex items-center gap-1.5">
                  Take Live Photo
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Snap real-time photo using phone or laptop camera
                </p>
                <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200">
                  <Camera className="w-3 h-3" />
                  Open Camera
                </span>
              </button>
            </div>

            {/* Thumbnail Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-md overflow-hidden border-2 transition-all group aspect-square bg-gray-100 flex items-center justify-center ${primaryIndex === idx ? 'border-brand-500 ring-2 ring-brand-200' : 'border-gray-200'
                      }`}
                  >
                    <img
                      src={getSafeImageUrl(img)}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Primary Badge */}
                    {primaryIndex === idx ? (
                      <span className="absolute top-2 left-2 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        Cover Photo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPrimaryIndex(idx)}
                        className="absolute top-2 left-2 bg-black/60 hover:bg-black/80 text-white text-[10px] font-medium px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Set as Cover
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Title & Category */}
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-md p-4 sm:p-6 space-y-5 sm:space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Product Title <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Mention key brand, model, semester, or edition details (e.g. "Hero Sprint 21-Speed Gear Cycle").
              </p>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Higher Engineering Mathematics - BS Grewal (44th Ed)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white outline-none transition-all"
              />
              <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1">
                <span>Keep it short and descriptive</span>
                <span>{title.length}/100</span>
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {categories.map((cat) => {
                  const isSelected = String(categoryId) === String(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-md border text-left transition-all ${isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-800 font-bold shadow-sm'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/80 text-gray-700 font-medium'
                        }`}
                    >
                      <CategoryIcon
                        name={cat.icon}
                        slug={cat.slug}
                        className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-brand-600' : 'text-gray-500'}`}
                      />
                      <span className="text-xs truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Transaction Type, Price & Condition */}
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-md p-4 sm:p-6 space-y-5 sm:space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Transaction Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTransactionType('SELL')}
                  className={`py-3 px-3 rounded-md border text-center transition-all flex flex-col items-center justify-center gap-1 ${transactionType === 'SELL'
                    ? 'bg-brand-500 text-white border-brand-500 shadow-md font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold'
                    }`}
                >
                  <span className="text-xs">Sell (Cash)</span>
                  <span className={`text-[10px] ${transactionType === 'SELL' ? 'text-white/80' : 'text-gray-400'}`}>Standard cash sale</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('EXCHANGE')}
                  className={`py-3 px-3 rounded-md border text-center transition-all flex flex-col items-center justify-center gap-1 ${transactionType === 'EXCHANGE'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold'
                    }`}
                >
                  <span className="text-xs">Exchange / Swap</span>
                  <span className={`text-[10px] ${transactionType === 'EXCHANGE' ? 'text-white/80' : 'text-gray-400'}`}>Trade for other items</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTransactionType('DONATE');
                    setPrice('0');
                  }}
                  className={`py-3 px-3 rounded-md border text-center transition-all flex flex-col items-center justify-center gap-1 ${transactionType === 'DONATE'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold'
                    }`}
                >
                  <span className="text-xs">Donate (Free)</span>
                  <span className={`text-[10px] ${transactionType === 'DONATE' ? 'text-white/80' : 'text-gray-400'}`}>Giveaway to peers</span>
                </button>
              </div>
            </div>

            {/* Price & Exchange Preference Details */}
            {transactionType === 'SELL' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Selling Price (INR) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        required
                        min="1"
                        step="1"
                        placeholder="e.g. 1200"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-md pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-bold text-gray-900">
                        Original / MRP Price (Optional)
                      </label>
                      {calculatedDiscount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-200">
                          {calculatedDiscount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 1600 (original MRP)"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-md pl-12 pr-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3.5 bg-gray-50 border border-gray-200 rounded-md">
                  <input
                    type="checkbox"
                    id="negotiable"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    className="w-4 h-4 text-brand-500 rounded border-gray-300 focus:ring-brand-500"
                  />
                  <label htmlFor="negotiable" className="text-xs font-medium text-gray-700 select-none cursor-pointer">
                    Price is negotiable
                  </label>
                </div>

                {/* Limited Time Sale / Deal Countdown Timer */}
                <div className="p-4 rounded-md border border-amber-200 bg-amber-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-950">Add Limited-Time Sale Countdown Timer</div>
                        <div className="text-[11px] text-amber-800">Shows an active countdown badge on the product card to boost buyers' urgency</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasSaleTimer}
                        onChange={(e) => setHasSaleTimer(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {hasSaleTimer && (
                    <div className="pt-3 border-t border-amber-200/70 space-y-2.5 animate-in fade-in">
                      <label className="block text-xs font-bold text-amber-950">
                        Sale Ends In:
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { id: '12h', label: '12 Hours' },
                          { id: '24h', label: '24 Hours' },
                          { id: '48h', label: '48 Hours' },
                          { id: '3d', label: '3 Days' },
                          { id: '7d', label: '7 Days' },
                          { id: 'custom', label: 'Custom' },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSaleDuration(preset.id)}
                            className={`py-2 px-1.5 rounded-md border text-center text-xs font-bold transition-all ${
                              saleDuration === preset.id
                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100/50'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {saleDuration === 'custom' && (
                        <div className="pt-2">
                          <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                            Pick Custom End Date & Time:
                          </label>
                          <input
                            type="datetime-local"
                            value={customSaleEndTime}
                            onChange={(e) => setCustomSaleEndTime(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                            className="bg-white border border-amber-300 rounded-md px-3 py-2 text-xs text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none w-full sm:w-auto"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Optional Exchange / Barter Toggle for Cash Sellers */}
                <div className="p-3.5 rounded-md border border-dashed border-indigo-200 bg-indigo-50/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-950">Also open to item exchange / swap?</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isExchangeAllowed}
                        onChange={(e) => setIsExchangeAllowed(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  {isExchangeAllowed && (
                    <div className="pt-2 border-t border-indigo-100 animate-in fade-in">
                      <label className="block text-xs font-bold text-indigo-950 mb-1">
                        What items would you trade this for? (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Open to trade for 4th Sem CSE books, scientific calculator, or cycle"
                        value={exchangePreferences}
                        onChange={(e) => setExchangePreferences(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-md px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : transactionType === 'EXCHANGE' ? (
              <div className="space-y-4 p-4 rounded-md border border-indigo-200 bg-indigo-50/40">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">Campus Item Exchange / Barter</h4>
                    <p className="text-[11px] text-indigo-800">
                      Trade your item with fellow students without cash. Specify what you are looking for in return.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">
                    What item(s) do you want in return? <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4th Sem CSE Books, Casio FX-991EX, Atlas Cycle, or Wireless Keyboard"
                    value={exchangePreferences}
                    onChange={(e) => setExchangePreferences(e.target.value)}
                    className="w-full bg-white border border-indigo-300 rounded-md px-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Estimated Item Value in INR (Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs font-bold">
                        Rs
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 1500 (helps peers find a fair match)"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 pb-1">
                    💡 An estimated value helps other students offer items of comparable value.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-green-50 border border-green-200 rounded-md flex items-center gap-2.5 text-xs text-green-800 font-medium">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                This item will be listed for free to support peer students.
              </div>
            )}

            {/* Condition Choices */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Item Condition <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CONDITIONS.map((cond) => {
                  const isSelected = condition === cond.value;
                  return (
                    <button
                      key={cond.value}
                      type="button"
                      onClick={() => setCondition(cond.value)}
                      className={`p-3 rounded-md border text-left transition-all ${isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-500'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                      <div className="text-xs font-bold">{cond.label}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{cond.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Location & Contact Preferences */}
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-md p-4 sm:p-6 space-y-5 sm:space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Campus Location <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select your hostel or campus block for convenient student pickup.
              </p>
              {/* Location Input */}
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. BH-4, Room 312 or Block 34 (CS Dept)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            {/* Seller Contact Preference */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Buyer Contact Preference
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                {CONTACT_PREFERENCES.map((pref) => {
                  const isSelected = contactPreference === pref.value;
                  return (
                    <button
                      key={pref.value}
                      type="button"
                      onClick={() => setContactPreference(pref.value)}
                      className={`p-3 rounded-md border text-left transition-all ${isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-500'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                      <div className="text-xs font-bold">{pref.label}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{pref.desc}</div>
                    </button>
                  );
                })}
              </div>

              {contactPreference !== 'CHAT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      WhatsApp Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={contactWhatsapp}
                      onChange={(e) => setContactWhatsapp(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Detailed Description */}
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-sm rounded-md p-4 sm:p-6">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-bold text-gray-900">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400">{description.length}/1000</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Mention usage period, any included accessories, course codes, or reason for selling.
            </p>
            <textarea
              required
              rows={5}
              maxLength={1000}
              placeholder="Describe what's included, any minor defects, when and where you can meet on campus..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md p-3 text-sm font-normal focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-3 px-6 rounded-md transition-all text-sm text-center justify-center flex items-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading || isQuotaReached}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isQuotaReached ? (
                <>
                  <Lock className="w-4 h-4" />
                  Listing Quota Reached
                </>
              ) : loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Publishing Listing...
                </>
              ) : uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading Photos...
                </>
              ) : (
                <>
                  Publish Listing
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Sticky Column: Real-Time Marketplace Card Preview */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-brand-500" />
                Live Card Preview
              </span>
              <span className="text-[11px] font-medium text-gray-400">
                How buyers will see it
              </span>
            </div>

            {/* Preview Card Component */}
            <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-lg transition-all">
              <div className="relative h-52 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {coverImage ? (
                  <img
                    src={getSafeImageUrl(coverImage)}
                    alt={title || 'Product Preview'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 gap-2 p-4 text-center">
                    <UploadCloud className="w-8 h-8 opacity-40 text-brand-500" />
                    <span className="text-xs font-semibold text-gray-500">Product Preview</span>
                    <span className="text-[10px] text-gray-400">Photos will appear here</span>
                  </div>
                )}

                {/* Transaction Badge */}
                {transactionType === 'DONATE' && (
                  <div className="absolute top-3 left-3 bg-green-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                    FREE DONATION
                  </div>
                )}

                {/* Condition Badge */}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {CONDITIONS.find((c) => c.value === condition)?.label}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-2xl font-extrabold text-gray-900">
                    {transactionType === 'DONATE' ? 'Free' : `Rs ${price || '0'}`}
                  </span>
                  {transactionType === 'SELL' && isNegotiable && (
                    <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                      Negotiable
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-sm text-gray-800 line-clamp-2 mb-2">
                  {title || 'Your product title will appear here'}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                  <CategoryIcon
                    name={selectedCategoryObj?.icon}
                    slug={selectedCategoryObj?.slug}
                    className="w-3.5 h-3.5 text-gray-400"
                  />
                  <span>{selectedCategoryObj?.name || 'Category'}</span>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1 truncate max-w-[70%]">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{location || 'LPU Campus'}</span>
                  </div>
                  <span className="font-semibold text-[10px] uppercase text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                    JUST NOW
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-md p-4 text-xs text-amber-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-700" />
                Tips for fast responses
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                <li>Upload multiple clear angles with good lighting.</li>
                <li>Set a realistic price comparing with campus peers.</li>
                <li>Specify exact hostel block for easy handoff.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Live Camera Photo Modal */}
      {isCameraOpen && (
        <LivePhotoModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onPhotoCaptured={handleCameraPhotoCaptured}
        />
      )}
    </div>
  );
}
