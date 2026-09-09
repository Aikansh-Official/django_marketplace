import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
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
  SlidersHorizontal
} from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';

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

  // Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionType, setTransactionType] = useState('SELL'); // SELL, DONATE
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [condition, setCondition] = useState('GOOD');
  const [location, setLocation] = useState('');
  const [contactPreference, setContactPreference] = useState('ALL');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch categories & user profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await axios.get(`${API_BASE}/marketplace/categories/`);
        setCategories(catRes.data);
        if (catRes.data.length > 0) {
          setCategoryId(catRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
      const token = localStorage.getItem('access');
      if (token) {
        try {
          const profileRes = await axios.get(`${API_BASE}/auth/profile/`);
          setUserProfile(profileRes.data);
          if (profileRes.data.phone_number) {
            setContactPhone(profileRes.data.phone_number);
            setContactWhatsapp(profileRes.data.phone_number);
          }
        } catch (err) {
          console.error('Failed to load profile', err);
        }
      }
    };
    fetchData();
  }, []);

  // Image Upload Handlers — uploads file to Cloudinary via backend
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
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
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file.`);
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 15MB limit.`);
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
        const res = await axios.post(
          `${API_BASE}/marketplace/upload-image/`,
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
        console.error(`Failed to upload ${file.name}`, err);
        const errMsg = err.response?.data?.error || `Failed to upload ${file.name}.`;
        toast.error(errMsg);
      }
    }

    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} image${uploadedCount > 1 ? 's' : ''} uploaded!`);
    }
    setUploading(false);
  };

  const handleAddImageUrl = () => {
    if (!urlInput.trim()) return;
    if (images.length >= 4) {
      toast.error('Maximum 4 images allowed.');
      return;
    }
    setImages((prev) => [...prev, urlInput.trim()]);
    setUrlInput('');
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
    if (transactionType !== 'DONATE' && (!price || Number(price) < 0)) {
      toast.error('Please enter a valid price.');
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

    const payload = {
      title: title.trim(),
      category: categoryId || null,
      transaction_type: transactionType,
      price: transactionType === 'DONATE' ? '0.00' : parseFloat(price).toFixed(2),
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
      const response = await axios.post(
        `${API_BASE}/marketplace/listings/`,
        payload
      );
      toast.success('Listing created successfully!');
      navigate(`/listing/${response.data.id}`);
    } catch (err) {
      console.error('Failed to create listing', err);
      toast.error(err.response?.data?.detail || 'Failed to create listing. Please check required fields.');
    } finally {
      setLoading(false);
    }
  };

  const isSeller = userProfile?.is_id_verified || userProfile?.role === 'SELLER' || userProfile?.is_staff || userProfile?.is_superuser;

  // Gate check: If user is a Buyer without verified ID, prompt them to verify
  if (userProfile && !isSeller) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 animate-fade-in-up">
        <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl rounded-xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="w-20 h-20 bg-brand-50 border-2 border-brand-200 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
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
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <div className="text-brand-600 font-black text-lg mb-1">✓ Unlimited</div>
              <p className="text-xs text-gray-600">List as many campus items or books as you want for free.</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <div className="text-emerald-600 font-black text-lg mb-1">✓ Trust Badge</div>
              <p className="text-xs text-gray-600">Earn the Verified Student badge & boost buyer inquiries.</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <div className="text-blue-600 font-black text-lg mb-1">✓ Instant OCR</div>
              <p className="text-xs text-gray-600">Takes less than 15 seconds to scan and unlock selling.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/profile?tab=id-verification')}
              className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 px-8 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Verify Student ID Now</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-6 rounded-lg transition-all text-sm cursor-pointer"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCategoryObj = categories.find((c) => String(c.id) === String(categoryId));
  const coverImage = images[primaryIndex] || images[0] || '';
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 animate-fade-in-up">
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

            {/* Dropzone & Selector */}
            <div className={`border-2 border-dashed rounded-md p-6 text-center transition-colors bg-gray-50/50 ${uploading ? 'border-brand-400 bg-brand-50/30' : 'border-gray-300 hover:border-brand-500'}`}>
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center gap-2 ${uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
              >
                <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                    {uploading ? 'Uploading photos...' : 'Click to browse photos'}
                  </span>
                  {!uploading && <span className="text-sm text-gray-500"> or drag and drop</span>}
                </div>
                <p className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB each</p>
              </label>
            </div>

            {/* Direct URL Input & Presets */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 flex w-full gap-2">
                <input
                  type="url"
                  placeholder="Or paste an image URL..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-md transition-colors whitespace-nowrap"
                >
                  Add URL
                </button>
              </div>

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
                      src={img}
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
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTransactionType('SELL')}
                  className={`py-3 px-4 rounded-md border text-center text-xs font-bold transition-all ${transactionType === 'SELL'
                      ? 'bg-brand-500 text-white border-brand-500 shadow-md'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Sell (Buy & Sell)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransactionType('DONATE');
                    setPrice('0');
                  }}
                  className={`py-3 px-4 rounded-md border text-center text-xs font-bold transition-all ${transactionType === 'DONATE'
                      ? 'bg-brand-500 text-white border-brand-500 shadow-md'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Donate (Free)
                </button>
              </div>
            </div>

            {/* Price Row */}
            {transactionType !== 'DONATE' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Selling Price (INR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 font-bold">
                      Rs
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="e.g. 1200"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white outline-none transition-all"
                    />
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
              </div>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-xs text-green-800 font-medium">
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
              disabled={loading}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-md transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Publishing...
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
                <img
                  src={coverImage}
                  alt={title || 'Product Preview'}
                  className="w-full h-full object-cover"
                />

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
    </div>
  );
}
