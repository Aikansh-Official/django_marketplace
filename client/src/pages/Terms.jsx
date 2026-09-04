import React from 'react';

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Terms of Service</h1>
      <div className="bg-white rounded-md border border-gray-200 p-8 shadow-sm text-gray-700 space-y-4">
        <p><strong>Effective Date:</strong> September 2026</p>
        <p>
          By accessing or using LPUTrade, you agree to be bound by these Terms.
        </p>
        <h2 className="text-xl font-bold text-gray-900">1. Eligibility</h2>
        <p>
          You must be an active student of Lovely Professional University with a valid `@lpu.in` email address to create an account.
        </p>
        <h2 className="text-xl font-bold text-gray-900">2. Marketplace Role</h2>
        <p>
          LPUTrade is merely a venue for students to connect. We do not own, inspect, or guarantee any items listed. All transactions are solely between the buyer and the seller.
        </p>
        <h2 className="text-xl font-bold text-gray-900">3. Account Termination</h2>
        <p>
          We reserve the right to suspend or terminate any account that violates our Community Guidelines, engages in fraudulent activity, or abuses the platform.
        </p>
      </div>
    </div>
  );
}
