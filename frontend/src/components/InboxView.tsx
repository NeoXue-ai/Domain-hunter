import React, { useMemo } from "react";
import { Activity, AlertCircle, ArrowRight, Cpu, Search } from "lucide-react";

import { DICT, type Language } from "../i18n";
import type { CandidateSummary } from "../types";
import { LogPanel } from "./LogPanel";

export const InboxView: React.FC<{
  onSelectCandidate: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  candidates: CandidateSummary[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  lang: Language;
}> = ({
  onSelectCandidate,
  searchQuery,
  onSearchChange,
  candidates,
  isLoading,
  error,
  onRetry,
  lang
}) => {
  const d = DICT[lang];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase().trim();
    return candidates.filter(
      (c) =>
        c.domain.toLowerCase().includes(q) ||
        (c.displayName && c.displayName.toLowerCase().includes(q)) ||
        (c.productSummary && c.productSummary.toLowerCase().includes(q))
    );
  }, [candidates, searchQuery]);

  const topCandidate = filtered.length > 0 ? filtered[0] : null;
  const otherCandidates = filtered.length > 1 ? filtered.slice(1) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-mono">
      {/* 顶部遥测与搜索栏 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
              {d.inboxCount.replace("{n}", candidates.length.toString())}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Activity className="w-3 h-3 animate-pulse" />
              {d.pipelineGate}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">{d.inboxSubtitle}</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={d.searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#10141C] border border-slate-200 dark:border-slate-800 rounded-md placeholder-slate-400 dark:placeholder-slate-600 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={onRetry} className="font-bold underline ml-2">
            {d.retry}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-44 bg-slate-200/50 dark:bg-slate-800/40 rounded-lg animate-shimmer border border-slate-200 dark:border-slate-800" />
          <div className="h-20 bg-slate-200/50 dark:bg-slate-800/40 rounded-lg animate-shimmer border border-slate-200 dark:border-slate-800" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-lg p-12 text-center space-y-4">
          <Cpu className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
          <div className="text-sm font-bold tracking-wider text-slate-800 dark:text-slate-300 uppercase">{d.emptyTitle}</div>
          <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto">{d.emptyDesc}</p>
                  </div>
      ) : (
        <div className="space-y-8">
          {/* 1. CRITICAL TARGET: 顶部优先侦查标的 (已去四角加号，纯净亚光包边) */}
          {topCandidate && (
            <section className="space-y-2 animate-cascade">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                <span>{d.topPrioritySection}</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">{topCandidate.id}</span>
              </div>

              <div
                tabIndex={0}
                role="button"
                onClick={() => onSelectCandidate(topCandidate.id)}
                onKeyDown={(e) => e.key === "Enter" && onSelectCandidate(topCandidate.id)}
                className="group relative bg-white dark:bg-[#10141C] border border-slate-200/90 dark:border-slate-800/90 hover:border-blue-500/80 dark:hover:border-blue-500/50 rounded-lg p-6 shadow-xs hover:shadow-md transition-all cursor-pointer focus:outline-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {topCandidate.domain}
                      </span>
                      {topCandidate.displayName && (
                        <span className="text-xs text-slate-500 font-normal">
                          [{topCandidate.displayName}]
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-sm">
                        {topCandidate.verdict.label}
                      </span>
                    </div>

                    {topCandidate.productSummary && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-2xl">
                        {topCandidate.productSummary}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-2">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest">{d.priorityPrefix}</div>
                      <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{topCandidate.priority.toFixed(2)}</div>
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                      <span>{d.viewEvidence}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{d.newnessFact}:</span>
                    <span className="text-slate-700 dark:text-slate-300">{topCandidate.newness.summary}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{d.reachabilityFact}:</span>
                    <span className="text-slate-700 dark:text-slate-300">{topCandidate.reachability.summary}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 2. ACTIVE QUEUE: 控制台紧凑数据行 */}
          {otherCandidates.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                <span>{d.otherCandidatesSection}</span>
                <span>CHANNELS: {otherCandidates.length}</span>
              </div>

              <div className="border border-slate-200/90 dark:border-slate-800/90 divide-y divide-slate-100 dark:divide-slate-800/80 rounded-lg bg-white dark:bg-[#10141C] overflow-hidden">
                {otherCandidates.map((cand, idx) => (
                  <div
                    key={cand.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => onSelectCandidate(cand.id)}
                    onKeyDown={(e) => e.key === "Enter" && onSelectCandidate(cand.id)}
                    style={{ animationDelay: `${(idx + 1) * 35}ms` }}
                    className="animate-cascade group px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#141A24] transition-colors cursor-pointer focus:outline-hidden"
                  >
                    <div className="flex items-baseline gap-3 truncate">
                      <span className="text-xs text-slate-400 dark:text-slate-600 font-bold">
                        {String(idx + 2).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cand.domain}
                      </span>
                      {cand.displayName && (
                        <span className="text-xs text-slate-500 truncate hidden md:inline">
                          [{cand.displayName}]
                        </span>
                      )}
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate font-sans">
                        · {cand.productSummary || cand.newness.summary}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 text-xs">
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                        SCORE:{cand.priority.toFixed(2)}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>OPEN</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <LogPanel lang={lang} />
    </div>
  );
};
