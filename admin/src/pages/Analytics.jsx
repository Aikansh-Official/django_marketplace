import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  TrendingUp, Users, ShoppingBag, CheckCircle2, Award, 
  Download, RefreshCw, MapPin, Gift, BarChart3, PieChart, 
  ArrowUpRight, ShieldCheck, Layers, Calendar, DollarSign,
  Tag, ChevronRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');
  const [activeChartMetric, setActiveChartMetric] = useState('turnover'); // 'turnover' | 'deals' | 'both'
  const [hoveredTimelinePoint, setHoveredTimelinePoint] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const fetchAnalytics = async (tf = timeframe, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`${API_BASE}/marketplace/admin/analytics/?timeframe=${tf}`);
      setData(res.data);
      if (isManual) toast.success("Analytics data refreshed");
    } catch (err) {
      console.error("Failed to load analytics:", err);
      toast.error("Failed to load platform analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  // Export Analytics Summary CSV
  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "CampusXChange Analytics Report\n";
    csvContent += `Generated On,${new Date().toLocaleString()}\n`;
    csvContent += `Timeframe,${data.timeframe}\n\n`;

    // KPIs
    csvContent += "=== High Level KPIs ===\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Verified GMV,Rs. ${data.kpis?.total_gmv || 0}\n`;
    csvContent += `Timeframe GMV,Rs. ${data.kpis?.timeframe_gmv || 0}\n`;
    csvContent += `Total Completed Deals,${data.kpis?.total_completed_deals || 0}\n`;
    csvContent += `Timeframe Deals,${data.kpis?.timeframe_completed_deals || 0}\n`;
    csvContent += `Average Deal Value,Rs. ${data.kpis?.avg_deal_value || 0}\n`;
    csvContent += `Total Students,${data.kpis?.total_students || 0}\n`;
    csvContent += `Verified Students,${data.kpis?.verified_students || 0}\n`;
    csvContent += `Verification Rate,${data.kpis?.verification_rate || 0}%\n`;
    csvContent += `Active Listings,${data.kpis?.active_listings || 0}\n\n`;

    // Category Breakdown
    csvContent += "=== Category Distribution ===\n";
    csvContent += "Category,Total Listings,Active Listings,Sold Listings,Share (%),Avg Price (Rs)\n";
    data.category_breakdown?.forEach((c) => {
      csvContent += `"${c.name}",${c.listing_count},${c.active_count},${c.sold_count},${c.share_percentage}%,Rs. ${c.avg_price}\n`;
    });
    csvContent += "\n";

    // Top Sellers Leaderboard
    csvContent += "=== Top Campus Sellers Leaderboard ===\n";
    csvContent += "Rank,Full Name,Username,Email,Trust Score,Verified,Total Listed,Items Sold,Completed Deals\n";
    data.top_sellers?.forEach((s) => {
      csvContent += `${s.rank},"${s.full_name}","@${s.username}","${s.email}",${s.trust_score}/100,${s.is_verified_student ? 'YES' : 'NO'},${s.total_listings},${s.sold_listings},${s.completed_deals}\n`;
    });
    csvContent += "\n";

    // Campus Hotspots
    csvContent += "=== Campus Location Hotspots ===\n";
    csvContent += "Location,Total Listings,Sold Deals,Share (%)\n";
    data.campus_hotspots?.forEach((h) => {
      csvContent += `"${h.location}",${h.total_listings},${h.sold_listings},${h.share_percentage}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campusxchange_analytics_${data.timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Analytics report downloaded");
  };

  // Color palette for category donut chart
  const categoryColors = [
    '#6366f1', '#10b981', '#f59e0b', '#ec4899', 
    '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', 
    '#3b82f6', '#84cc16'
  ];

  // Calculations for interactive SVG Area Chart
  const chartData = useMemo(() => {
    if (!data || !data.timeline || data.timeline.length === 0) return null;

    const points = data.timeline;
    const maxTurnover = Math.max(...points.map(p => p.turnover), 100);
    const maxDeals = Math.max(...points.map(p => p.deals), 5);
    const maxSignups = Math.max(...points.map(p => p.signups), 5);

    const width = 800;
    const height = 260;
    const padding = { top: 20, right: 30, bottom: 40, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const getX = (idx) => padding.left + (idx / (points.length - 1 || 1)) * chartW;
    const getYTurnover = (val) => padding.top + chartH - (val / maxTurnover) * chartH;
    const getYDeals = (val) => padding.top + chartH - (val / maxDeals) * chartH;
    const getYSignups = (val) => padding.top + chartH - (val / maxSignups) * chartH;

    // Build SVG paths for Turnover
    const turnoverCoords = points.map((p, i) => [getX(i), getYTurnover(p.turnover)]);
    let turnoverPath = `M ${turnoverCoords[0][0]} ${turnoverCoords[0][1]}`;
    for (let i = 1; i < turnoverCoords.length; i++) {
      turnoverPath += ` L ${turnoverCoords[i][0]} ${turnoverCoords[i][1]}`;
    }
    const turnoverArea = `${turnoverPath} L ${turnoverCoords[turnoverCoords.length - 1][0]} ${padding.top + chartH} L ${turnoverCoords[0][0]} ${padding.top + chartH} Z`;

    // Build SVG path for Deals
    const dealsCoords = points.map((p, i) => [getX(i), getYDeals(p.deals)]);
    let dealsPath = `M ${dealsCoords[0][0]} ${dealsCoords[0][1]}`;
    for (let i = 1; i < dealsCoords.length; i++) {
      dealsPath += ` L ${dealsCoords[i][0]} ${dealsCoords[i][1]}`;
    }

    // Build SVG path for Signups
    const signupsCoords = points.map((p, i) => [getX(i), getYSignups(p.signups)]);
    let signupsPath = `M ${signupsCoords[0][0]} ${signupsCoords[0][1]}`;
    for (let i = 1; i < signupsCoords.length; i++) {
      signupsPath += ` L ${signupsCoords[i][0]} ${signupsCoords[i][1]}`;
    }
    const signupsArea = `${signupsPath} L ${signupsCoords[signupsCoords.length - 1][0]} ${padding.top + chartH} L ${signupsCoords[0][0]} ${padding.top + chartH} Z`;

    return {
      width,
      height,
      padding,
      chartW,
      chartH,
      points,
      maxTurnover,
      maxDeals,
      maxSignups,
      getX,
      turnoverPath,
      turnoverArea,
      dealsPath,
      signupsPath,
      signupsArea,
      turnoverCoords,
      dealsCoords,
      signupsCoords
    };
  }, [data]);

  // Donut chart calculations
  const donutData = useMemo(() => {
    if (!data || !data.category_breakdown || data.category_breakdown.length === 0) return null;

    const total = data.category_breakdown.reduce((acc, c) => acc + c.listing_count, 0) || 1;
    let accumulatedAngle = 0;

    const segments = data.category_breakdown.slice(0, 6).map((c, i) => {
      const share = c.listing_count / total;
      const angle = share * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      return {
        ...c,
        color: categoryColors[i % categoryColors.length],
        share,
        startAngle,
        angle
      };
    });

    return { total, segments };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 animate-pulse rounded-md"></div>
            <div className="h-4 w-96 bg-gray-200 animate-pulse rounded-md"></div>
          </div>
          <div className="h-10 w-40 bg-gray-200 animate-pulse rounded-md"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white/80 rounded-md border border-gray-100 animate-pulse p-6"></div>
          ))}
        </div>
        <div className="h-80 bg-white/80 rounded-md border border-gray-100 animate-pulse"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* Top Header & Timeframe Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-600 rounded-md">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Platform Analytics & Intelligence</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time business insights, verified transaction turnover, campus velocity & student leaderboard
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Timeframe Selector Chips */}
          <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200 text-xs font-bold">
            {[
              { label: '7 Days', value: '7d' },
              { label: '30 Days', value: '30d' },
              { label: '90 Days', value: '90d' },
              { label: 'All Time', value: 'all' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setTimeframe(tab.value)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  timeframe === tab.value
                    ? 'bg-white text-gray-900 shadow-sm font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics(timeframe, true)}
            disabled={refreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md border border-gray-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-xs font-bold shadow-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (6 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Total GMV */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md flex flex-col justify-between hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Gross Turnover</span>
            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              ₹
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-gray-900">₹{kpis.total_gmv?.toLocaleString('en-IN') || 0}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> ₹{kpis.timeframe_gmv?.toLocaleString('en-IN') || 0} in {timeframe}
            </p>
          </div>
        </div>

        {/* Completed Trades */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md flex flex-col justify-between hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Completed Deals</span>
            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-gray-900">{kpis.total_completed_deals || 0}</p>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">
              +{kpis.timeframe_completed_deals || 0} closed in window
            </p>
          </div>
        </div>

        {/* Average Deal Value */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md flex flex-col justify-between hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Avg Deal Size</span>
            <span className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-gray-900">₹{Math.round(kpis.avg_deal_value || 0)}</p>
            <p className="text-[11px] text-gray-500 font-medium mt-1">
              Across peer handovers
            </p>
          </div>
        </div>

        {/* Active Listings */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md flex flex-col justify-between hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Inventory</span>
            <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-gray-900">{kpis.active_listings || 0}</p>
            <p className="text-[11px] text-gray-500 font-medium mt-1">
              {kpis.total_listings || 0} total catalog items
            </p>
          </div>
        </div>

        {/* Verification Rate */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md flex flex-col justify-between hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Verified Students</span>
            <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-gray-900">{kpis.verification_rate || 0}%</p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, kpis.verification_rate || 0)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {kpis.verified_students} of {kpis.total_students} verified
            </p>
          </div>
        </div>

        {/* Student Acquisition */}
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-md border border-white/50 shadow-md flex flex-col justify-between hover:border-brand-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Student Signups</span>
            <span className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-gray-900">{kpis.total_students || 0}</p>
            <p className="text-[11px] text-rose-600 font-semibold mt-1">
              +{kpis.new_students_timeframe || 0} joined in {timeframe}
            </p>
          </div>
        </div>

      </div>

      {/* Main Interactive Time-Series Area & Line Chart */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              Campus Trade Velocity & Turnover Trend
            </h2>
            <p className="text-xs text-gray-500">
              Daily completed peer trades and gross transaction volume (₹ GMV) over {timeframe}
            </p>
          </div>

          {/* Metric Filter Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-md border border-gray-200 text-xs font-bold">
            <button
              onClick={() => setActiveChartMetric('turnover')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                activeChartMetric === 'turnover'
                  ? 'bg-white text-emerald-700 shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Turnover (₹)
            </button>
            <button
              onClick={() => setActiveChartMetric('deals')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                activeChartMetric === 'deals'
                  ? 'bg-white text-indigo-700 shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Completed Deals
            </button>
            <button
              onClick={() => setActiveChartMetric('both')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeChartMetric === 'both'
                  ? 'bg-white text-gray-900 shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Both Metrics
            </button>
          </div>
        </div>

        {/* SVG Chart Container */}
        {chartData ? (
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartData.width} ${chartData.height}`}
              className="w-full h-auto min-w-[650px] overflow-visible select-none"
            >
              <defs>
                {/* Turnover Gradient Fill */}
                <linearGradient id="turnoverGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                {/* Signups Gradient Fill */}
                <linearGradient id="signupsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = chartData.padding.top + chartData.chartH * (1 - ratio);
                const turnoverVal = Math.round(chartData.maxTurnover * ratio);
                return (
                  <g key={i}>
                    <line
                      x1={chartData.padding.left}
                      y1={y}
                      x2={chartData.width - chartData.padding.right}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={chartData.padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] fill-gray-400 font-mono"
                    >
                      ₹{turnoverVal >= 1000 ? `${(turnoverVal/1000).toFixed(1)}k` : turnoverVal}
                    </text>
                  </g>
                );
              })}

              {/* Turnover Area & Line */}
              {(activeChartMetric === 'turnover' || activeChartMetric === 'both') && (
                <>
                  <path d={chartData.turnoverArea} fill="url(#turnoverGrad)" />
                  <path
                    d={chartData.turnoverPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartData.turnoverCoords.map(([x, y], idx) => (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r={hoveredTimelinePoint === idx ? 6 : 3}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-150 cursor-pointer"
                    />
                  ))}
                </>
              )}

              {/* Deals Line */}
              {(activeChartMetric === 'deals' || activeChartMetric === 'both') && (
                <>
                  <path
                    d={chartData.dealsPath}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeDasharray={activeChartMetric === 'both' ? '4 3' : 'none'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartData.dealsCoords.map(([x, y], idx) => (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r={hoveredTimelinePoint === idx ? 6 : 3}
                      fill="#6366f1"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-150 cursor-pointer"
                    />
                  ))}
                </>
              )}

              {/* X-Axis Date Labels (Sampled) */}
              {chartData.points.map((p, i) => {
                // Show every 3rd or 5th label to avoid crowd
                const step = chartData.points.length > 20 ? 4 : (chartData.points.length > 10 ? 2 : 1);
                if (i % step !== 0 && i !== chartData.points.length - 1) return null;
                const x = chartData.getX(i);
                return (
                  <text
                    key={i}
                    x={x}
                    y={chartData.height - 12}
                    textAnchor="middle"
                    className="text-[10px] fill-gray-400 font-medium"
                  >
                    {p.label}
                  </text>
                );
              })}

              {/* Interactive Hover Vertical Guide Line & Detection overlay */}
              {chartData.points.map((p, idx) => {
                const x = chartData.getX(idx);
                const colWidth = chartData.chartW / (chartData.points.length || 1);
                return (
                  <rect
                    key={idx}
                    x={x - colWidth / 2}
                    y={chartData.padding.top}
                    width={colWidth}
                    height={chartData.chartH}
                    fill="transparent"
                    onMouseEnter={() => setHoveredTimelinePoint(idx)}
                    onMouseLeave={() => setHoveredTimelinePoint(null)}
                    className="cursor-crosshair"
                  />
                );
              })}

              {/* Active Hover Indicator Line */}
              {hoveredTimelinePoint !== null && (
                <line
                  x1={chartData.getX(hoveredTimelinePoint)}
                  y1={chartData.padding.top}
                  x2={chartData.getX(hoveredTimelinePoint)}
                  y2={chartData.padding.top + chartData.chartH}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredTimelinePoint !== null && chartData.points[hoveredTimelinePoint] && (
              <div 
                className="absolute z-20 pointer-events-none bg-ink-900 text-white p-3 rounded-md shadow-xl text-xs space-y-1 transform -translate-x-1/2 -translate-y-full border border-gray-700"
                style={{
                  left: `${(chartData.getX(hoveredTimelinePoint) / chartData.width) * 100}%`,
                  top: '40px'
                }}
              >
                <p className="font-bold text-gray-300 pb-1 border-b border-gray-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-brand-400" />
                  {chartData.points[hoveredTimelinePoint].date}
                </p>
                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Turnover:
                  </span>
                  <span className="font-black">₹{chartData.points[hoveredTimelinePoint].turnover.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-indigo-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    Deals:
                  </span>
                  <span className="font-black">{chartData.points[hoveredTimelinePoint].deals} completed</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    Signups:
                  </span>
                  <span className="font-black">{chartData.points[hoveredTimelinePoint].signups} new students</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400 text-xs">No activity logged in this window.</div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 text-xs font-semibold">
          <span className="flex items-center gap-2 text-emerald-700">
            <span className="w-3 h-3 rounded bg-emerald-500"></span> Gross Turnover (₹ GMV)
          </span>
          <span className="flex items-center gap-2 text-indigo-700">
            <span className="w-3 h-3 rounded bg-indigo-500"></span> Completed Peer Handovers
          </span>
          <span className="flex items-center gap-2 text-gray-500">
            <span className="w-3 h-3 rounded bg-gray-300"></span> Student Signups
          </span>
        </div>
      </div>

      {/* Two-Column Section: Category Donut & Commercial vs Donation Ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Breakdown (Donut Chart & List) */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-brand-600" />
                Category Share & Inventory Distribution
              </h2>
              <p className="text-xs text-gray-500">Breakdown of marketplace listings by academic & lifestyle category</p>
            </div>
            <span className="text-xs font-bold text-gray-500">{data?.category_breakdown?.length || 0} Categories</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* SVG Donut */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
              <svg viewBox="0 0 160 160" className="w-44 h-44 transform -rotate-90">
                {donutData && donutData.segments.map((seg, i) => {
                  const radius = 60;
                  const strokeWidth = 24;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDasharray = `${(seg.share * circumference)} ${circumference}`;
                  const strokeDashoffset = -((seg.startAngle / 360) * circumference);

                  return (
                    <circle
                      key={seg.id || i}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={hoveredCategory === i ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      onMouseEnter={() => setHoveredCategory(i)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className="transition-all duration-200 cursor-pointer"
                    />
                  );
                })}
              </svg>
              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-gray-900">
                  {hoveredCategory !== null && donutData?.segments[hoveredCategory]
                    ? `${donutData.segments[hoveredCategory].share_percentage}%`
                    : kpis.total_listings || 0}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {hoveredCategory !== null && donutData?.segments[hoveredCategory]
                    ? donutData.segments[hoveredCategory].name
                    : 'Listings'}
                </span>
              </div>
            </div>

            {/* Category Legend List */}
            <div className="sm:col-span-7 space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {data?.category_breakdown?.map((cat, i) => (
                <div
                  key={cat.id || i}
                  onMouseEnter={() => setHoveredCategory(i)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`flex items-center justify-between p-2 rounded-md transition-colors border ${
                    hoveredCategory === i ? 'bg-gray-50 border-brand-300 shadow-sm' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categoryColors[i % categoryColors.length] }}
                    />
                    <span className="text-xs font-bold text-gray-900 truncate">{cat.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0 text-xs">
                    <span className="font-black text-gray-900">{cat.listing_count}</span>
                    <span className="text-gray-400 text-[11px] ml-1.5 font-medium">({cat.share_percentage}%)</span>
                    <span className="text-[10px] text-gray-500 block">Avg ₹{Math.round(cat.avg_price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sell vs Student Donation Ratio & Velocity */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-emerald-600" />
                  Commercial Sales vs Campus Donations
                </h2>
                <p className="text-xs text-gray-500">Student giving ratio: Paid items vs 100% Free goodwill donations</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {data?.sell_vs_donation?.donate_percentage || 0}% Free Giving
              </span>
            </div>

            {/* Split Comparison Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Commercial Sell */}
              <div className="p-4 bg-brand-50/50 rounded-md border border-brand-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-900">Commercial Sell</span>
                  <Tag className="w-4 h-4 text-brand-600" />
                </div>
                <p className="text-2xl font-black text-brand-900 mt-2">
                  {data?.sell_vs_donation?.sell_count || 0}
                </p>
                <p className="text-xs text-brand-700 font-semibold mt-0.5">
                  {data?.sell_vs_donation?.sell_percentage || 0}% of all items
                </p>
                <p className="text-[10px] text-gray-500 mt-1">Paid peer exchange</p>
              </div>

              {/* Free Goodwill Donations */}
              <div className="p-4 bg-emerald-50/50 rounded-md border border-emerald-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Free Donations</span>
                  <Gift className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-black text-emerald-900 mt-2">
                  {data?.sell_vs_donation?.donate_count || 0}
                </p>
                <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                  {data?.sell_vs_donation?.donate_percentage || 0}% student goodwill
                </p>
                <p className="text-[10px] text-gray-500 mt-1">Books & lab-gear giveaways</p>
              </div>
            </div>

            {/* Visual Stacked Ratio Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-700">
                <span>Sell ({data?.sell_vs_donation?.sell_percentage || 0}%)</span>
                <span>Donate ({data?.sell_vs_donation?.donate_percentage || 0}%)</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                <div 
                  className="bg-brand-600 h-full transition-all duration-500"
                  style={{ width: `${data?.sell_vs_donation?.sell_percentage || 0}%` }}
                  title={`Sell: ${data?.sell_vs_donation?.sell_count}`}
                />
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${data?.sell_vs_donation?.donate_percentage || 0}%` }}
                  title={`Donate: ${data?.sell_vs_donation?.donate_count}`}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50/50 p-3 rounded-md text-xs text-gray-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              Free donations boost student Trust Score by +5 points on completion
            </span>
          </div>
        </div>

      </div>

      {/* Two-Column Section: Campus Location Hotspots & Price Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Campus Location Hotspots */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-600" />
                Campus Trading Hotspots & Meetup Hubs
              </h2>
              <p className="text-xs text-gray-500">Most active trading spots across hostels and academic blocks</p>
            </div>
            <span className="text-xs font-bold text-gray-400">LPU Campus</span>
          </div>

          <div className="space-y-3.5">
            {data?.campus_hotspots?.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No location hotspots recorded yet.</p>
            ) : (
              data?.campus_hotspots?.map((spot, i) => (
                <div key={spot.location || i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      {spot.location}
                    </span>
                    <span className="font-semibold text-gray-600">
                      {spot.total_listings} items <span className="text-emerald-600 font-bold">({spot.sold_listings} sold)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, spot.share_percentage * 2.5)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Price Benchmarks */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-md border border-white/50 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Category Price Benchmarks & Valuation
              </h2>
              <p className="text-xs text-gray-500">Average student asking price and market range per category</p>
            </div>
            <span className="text-xs font-bold text-gray-400">INR (₹)</span>
          </div>

          <div className="space-y-3">
            {data?.price_benchmarks?.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No price benchmarks available.</p>
            ) : (
              data?.price_benchmarks?.map((bm, i) => (
                <div key={bm.category_name || i} className="flex items-center justify-between p-2.5 rounded-md hover:bg-gray-50 transition-colors border border-gray-100">
                  <div>
                    <p className="text-xs font-bold text-gray-900">{bm.category_name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Range: ₹{Math.round(bm.min_price)} — ₹{Math.round(bm.max_price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-700">₹{Math.round(bm.avg_price)}</span>
                    <span className="text-[10px] text-gray-400 block">Avg Asking Price</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Top Campus Sellers Leaderboard (Podium & Ranking Table) */}
      <div className="bg-white/80 backdrop-blur-md rounded-md border border-white/50 shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-black text-gray-900">Campus Sellers Hall of Fame (Top 10)</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Ranked by verified completed peer handovers, positive student trust score, and active listings
            </p>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Top Campus Traders
          </span>
        </div>

        {/* Podium Preview for Top 3 */}
        {data?.top_sellers && data.top_sellers.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            
            {/* 2nd Place */}
            {data.top_sellers[1] && (
              <div className="bg-slate-50/80 p-4 rounded-md border border-slate-200 flex flex-col items-center text-center relative order-2 md:order-1">
                <span className="absolute top-3 left-3 text-lg font-black text-slate-400">#2</span>
                <span className="text-2xl mb-1">🥈</span>
                <div className="w-14 h-14 rounded-full bg-slate-200 ring-2 ring-slate-300 text-slate-700 font-bold flex items-center justify-center text-base mb-2 overflow-hidden">
                  {data.top_sellers[1].profile_photo ? (
                    <img src={data.top_sellers[1].profile_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    data.top_sellers[1].full_name[0].toUpperCase()
                  )}
                </div>
                <h3 className="text-xs font-bold text-gray-900 truncate max-w-[160px]">{data.top_sellers[1].full_name}</h3>
                <p className="text-[11px] text-gray-500 font-mono">@{data.top_sellers[1].username}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                    {data.top_sellers[1].completed_deals} Deals
                  </span>
                  <span className="text-gray-500 font-bold text-[10px]">
                    Trust: {data.top_sellers[1].trust_score}/100
                  </span>
                </div>
              </div>
            )}

            {/* 1st Place (Gold Center) */}
            {data.top_sellers[0] && (
              <div className="bg-gradient-to-b from-amber-50/80 to-amber-100/30 p-5 rounded-md border-2 border-amber-300 flex flex-col items-center text-center relative order-1 md:order-2 shadow-md transform md:-translate-y-2">
                <span className="absolute top-3 left-3 text-xl font-black text-amber-600">#1</span>
                <span className="text-3xl mb-1">🥇</span>
                <div className="w-16 h-16 rounded-full bg-amber-100 ring-4 ring-amber-400 text-amber-800 font-black flex items-center justify-center text-lg mb-2 overflow-hidden shadow-md">
                  {data.top_sellers[0].profile_photo ? (
                    <img src={data.top_sellers[0].profile_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    data.top_sellers[0].full_name[0].toUpperCase()
                  )}
                </div>
                <h3 className="text-sm font-black text-gray-900 truncate max-w-[180px]">{data.top_sellers[0].full_name}</h3>
                <p className="text-[11px] text-amber-800 font-mono">@{data.top_sellers[0].username}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded font-black text-[11px] shadow-sm">
                    {data.top_sellers[0].completed_deals} Completed
                  </span>
                  <span className="px-2 py-0.5 bg-white text-gray-800 rounded font-bold text-[10px] border border-amber-200">
                    Trust: {data.top_sellers[0].trust_score}/100
                  </span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {data.top_sellers[2] && (
              <div className="bg-amber-50/30 p-4 rounded-md border border-amber-200/60 flex flex-col items-center text-center relative order-3">
                <span className="absolute top-3 left-3 text-lg font-black text-amber-700/60">#3</span>
                <span className="text-2xl mb-1">🥉</span>
                <div className="w-14 h-14 rounded-full bg-amber-100 ring-2 ring-amber-300 text-amber-800 font-bold flex items-center justify-center text-base mb-2 overflow-hidden">
                  {data.top_sellers[2].profile_photo ? (
                    <img src={data.top_sellers[2].profile_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    data.top_sellers[2].full_name[0].toUpperCase()
                  )}
                </div>
                <h3 className="text-xs font-bold text-gray-900 truncate max-w-[160px]">{data.top_sellers[2].full_name}</h3>
                <p className="text-[11px] text-gray-500 font-mono">@{data.top_sellers[2].username}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                    {data.top_sellers[2].completed_deals} Deals
                  </span>
                  <span className="text-gray-500 font-bold text-[10px]">
                    Trust: {data.top_sellers[2].trust_score}/100
                  </span>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Detailed Leaderboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-y border-gray-200">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Student Trader</th>
                <th className="py-3 px-4">College Email</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Trust Score</th>
                <th className="py-3 px-4">Listed Items</th>
                <th className="py-3 px-4">Items Sold</th>
                <th className="py-3 px-4 text-right">Completed Deals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {data?.top_sellers?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-400">
                    No active student sellers recorded yet.
                  </td>
                </tr>
              ) : (
                data?.top_sellers?.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-black text-gray-900">
                      {seller.rank === 1 ? '🥇 1' : seller.rank === 2 ? '🥈 2' : seller.rank === 3 ? '🥉 3' : `#${seller.rank}`}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {seller.full_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{seller.full_name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">@{seller.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                      {seller.email}
                    </td>
                    <td className="py-3 px-4">
                      {seller.is_verified_student ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Campus Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                          Pending ID
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, seller.trust_score)}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-900 text-[11px]">{seller.trust_score}/100</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {seller.total_listings}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">
                      {seller.sold_listings}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md font-black text-xs">
                        {seller.completed_deals}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
