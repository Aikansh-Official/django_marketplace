import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { compressImage } from '../utils/compressImage';
import {
  UploadCloud,
  X,
  IndianRupee,
  MapPin,
  Phone,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Check,
  Tag,
  AlertCircle,
  AlertTriangle,
  Repeat,
  Camera,
  Clock
} from 'lucide-react';
import api, { getCategories } from '../services/api';
import CategoryIcon from '../components/CategoryIcon';
import LivePhotoModal from '../components/common/LivePhotoModal';
import { getSafeImageUrl } from '../utils/imageUrl';

const LPU_LOCATIONS = [
  'BH-1', 'BH-2', 'BH-3', 'BH-4', 'BH-5', 'BH-6', 'BH-7', 'BH-8',
  'GH-1', 'GH-2', 'GH-3', 'GH-4', 'GH-5', 'GH-6',
  'Block 34', 'Block 36', 'Block 38', 'Central Library',
  'Uni-Mall', 'Law Gate', 'Main Gate', 'Green Valley'
];

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

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionType, setTransactionType] = useState('SELL');
  const [isExchangeAllowed, setIsExchangeAllowed] = useState(false);
  const [exchangePreferences, setExchangePreferences] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [hasSaleTimer, setHasSaleTimer] = useState(false);
  const [saleDuration, setSaleDuration] = useState('24h');
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
  const [status, setStatus] = useState('ACTIVE');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

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

  // Fetch listing data and categories
  useEffect(() => {
    const fetchData = async () => {
      setFetching(true);
      try {
        const catData = await getCategories();
        setCategories(catData);

        const listingRes = await api.get(
          `/marketplace/listings/${id}/`
        );

        const data = listingRes.data;
        if (data.status === 'SOLD') {
          toast.error('This item is marked as Sold and cannot be edited.');
          navigate(`/listing/${id}`, { replace: true });
          return;
        }
        if (data.is_seller === false) {
          toast.error('You do not have permission to edit this listing.');
          navigate(`/listing/${id}`, { replace: true });
          return;
        }

        setTitle(data.title || '');
        setCategoryId(data.category?.id || '');
        setTransactionType(data.transaction_type || 'SELL');
        setIsExchangeAllowed(Boolean(data.is_exchange_allowed));
        setExchangePreferences(data.exchange_preferences || '');
        setPrice(data.price ? String(Math.round(data.price)) : '');
        setOriginalPrice(data.original_price ? String(Math.round(data.original_price)) : '');
        if (data.sale_end_time && new Date(data.sale_end_time) > new Date()) {
          setHasSaleTimer(true);
          setSaleDuration('custom');
          const d = new Date(data.sale_end_time);
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setCustomSaleEndTime(localIso);
        } else {
          setHasSaleTimer(false);
        }
        setIsNegotiable(data.is_negotiable ?? true);
        setCondition(data.condition || 'GOOD');
        setLocation(data.location || '');
        setContactPreference(data.contact_preference || 'ALL');
        setContactPhone(data.contact_phone || '');
        setContactWhatsapp(data.contact_whatsapp || '');
        setDescription(data.description || '');
        setStatus(data.status || 'ACTIVE');

        if (data.images && data.images.length > 0) {
          const imgUrls = data.images.map((img) => img.raw_url || img.image_url);
          setImages(imgUrls);
          const primIdx = data.images.findIndex((img) => img.is_primary);
          setPrimaryIndex(primIdx >= 0 ? primIdx : 0);
        }
      } catch (err) {
        console.error('Failed to load listing for editing', err);
        toast.error('Listing not found or failed to load.');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id]);

  // Image Handlers — uploads file to Cloudinary via backend
  const [uploading, setUploading] = useState(false);

  const uploadImageFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    if (images.length + files.length > 4) {
      toast.error('Maximum 4 images allowed.');
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
        toast.error(`${file.name || 'File'} is not an image.`);
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

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a product title.');
      return;
    }
    if (images.length === 0) {
      toast.error('A listing must have at least 1 product photo.');
      return;
    }
    if (uploading) {
      toast.error('Please wait for photos to finish uploading.');
      return;
    }
    if (transactionType === 'SELL' && (!price || Number(price) <= 0)) {
      toast.error('Please enter a valid price.');
      return;
    }
    if (transactionType === 'EXCHANGE' && !exchangePreferences.trim()) {
      toast.error('Please specify what item you want in exchange.');
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
      status,
      uploaded_images: images,
      primary_image_index: primaryIndex
    };

    try {
      await api.patch(
        `/marketplace/listings/${id}/`,
        payload
      );
      toast.success('Listing updated successfully!');
      navigate(`/listing/${id}`);
    } catch (err) {
      console.error('Failed to update listing', err);
      const data = err.response?.data;
      let errMsg = 'Failed to update listing.';
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

  if (fetching) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-[5%] py-5 sm:py-8 animate-fade-in-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-gray-200">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Listing
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Edit Listing
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Update pricing, photos, or details of your product.
          </p>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-gray-600">Status:</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ACTIVE">Active (Visible)</option>
            <option value="PENDING">Reserved (In Progress)</option>
            <option value="SOLD">Sold</option>
            <option value="HIDDEN">Hidden (Archived)</option>
          </select>
        </div>
      </div>

      {(() => {
        const PROHIBITED_WORDS = ['vape', 'alcohol', 'beer', 'whiskey', 'weed', 'cannabis', 'weapon', 'knife', 'gun', 'cheat', 'exam paper', 'fake id', 'porn', 'cigarette', 'hookah'];
        const detected = PROHIBITED_WORDS.filter((w) =>
          (title && title.toLowerCase().includes(w)) || (description && description.toLowerCase().includes(w))
        );
        if (detected.length === 0) return null;
        return (
          <div className="mb-6 p-3.5 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Prohibited Content Warning:</span> Your text includes "{detected.join(', ')}". Items under campus restricted categories are automatically flagged and hidden by moderation.
            </div>
          </div>
        );
      })()}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos Box */}
        <div className="bg-white border border-gray-200 rounded-md p-4 sm:p-6 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-2">
              Product Photos ({images.length}/4)
            </h2>
          </div>

          {/* Anti-Fraud Notice */}
          <div className="mb-3 bg-amber-50/90 border border-amber-200 rounded-md p-2.5 flex items-start gap-2 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Real Photos Only:</span> Direct web URLs are disabled to avoid fake listings. Upload genuine pictures or snap a photo directly using your camera.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              type="file"
              id="edit-file-upload"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading || images.length >= 4}
            />
            <label
              htmlFor="edit-file-upload"
              className={`border border-brand-200 text-brand-700 text-xs font-semibold px-4 py-2.5 rounded-md transition-colors inline-flex items-center justify-center gap-1.5 ${
                uploading || images.length >= 4
                  ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60 pointer-events-none'
                  : 'cursor-pointer bg-brand-50 hover:bg-brand-100 shadow-sm'
              }`}
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              {uploading ? 'Uploading...' : 'Upload from Device'}
            </label>

            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              disabled={uploading || images.length >= 4}
              className={`border border-orange-200 text-orange-700 text-xs font-semibold px-4 py-2.5 rounded-md transition-colors inline-flex items-center justify-center gap-1.5 ${
                uploading || images.length >= 4
                  ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60 pointer-events-none'
                  : 'cursor-pointer bg-orange-50 hover:bg-orange-100 shadow-sm'
              }`}
            >
              <Camera className="w-4 h-4 text-orange-600" />
              Take Live Photo
            </button>

            {/* Mobile Camera Shortcut */}
            <input
              type="file"
              id="edit-mobile-camera"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading || images.length >= 4}
            />
            <label
              htmlFor="edit-mobile-camera"
              className={`text-[11px] font-medium text-gray-500 hover:text-brand-600 hover:underline inline-flex items-center gap-1 ml-auto ${
                uploading || images.length >= 4 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Phone Camera
            </label>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-md overflow-hidden border-2 aspect-square bg-gray-100 group ${
                    primaryIndex === idx ? 'border-brand-500 ring-2 ring-brand-200' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={getSafeImageUrl(img)}
                    alt={`Thumb ${idx}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {primaryIndex === idx ? (
                    <span className="absolute top-2 left-2 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPrimaryIndex(idx)}
                      className="absolute top-2 left-2 bg-black/70 hover:bg-black/90 text-white text-[10px] font-medium px-2 py-1 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                    >
                      Set Cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm z-10 cursor-pointer"
                    title="Remove image"
                    aria-label="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Title & Category */}
        <div className="bg-white border border-gray-200 rounded-md p-4 sm:p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-2">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const isSelected = String(categoryId) === String(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-md border text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-800 font-bold'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
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

        {/* Transaction Mode & Price */}
        <div className="bg-white border border-gray-200 rounded-md p-4 sm:p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'SELL', label: '💰 Sell', desc: 'Cash sale' },
              { id: 'EXCHANGE', label: '🔄 Exchange', desc: 'Item swap' },
              { id: 'DONATE', label: '🎁 Donate', desc: 'Free' }
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setTransactionType(mode.id);
                  if (mode.id === 'DONATE') setPrice('0');
                }}
                className={`py-2.5 px-2 rounded-md border text-center transition-all ${
                  transactionType === mode.id
                    ? mode.id === 'EXCHANGE'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                      : mode.id === 'DONATE'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                      : 'bg-brand-500 text-white border-brand-500 shadow-sm font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-700 font-semibold hover:bg-gray-100'
                }`}
              >
                <div className="text-xs">{mode.label}</div>
                <div className={`text-[10px] ${transactionType === mode.id ? 'text-white/80' : 'text-gray-400'}`}>
                  {mode.desc}
                </div>
              </button>
            ))}
          </div>

          {transactionType === 'SELL' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">
                    Selling Price (INR)
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-900">
                      Original / MRP Price (Optional)
                    </label>
                    {calculatedDiscount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-200">
                        {calculatedDiscount}% OFF
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1600 (original MRP)"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md">
                <input
                  type="checkbox"
                  id="edit-negotiable"
                  checked={isNegotiable}
                  onChange={(e) => setIsNegotiable(e.target.checked)}
                  className="w-4 h-4 text-brand-500 rounded border-gray-300"
                />
                <label htmlFor="edit-negotiable" className="text-xs font-semibold text-gray-700 select-none cursor-pointer">
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

              {/* Also Open to Exchange Toggle */}
              <div className="p-3 rounded-md border border-dashed border-indigo-200 bg-indigo-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Also open to item exchange / swap?</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isExchangeAllowed}
                    onChange={(e) => setIsExchangeAllowed(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </div>
                {isExchangeAllowed && (
                  <input
                    type="text"
                    placeholder="e.g. Open to exchange for 4th Sem Books or Calculator"
                    value={exchangePreferences}
                    onChange={(e) => setExchangePreferences(e.target.value)}
                    className="w-full bg-white border border-indigo-200 rounded-md px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>
          ) : transactionType === 'EXCHANGE' ? (
            <div className="space-y-3 p-3.5 rounded-md border border-indigo-200 bg-indigo-50/40">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">
                  What do you want in exchange? <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4th Sem CSE Books, Casio FX-991EX, Cycle"
                  value={exchangePreferences}
                  onChange={(e) => setExchangePreferences(e.target.value)}
                  className="w-full bg-white border border-indigo-300 rounded-md px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Estimated Value in INR (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full sm:w-1/2 bg-white border border-gray-200 rounded-md px-3 py-2 text-xs outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-medium text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Listed as a free peer donation.
            </div>
          )}

          {/* Condition */}
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-1.5">Condition</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONDITIONS.map((cond) => (
                <button
                  key={cond.value}
                  type="button"
                  onClick={() => setCondition(cond.value)}
                  className={`p-2 rounded-md border text-left text-xs font-semibold transition-all ${
                    condition === cond.value
                      ? 'border-brand-500 bg-brand-50 text-brand-900'
                      : 'border-gray-200 bg-gray-50 text-gray-700'
                  }`}
                >
                  {cond.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location & Contacts */}
        <div className="bg-white border border-gray-200 rounded-md p-4 sm:p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-1">
              Campus Location
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {LPU_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(`${loc}, LPU Campus`)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    location.startsWith(loc)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white border border-gray-200 rounded-md p-4 sm:p-6 shadow-sm">
          <label className="block text-xs font-bold text-gray-900 mb-1">Description</label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-md p-3 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium py-2.5 px-6 rounded-md text-center justify-center flex items-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold py-2.5 px-6 rounded-md shadow-md disabled:opacity-50 text-center justify-center flex items-center cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Saving Changes...' : uploading ? 'Uploading Photos...' : 'Save Changes'}
          </button>
        </div>
      </form>

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
