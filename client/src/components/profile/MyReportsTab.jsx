import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Tag,
  User,
  ShieldCheck
} from 'lucide-react';
import { getMyReports } from '../../services/api';
import UniversalLoader from '../common/UniversalLoader';

export default function MyReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getMyReports();
      setReports(res.data || []);
    } catch (err) {
      console.error('Failed to load my reports', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RESOLVED':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
          icon: CheckCircle2,
          label: 'Resolved / Action Taken'
        };
      case 'DISMISSED':
        return {
          bg: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: AlertCircle,
          label: 'Dismissed (No Violation)'
        };
      case 'PENDING':
      default:
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: Clock,
          label: 'Under Moderation Review'
        };
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <UniversalLoader text="Loading your reported issues..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-md p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900">
              My Safety & Moderation Reports
            </h2>
            <p className="text-xs text-gray-500">
              Track the progress and resolutions of listings and traders you reported to Campus Safety.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchReports(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md p-10 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            No Reports Submitted
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            You haven't reported any suspicious listings or traders yet. CampusXChange is maintained safe with peer vigilance.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const badge = getStatusBadge(report.status);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={report.id}
                className="bg-white border border-gray-200 rounded-md p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-gray-300"
              >
                {/* Status and Date Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}
                  >
                    <BadgeIcon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>

                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(report.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {/* Report Content */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">
                      Reason:
                    </span>
                    <span className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                      {report.reason}
                    </span>
                  </div>

                  {report.details && (
                    <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100">
                      "{report.details}"
                    </p>
                  )}
                </div>

                {/* Target Information */}
                <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {report.listing ? (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Tag className="w-3.5 h-3.5 text-brand-500" />
                      <span>Reported Item:</span>
                      <Link
                        to={`/product/${report.listing}`}
                        className="font-bold text-brand-600 hover:underline inline-flex items-center gap-1"
                      >
                        {report.listing_title || `Listing #${report.listing}`}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : report.reported_user ? (
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Reported Trader:</span>
                      <Link
                        to={`/seller/${report.reported_user}`}
                        className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        {report.reported_user_name || report.reported_user_username || 'Campus Member'}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">General Campus Report</span>
                  )}

                  {report.resolved_at && (
                    <span className="text-[11px] text-gray-400">
                      Resolved on: {new Date(report.resolved_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
