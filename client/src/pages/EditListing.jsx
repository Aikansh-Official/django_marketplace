import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;
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
  AlertCircle
} from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';

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
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [rentPeriod, setRentPeriod] = useState('month');
  const [condition, setCondition] = useState('GOOD');
  const [location, setLocation] = useState('');
  const [contactPreference, setContactPreference] = useState('ALL');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [status, setStatus] = useState('ACTIVE');
  const [urlInput, setUrlInput] = useState('');

  // Fetch listing data and categories
  useEffect(() => {
    const fetchData = async () => {
      setFetching(true);
      try {
        const catRes = await axios.get(`${API_BASE}/marketplace/categories/`);
        setCategories(catRes.data);

                const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const listingRes = await axios.get(
          `${API_BASE}/marketplace/listings/${id}/`,
          { headers }
        );

        const data = listingRes.data;
        setTitle(data.title || '');
        setCategoryId(data.category?.id || '');
        setTransactionType(data.transaction_type || 'SELL');
        setPrice(data.price ? String(Math.round(data.price)) : '');
        setIsNegotiable(data.is_negotiable ?? true);
        setRentPeriod(data.rent_period || 'month');
        setCondition(data.condition || 'GOOD');
        setLocation(data.location || '');
        setContactPreference(data.contact_preference || 'ALL');
        setContactPhone(data.contact_phone || '');
        setContactWhatsapp(data.contact_whatsapp || '');
        setDescription(data.description || '');
        setStatus(data.status || 'ACTIVE');

        if (data.images && data.images.length > 0) {
          const imgUrls = data.images.map((img) => img.image_url);
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

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (images.length + files.length > 8) {
      toast.error('Maximum 8 images allowed.');
      return;
    }

        if (!token) {
      toast.error('Please login to upload images.');
      return;
    }

    setUploading(true);
    let uploadedCount = 0;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image.`);
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
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        setImages((prev) => [...prev, res.data.url]);
        uploadedCount++;
      } catch (err) {
        console.error(`Failed to upload ${file.name}`, err);
        toast.error(`Failed to upload ${file.name}.`);
      }
    }

    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} image${uploadedCount > 1 ? 's' : ''} uploaded!`);
    }
    setUploading(false);
  };

  const handleAddImageUrl = () => {
    if (!urlInput.trim()) return;
    if (images.length >= 8) {
      toast.error('Maximum 8 images allowed.');
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

  // Submit Handler
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

    setLoading(true);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const payload = {
      title: title.trim(),
      category: categoryId || null,
      transaction_type: transactionType,
      price: transactionType === 'DONATE' ? '0.00' : parseFloat(price).toFixed(2),
      is_negotiable: transactionType === 'DONATE' ? false : isNegotiable,
      rent_period: transactionType === 'RENT' ? rentPeriod : null,
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
      await axios.patch(
        `${API_BASE}/marketplace/listings/${id}/`,
        payload,
        { headers }
      );
      toast.success('Listing updated successfully!');
      navigate(`/listing/${id}`);
    } catch (err) {
      console.error('Failed to update listing', err);
      toast.error(err.response?.data?.detail || 'Failed to update listing.');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Listing
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Edit Listing
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Update pricing, photos, or details of your product.
          </p>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos Box */}
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-brand-500" />
              Product Photos ({images.length}/8)
            </h2>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="file"
              id="edit-file-upload"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="edit-file-upload"
              className={`border border-brand-200 text-brand-700 text-xs font-semibold px-4 py-2 rounded-md transition-colors inline-flex items-center gap-1.5 ${uploading ? 'bg-brand-100 opacity-60 pointer-events-none' : 'cursor-pointer bg-brand-50 hover:bg-brand-100'}`}
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              {uploading ? 'Uploading...' : 'Upload New Images'}
            </label>

            <div className="flex-1 flex gap-2">
              <input
                type="url"
                placeholder="Or paste an image URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
              >
                Add URL
              </button>
            </div>
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
                  <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  {primaryIndex === idx ? (
                    <span className="absolute top-2 left-2 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPrimaryIndex(idx)}
                      className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set Cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Title & Category */}
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm space-y-4">
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
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {['SELL', 'RENT', 'DONATE'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTransactionType(type);
                  if (type === 'DONATE') setPrice('0');
                }}
                className={`py-2.5 rounded-md border text-center text-xs font-bold transition-all ${
                  transactionType === type
                    ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                {type === 'SELL' ? 'Sell' : type === 'RENT' ? 'Rent' : 'Donate'}
              </button>
            ))}
          </div>

          {transactionType !== 'DONATE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">
                  Price (INR)
                </label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              {transactionType === 'SELL' ? (
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md">
                  <input
                    type="checkbox"
                    id="edit-negotiable"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    className="w-4 h-4 text-brand-500 rounded border-gray-300"
                  />
                  <label htmlFor="edit-negotiable" className="text-xs font-semibold text-gray-700">
                    Negotiable
                  </label>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">
                    Rental Duration
                  </label>
                  <select
                    value={rentPeriod}
                    onChange={(e) => setRentPeriod(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="day">Per Day</option>
                    <option value="week">Per Week</option>
                    <option value="month">Per Month</option>
                    <option value="semester">Per Semester</option>
                  </select>
                </div>
              )}
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
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm space-y-4">
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
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
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
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium py-2.5 px-6 rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold py-2.5 px-6 rounded-md shadow-md disabled:opacity-50"
          >
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
