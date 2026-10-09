import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCheck,
  ChevronDown,
  CornerDownRight,
  ExternalLink,
  ShieldAlert,
  Sliders,
} from "lucide-react";

import { liveApi } from "../api";
import { DICT, type Language } from "../i18n";
import type { CandidateDetail, ReviewAction } from "../types";
import { ConsoleBadge } from "./ConsoleBadge";

const STAMP_LABELS: Record<ReviewAction, "approved" | "rejected" | "deferred" | "blocklisted"> = {
  approve: "approved",
  reject: "rejected",
  defer: "deferred",
  blocklist: "blocklisted",
};

export const CandidateDetailView: React.FC<{
  candidateId: string;
  onBackToInbox: () => void;
  actorId: string;
  onSaveActorId: (id: string) => void;
  lang: Language;
}> = ({ candidateId, onBackToInbox, actorId, onSaveActorId, lang }) => {
  const [data, setData] = useState<CandidateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stampType, setStampType] = useState<"approved" | "rejected" | "deferred" | "blocklisted" | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);
  const [activeSubmitting, setActiveSubmitting] = useState<ReviewAction | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ action: "reject" | "blocklist" } | null>(null);
  const [actorPromptOpen, setActorPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
  const [tempActorInput, setTempActorInput] = useState(actorId);

  const d = DICT[lang];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const item = await liveApi.getCandidate(candidateId);
      setData(item);
    } catch (err: unknown) {
      setError((err as Error)?.message || "NODE_READ_FAILURE");
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const executeAction = async (action: ReviewAction, currentActor: string) => {
    if (!data) return;
    setActiveSubmitting(action);

    try {
      await liveApi.submitReview(data.id, action, currentActor, data.version);

      setStampType(STAMP_LABELS[action]);

      setTimeout(() => {
        setIsFadingOut(true);
      }, 350);

      setTimeout(() => {
        onBackToInbox();
      }, 650);
    } catch (err: unknown) {
      alert((err as Error)?.message || "OPERATION_FAILED");
      loadData();
      setActiveSubmitting(null);
    }
  };

  const handleActionClick = (action: ReviewAction) => {
    if (!actorId) {
      setPendingAction(action);
      setActorPromptOpen(true);
      return;
    }
    if (action === "reject" || action === "blocklist") {
      setConfirmModal({ action });
      return;
    }
    executeAction(action, actorId);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (confirmModal || actorPromptOpen || activeSubmitting) return;

      if (e.key === "a" || e.key === "A") {
        handleActionClick("approve");
      } else if (e.key === "d" || e.key === "D") {
        handleActionClick("defer");
      } else if (e.key === "r" || e.key === "R") {
        handleActionClick("reject");
      } else if (e.key === "b" || e.key === "B") {
        handleActionClick("blocklist");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleActorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempActorInput.trim()) return;
    onSaveActorId(tempActorInput.trim());
    setActorPromptOpen(false);
    if (pendingAction) {
      if (pendingAction === "reject" || pendingAction === "blocklist") {
        setConfirmModal({ action: pendingAction });
      } else {
        executeAction(pendingAction, tempActorInput.trim());
      }
      setPendingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4 font-mono">
        <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-28 bg-white dark:bg-[#10141C] border border-slate-200 dark:border-slate-800 rounded-md animate-shimmer" />
            <div className="h-44 bg-white dark:bg-[#10141C] border border-slate-200 dark:border-slate-800 rounded-md animate-shimmer" />
          </div>
          <div className="lg:col-span-4 h-60 bg-white dark:bg-[#10141C] border border-slate-200 dark:border-slate-800 rounded-md animate-shimmer" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto my-20 bg-white dark:bg-[#10141C] border border-slate-200 dark:border-slate-800 rounded-md p-8 text-center space-y-4 font-mono">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
        <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">{error}</div>
        <button
          onClick={onBackToInbox}
          className="px-4 py-1.5 text-xs font-bold uppercase bg-blue-600 text-white rounded-md hover:bg-blue-500"
        >
          {d.backToInbox}
        </button>
      </div>
    );
  }

  const allEvidences = data.evidence;

  return (
    <div
      className={`max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-12 space-y-5 transition-all duration-300 ease-out font-mono ${
        isFadingOut ? "opacity-0 -translate-y-3 pointer-events-none" : "opacity-100 translate-y-0"
      }`}
    >
      <div>
        <button
          onClick={onBackToInbox}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{d.backToInbox}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 左侧案卷遥测区 */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. 资产标头 */}
          <section className="relative bg-white dark:bg-[#10141C] border border-slate-200/90 dark:border-slate-800/90 rounded-lg p-6 shadow-xs">
            {stampType && (
              <div
                className={`absolute right-6 top-6 pointer-events-none select-none z-20 font-mono font-black tracking-widest text-xs sm:text-sm uppercase px-3 py-1 rounded-sm border transition-all duration-150 animate-stamp ${
                  stampType === "approved"
                    ? "text-emerald-500 border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    : stampType === "rejected" || stampType === "blocklisted"
                    ? "text-rose-500 border-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                    : "text-amber-500 border-amber-500 bg-amber-500/10"
                }`}
              >
                [{stampType.toUpperCase()}]
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                <span>IDENTIFIER: {data.id}</span>
                <span>STATUS: {d.pendingStatus}</span>
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {data.domain}
                </h1>
                <a
                  href={data.canonicalUrl || `https://${data.domain}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>{d.visitSite}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {data.displayName && (
                <div className="text-xs text-slate-500 font-bold">
                  CANONICAL_REF: {data.displayName}
                </div>
              )}
            </div>
          </section>

          {/* 2. 遥测链面板 */}
          <section className="bg-white dark:bg-[#10141C] border border-slate-200/90 dark:border-slate-800/90 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
              <span className="text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                {d.whyInboxHeading}
              </span>
              <span className="text-[10px] text-slate-400">TELEMETRY_PIPELINE</span>
            </div>

            <div className="space-y-3">
              {allEvidences.map((ev, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-slate-800/70 rounded-md space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <CornerDownRight className="w-3 h-3 text-slate-400" />
                      {ev.title}
                    </span>
                    <ConsoleBadge status={ev.status} lang={lang} />
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 font-sans leading-relaxed text-[11px] pl-4">
                    {ev.explanation}
                  </p>

                  {ev.quote && (
                    <div className="ml-4 p-2 bg-slate-100 dark:bg-slate-900 border-l-2 border-blue-500 text-[11px] text-slate-800 dark:text-slate-300 font-mono">
                      PAYLOAD_DIFF: “{ev.quote}”
                    </div>
                  )}

                  {ev.observedAt && (
                    <div className="pl-4 text-[10px] text-slate-400 dark:text-slate-500">
                      {d.observedAt}{new Date(ev.observedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 3. 模型意图判定 */}
          <section className="bg-white dark:bg-[#10141C] border border-slate-200/90 dark:border-slate-800/90 rounded-lg p-5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {d.productAssessmentHeading}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              {data.productSummary || "NO_SUMMARY_AVAILABLE"}
            </p>
            <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-4 border-t border-slate-100 dark:border-slate-800/80">
              <span>{d.classificationConclusion}{data.verdict.label}</span>
              {data.verdict.confidence && (
                <span>{d.confidence}{(data.verdict.confidence * 100).toFixed(0)}%</span>
              )}
            </div>
          </section>

          {/* 4. 底层探针报文 */}
          <section className="bg-white dark:bg-[#10141C] border border-slate-200/90 dark:border-slate-800/90 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setAuditOpen(!auditOpen)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
            >
              <span>{d.viewAuditData}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${auditOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-all duration-200 border-t border-slate-200 dark:border-slate-800 ${auditOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="p-4 bg-black text-emerald-400 text-xs overflow-x-auto">
                  <pre className="text-[11px] leading-relaxed">{JSON.stringify(data.audit || { id: data.id }, null, 2)}</pre>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 右侧吸顶机架操作台中控条 */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-20">
          <div className="bg-white dark:bg-[#10141C] border border-slate-200/90 dark:border-slate-800/90 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="font-bold text-xs tracking-wider uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                {d.reviewPanelTitle}
              </span>
              <span className="text-[10px] text-emerald-500 font-bold">ONLINE</span>
            </div>

            {/* 操作员徽章 */}
            <div className="p-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-md space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>{d.currentReviewer}</span>
                <button
                  onClick={() => setActorPromptOpen(true)}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                  {d.changeReviewer}
                </button>
              </div>
              <div className="font-bold text-slate-900 dark:text-white truncate">
                {actorId ? actorId : <span className="font-normal text-amber-500">{d.firstReviewPrompt}</span>}
              </div>
            </div>

            {/* 控制台操作指令 */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={activeSubmitting !== null}
                onClick={() => handleActionClick("approve")}
                className="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-xs transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{activeSubmitting === "approve" ? d.approving : d.approveBtn}</span>
              </button>

              <button
                type="button"
                disabled={activeSubmitting !== null}
                onClick={() => handleActionClick("defer")}
                className="w-full py-2 text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition disabled:opacity-50"
              >
                {activeSubmitting === "defer" ? d.submitting : d.deferBtn}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={activeSubmitting !== null}
                  onClick={() => handleActionClick("reject")}
                  className="w-full py-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-md transition disabled:opacity-50"
                >
                  {activeSubmitting === "reject" ? d.submitting : d.rejectBtn}
                </button>
                <button
                  type="button"
                  disabled={activeSubmitting !== null}
                  onClick={() => handleActionClick("blocklist")}
                  className="w-full py-2 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-950/40 border border-rose-900 hover:bg-rose-900/50 rounded-md transition disabled:opacity-50"
                >
                  {activeSubmitting === "blocklist" ? d.submitting : d.blocklistBtn}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 移动端吸底控制栏 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#10141C]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-3 px-4 z-40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {actorId ? (
              <span>
                {d.currentReviewer} <strong>{actorId}</strong>{" "}
                <button onClick={() => setActorPromptOpen(true)} className="text-blue-600 underline ml-1 font-bold">
                  {d.changeReviewer}
                </button>
              </span>
            ) : (
              <span>{d.firstReviewPrompt}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activeSubmitting !== null}
              onClick={() => handleActionClick("defer")}
              className="px-3.5 py-1.5 text-xs font-bold uppercase border border-slate-200 dark:border-slate-700 rounded-md disabled:opacity-50"
            >
              {d.deferBtn}
            </button>
            <button
              type="button"
              disabled={activeSubmitting !== null}
              onClick={() => handleActionClick("reject")}
              className="px-3.5 py-1.5 text-xs font-bold uppercase text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-md disabled:opacity-50"
            >
              {d.rejectBtn}
            </button>
            <button
              type="button"
              disabled={activeSubmitting !== null}
              onClick={() => handleActionClick("blocklist")}
              className="px-3.5 py-1.5 text-xs font-bold uppercase text-rose-300 border border-rose-900 rounded-md disabled:opacity-50"
            >
              {d.blocklistBtn}
            </button>
            <button
              type="button"
              disabled={activeSubmitting !== null}
              onClick={() => handleActionClick("approve")}
              className="px-4 py-1.5 text-xs font-bold uppercase text-white bg-blue-600 rounded-md disabled:opacity-50"
            >
              {d.approveBtn}
            </button>
          </div>
        </div>
      </div>

      {/* 操作员签名弹窗 */}
      {actorPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleActorSubmit}
            className="w-full max-w-sm bg-white dark:bg-[#10141C] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4 shadow-2xl text-xs"
          >
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase">{d.actorModalTitle}</h3>
            <p className="text-slate-500 font-sans leading-relaxed">{d.actorModalDesc}</p>
            <input
              type="text"
              required
              autoFocus
              value={tempActorInput}
              onChange={(e) => setTempActorInput(e.target.value)}
              placeholder={d.actorPlaceholder}
              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-white rounded-md focus:outline-hidden focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2 font-mono">
              <button
                type="button"
                onClick={() => {
                  setActorPromptOpen(false);
                  setPendingAction(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              >
                {d.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold uppercase bg-blue-600 text-white rounded-md hover:bg-blue-500"
              >
                {d.confirm}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 二次确认弹窗 */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#10141C] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <h3 className="font-bold text-sm uppercase">
                {confirmModal.action === "reject" ? d.rejectConfirmTitle : d.blocklistConfirmTitle}
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
              {confirmModal.action === "reject" ? d.rejectConfirmDesc : d.blocklistConfirmDesc}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              >
                {d.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  const act = confirmModal.action;
                  setConfirmModal(null);
                  executeAction(act, actorId);
                }}
                className="px-4 py-1.5 text-xs font-bold uppercase bg-rose-600 text-white rounded-md hover:bg-rose-500"
              >
                {d.executeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
