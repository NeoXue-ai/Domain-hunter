import React from "react";
import { HelpCircle, XCircle } from "lucide-react";

import { DICT, type Language } from "../i18n";
import type { EvidenceStatus } from "../types";

export const ConsoleBadge: React.FC<{
  status: EvidenceStatus;
  text?: string;
  lang: Language;
}> = ({ status, text, lang }) => {
  const d = DICT[lang];
  if (status === "passed") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-mono text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {text || d.statusPassed}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-mono text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
        <XCircle className="w-2.5 h-2.5" />
        {text || d.statusFailed}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-mono text-[10px] font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30">
      <HelpCircle className="w-2.5 h-2.5" />
      {text || d.statusUnknown}
    </span>
  );
};
