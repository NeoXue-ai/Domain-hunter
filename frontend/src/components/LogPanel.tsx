import React, { useEffect, useState } from "react";
import { Terminal } from "lucide-react";

import { liveApi } from "../api";
import { DICT, type Language } from "../i18n";

const REFRESH_MS = 5000;

export const LogPanel: React.FC<{ lang: Language }> = ({ lang }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [exists, setExists] = useState(true);
  const d = DICT[lang];

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const fetched = await liveApi.fetchLog();
        if (!alive) return;
        setExists(true);
        setLines(fetched);
      } catch {
        if (alive) setExists(false);
      }
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#141A24] text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Terminal className="w-3 h-3 text-blue-500" />
        <span>{d.runtimeLog}</span>
        <span className="ml-auto text-slate-400 dark:text-slate-600">auto-refresh 5s</span>
      </div>
      <pre className="px-4 py-3 max-h-64 overflow-auto text-[10px] leading-relaxed font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-black/40">
        {lines.length === 0 ? d.runtimeLogEmpty : lines.join("\n")}
      </pre>
    </section>
  );
};
