import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Sparkles,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { DemoDisclaimer } from '../common/DemoDisclaimer';
import { verificationActivityTrend, aiSimulatedInsights } from '../../data/mockData';

export const DashboardModule: React.FC = () => {
  const { applications } = useApp();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'30d' | '7d' | '12m'>('30d');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Dynamic counts based on active applications state
  const totalApps = 1248; // Baseline enterprise metric + dynamic offset
  const verifiedCount = 856;
  const needsReviewCount = 241;
  const pendingCount = 151;

  // Chart SVG coordinates calculation
  const maxVal = 120;
  const chartPoints = verificationActivityTrend.map((d, index) => {
    const x = 30 + index * 95;
    const y = 160 - (d.applications / maxVal) * 130;
    const yVer = 160 - (d.verified / maxVal) * 130;
    return { ...d, x, y, yVer };
  });

  const pathApplications = chartPoints.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const pathAreaApplications = `${pathApplications} L ${chartPoints[chartPoints.length - 1].x} 170 L ${chartPoints[0].x} 170 Z`;

  const pathVerified = chartPoints.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.yVer}` : `${acc} L ${curr.x} ${curr.yVer}`;
  }, '');

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      <DemoDisclaimer variant="banner" moduleName="Verification Command Center" />

      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Verification Command Center
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor institutional applications, document integrity scorecards, and regulatory compliance status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/new-verification')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Start New Verification</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Applications
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">
              {totalApps.toLocaleString()}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +12%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">vs. previous 30 days</p>
        </div>

        {/* Verified */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Verified
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">
              {verifiedCount.toLocaleString()}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +8%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">69% compliance clearance</p>
        </div>

        {/* Needs Review */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Needs Review
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">
              {needsReviewCount.toLocaleString()}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +5%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires human examiner signoff</p>
        </div>

        {/* Pending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Pending
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">
              {pendingCount.toLocaleString()}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              <ArrowDownRight className="w-3 h-3 mr-0.5" />
              -1%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">In processing & OCR extraction</p>
        </div>
      </div>

      {/* Middle Row: Verification Activity Chart & Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification Activity (Last 30 days) */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Verification Activity
              </h2>
              <p className="text-xs text-slate-500">
                Daily volume of submitted applications vs verified compliance dossiers
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeRange === '30d' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                30 days
              </button>
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeRange === '7d' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                7 days
              </button>
              <button
                onClick={() => setTimeRange('12m')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeRange === '12m' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                12 months
              </button>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="mt-4 relative">
            <div className="flex items-center gap-6 mb-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <span>Applications Ingested</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Cleared & Verified</span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 650 190" className="w-full h-48 select-none">
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[40, 80, 120, 160].map((gl) => (
                  <line
                    key={gl}
                    x1="20"
                    y1={gl}
                    x2="630"
                    y2={gl}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Shaded Area under Applications */}
                <path d={pathAreaApplications} fill="url(#blueGradient)" />

                {/* Verified Line */}
                <path
                  d={pathVerified}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Applications Line */}
                <path
                  d={pathApplications}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                {chartPoints.map((pt, i) => (
                  <g
                    key={i}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint === i ? 6 : 4}
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.yVer}
                      r={hoveredPoint === i ? 5 : 3.5}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={pt.x}
                      y="185"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-400 font-medium"
                    >
                      {pt.date}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Hover Tooltip Overlay */}
              {hoveredPoint !== null && (
                <div
                  className="absolute bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs pointer-events-none -translate-x-1/2 z-20"
                  style={{
                    left: `${(chartPoints[hoveredPoint].x / 650) * 100}%`,
                    top: `${(chartPoints[hoveredPoint].y / 190) * 100 - 35}%`
                  }}
                >
                  <p className="font-bold text-slate-200">
                    {chartPoints[hoveredPoint].date}
                  </p>
                  <p className="text-blue-400 font-semibold mt-0.5">
                    Total: {chartPoints[hoveredPoint].applications} submissions
                  </p>
                  <p className="text-emerald-400 font-semibold">
                    Verified: {chartPoints[hoveredPoint].verified} dossiers
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Application Status Distribution (Donut Chart) */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Status Distribution
              </h2>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Active
              </span>
            </div>

            {/* Donut graphic */}
            <div className="relative flex items-center justify-center my-4">
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="11" fill="transparent" />

                {/* Verified (69%) -> strokeDasharray 165, offset 0 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#10b981"
                  strokeWidth="11"
                  strokeDasharray="165 240"
                  strokeDashoffset="0"
                  fill="transparent"
                />

                {/* Needs Review (19%) -> strokeDasharray 45, offset -165 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#f59e0b"
                  strokeWidth="11"
                  strokeDasharray="45 240"
                  strokeDashoffset="-165"
                  fill="transparent"
                />

                {/* Pending (10%) -> strokeDasharray 24, offset -210 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#38bdf8"
                  strokeWidth="11"
                  strokeDasharray="24 240"
                  strokeDashoffset="-210"
                  fill="transparent"
                />

                {/* Rejected (2%) -> strokeDasharray 5, offset -234 */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#f43f5e"
                  strokeWidth="11"
                  strokeDasharray="5 240"
                  strokeDashoffset="-234"
                  fill="transparent"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 leading-none">
                  1,248
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                  Applications
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown percentages */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-medium">Verified</span>
              </div>
              <span className="font-bold text-slate-900">69%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600 font-medium">Needs Review</span>
              </div>
              <span className="font-bold text-slate-900">19%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-slate-600 font-medium">Pending Processing</span>
              </div>
              <span className="font-bold text-slate-900">10%</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600 font-medium">Rejected / Non-compliant</span>
              </div>
              <span className="font-bold text-slate-900">2%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Verification Activity Table & AI Insights Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Verification Activity Table */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Recent Verification Activity
              </h2>
              <p className="text-xs text-slate-500">
                Latest submissions processed through compliance validation pipeline
              </p>
            </div>

            <button
              onClick={() => navigate('/applications')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
            >
              <span>View All Applications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Application ID</th>
                  <th className="py-2.5 px-3">Applicant Name</th>
                  <th className="py-2.5 px-3">Documents</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {applications.slice(0, 5).map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/applications/${app.id}`)}
                  >
                    <td className="py-3 px-3 font-mono font-semibold text-blue-600 group-hover:underline">
                      {app.id}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{app.applicantName}</div>
                      <div className="text-[10px] text-slate-400">{app.category}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold">{app.documentsCount}</span>{' '}
                      <span className="text-slate-400">files</span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <PriorityBadge priority={app.riskLevel} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {app.submittedDate}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/applications/${app.id}`);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights (Demo) Widget */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-[#0B132B] to-[#1E293B] p-5 sm:p-6 rounded-2xl text-white shadow-lg flex flex-col justify-between border border-slate-800">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-sky-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    AI Insights
                  </h2>
                  <span className="text-[10px] text-sky-400 font-medium">
                    Simulated Heuristics Engine
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-blue-900/60 text-sky-300 px-2 py-0.5 rounded-md border border-blue-700/60 font-mono">
                DEMO
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {aiSimulatedInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 transition-colors flex items-start gap-3"
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      insight.type === 'error'
                        ? 'bg-rose-500/20 text-rose-400'
                        : insight.type === 'urgent'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-sky-400'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-200 leading-snug">
                      {insight.text}
                    </p>
                    <span className="inline-block mt-1 text-[10px] text-slate-400">
                      Rule matrix heuristic check
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <button
              onClick={() => navigate('/applications')}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Examine Flagged Applications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2 italic">
              Results shown are generated by frontend mock pipeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
