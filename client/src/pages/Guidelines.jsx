import React from 'react';

export default function Guidelines() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Community Guidelines</h1>
      <div className="bg-white rounded-md border border-gray-200 p-8 shadow-sm text-gray-700 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">1. Be Respectful</h2>
        <p>Treat all members of the LPUTrade community with respect. Harassment, hate speech, and abusive language will result in an immediate ban.</p>
        
        <h2 className="text-xl font-bold text-gray-900">2. Honest Listings</h2>
        <p>Accurately describe the items you are selling. Disclose any damages or defects. Use authentic images of the actual product rather than stock photos.</p>

        <h2 className="text-xl font-bold text-gray-900">3. Safe Transactions</h2>
        <p>Always meet in public, well-lit campus areas like Uni-Mall or Central Library. Inspect items before transferring money.</p>

        <h2 className="text-xl font-bold text-gray-900">4. Prohibited Items</h2>
        <p>Weapons, illegal substances, alcohol, and any items restricted by LPU campus regulations are strictly prohibited.</p>
      </div>
    </div>
  );
}
