import React from 'react';

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Privacy Policy</h1>
      <div className="bg-white rounded-md border border-gray-200 p-8 shadow-sm text-gray-700 space-y-4">
        <p><strong>Last Updated:</strong> September 2026</p>
        <p>
          At LPUTrade, we take your privacy seriously. This policy describes what personal information we collect and how we use it.
        </p>
        <h2 className="text-xl font-bold text-gray-900">Information Collection</h2>
        <p>
          We collect information you provide directly to us, such as your university email address, name, phone number, and any information you include in your listings.
        </p>
        <h2 className="text-xl font-bold text-gray-900">Use of Information</h2>
        <p>
          Your information is used solely to facilitate the marketplace, allow users to contact you regarding listings, and verify your student status. We do not sell your personal data to third parties.
        </p>
        <h2 className="text-xl font-bold text-gray-900">Data Security</h2>
        <p>
          We implement standard security measures to protect your personal information, though no method of electronic transmission is 100% secure.
        </p>
      </div>
    </div>
  );
}
