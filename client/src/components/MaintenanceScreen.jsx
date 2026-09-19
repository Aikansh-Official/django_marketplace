import React, { useState, useEffect } from 'react';
import { Wrench, RefreshCw, ShieldAlert, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { getPlatformConfig } from '../services/api';

export default function MaintenanceScreen() {
  const [maintenance, setMaintenance] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const config = await getPlatformConfig(true);
      if (config && config.maintenance_mode) {
        setMaintenance({
          active: true,
          message:
            config.maintenance_message ||
            'CampusXChange is currently undergoing scheduled campus maintenance. Please check back shortly.',
        });
      } else {
        setMaintenance(null);
      }
    } catch {
      // If error, do not force maintenance unless event explicitly set it
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();

    const handleMaintenanceEvent = (e) => {
      setMaintenance({
        active: true,
        message:
          e.detail?.message ||
          'CampusXChange is currently undergoing scheduled campus maintenance. Please check back shortly.',
      });
    };

    window.addEventListener('platform-maintenance', handleMaintenanceEvent);
    return () => {
      window.removeEventListener('platform-maintenance', handleMaintenanceEvent);
    };
  }, []);

  if (!maintenance?.active) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 rounded-md shadow-2xl p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Glowing aura */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          Scheduled Campus Maintenance
        </div>

        {/* Icon & Heading */}
        <div className="w-16 h-16 rounded-md bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 mb-6">
          <Wrench className="w-8 h-8 text-white animate-pulse" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
          CampusXChange Under Maintenance
        </h1>

        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          {maintenance.message}
        </p>

        {/* Info card */}
        <div className="bg-gray-900/80 border border-gray-800/80 rounded-md p-4 mb-6 text-left text-xs text-gray-400 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-200 mb-0.5">Platform Upgrades in Progress</p>
            <p>Our campus IT team is tuning performance, syncing security policies, and deploying optimizations. All data and active listings are safe.</p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={checkStatus}
          disabled={checking}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking Status...' : 'Check If Maintenance Completed'}
        </button>
      </div>
    </div>
  );
}
