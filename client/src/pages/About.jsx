import React from 'react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">About LPUTrade</h1>
      <div className="bg-white rounded-md border border-gray-200 p-8 shadow-sm text-gray-700 space-y-4">
        <p>
          LPUTrade is an exclusive, secure marketplace designed specifically for the students of Lovely Professional University (LPU).
        </p>
        <p>
          Our mission is to make it easy for students to buy, sell, rent, or donate items within the campus securely. Whether you are looking for textbooks for the upcoming semester, a calculator, or a cycle to commute around the campus, LPUTrade connects you with your peers.
        </p>
        <p>
          By restricting access to verified university domains, we maintain a high-trust environment where students can transact with confidence.
        </p>
      </div>
    </div>
  );
}
