import { useCallback, useEffect, useState } from "react";
import { Languages, Moon, Sun } from "lucide-react";

import { liveApi } from "./api";
import { CandidateDetailView } from "./components/CandidateDetailView";
import { InboxView } from "./components/InboxView";
import { DICT, type Language, type Theme } from "./i18n";
import type { CandidateSummary } from "./types";

const routeFromLocation = () => {
  const match = window.location.pathname.match(/^\/review\/([^/]+)$/);
  return match ? `#/candidate/${decodeURIComponent(match[1])}` : "#/";
};

const detailIdFromRoute = (route: string) => {
  const match = route.match(/^#\/candidate\/([^/]+)$/);
  return match ? match[1] : null;
};

export default function App() {
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentRoute, setCurrentRoute] = useState<string>(routeFromLocation);
  const [actorId, setActorId] = useState<string>(() => localStorage.getItem("dh_actor_id") || "");

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem("dh_lang") as Language) || "zh";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("dh_theme") as Theme) || "dark";
  });

  const [themeRotating, setThemeRotating] = useState(false);
  const [langRotating, setLangRotating] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
    }
    localStorage.setItem("dh_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("dh_lang", lang);
  }, [lang]);

  useEffect(() => {
    const handleNavigation = () => {
      setCurrentRoute(routeFromLocation());
    };
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await liveApi.fetchCandidates();
      setCandidates(data);
    } catch (err: unknown) {
      setListError((err as Error)?.message || "STREAM_POLL_FAILED");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const navigateTo = (hash: string) => {
    const detail = detailIdFromRoute(hash);
    const path = detail ? `/review/${encodeURIComponent(detail)}` : "/";
    window.history.pushState({}, "", path);
    setCurrentRoute(hash);
  };

  const handleSaveActorId = (id: string) => {
    setActorId(id);
    localStorage.setItem("dh_actor_id", id);
  };

  const toggleTheme = () => {
    setThemeRotating(true);
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    setTimeout(() => setThemeRotating(false), 250);
  };

  const toggleLang = () => {
    setLangRotating(true);
    setLang((prev) => (prev === "zh" ? "en" : "zh"));
    setTimeout(() => setLangRotating(false), 250);
  };

  const d = DICT[lang];
  const activeCandidateId = detailIdFromRoute(currentRoute);

  return (
    <div className="min-h-screen bg-ambient-console text-slate-900 dark:text-slate-100 font-mono antialiased selection:bg-blue-500/20 selection:text-blue-500 transition-colors duration-200">
      {/* 极简工程顶栏 */}
      <header className="h-13 bg-white/80 dark:bg-[#090B10]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 font-mono">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-black tracking-tight text-sm text-slate-900 dark:text-white uppercase">
              DomainHunter
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs text-slate-500 font-bold uppercase">
              {d.brandSubtitle}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleLang}
              className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-md transition inline-flex items-center gap-1 active:scale-95"
              title="Switch Language"
            >
              <Languages
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-250 ${
                  langRotating ? "rotate-180" : "rotate-0"
                }`}
              />
              <span className="font-mono text-[10px] font-bold uppercase">{lang}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-md transition active:scale-95"
              title="Toggle Theme"
            >
              <div className={`transition-transform duration-250 ${themeRotating ? "rotate-180" : "rotate-0"}`}>
                {theme === "light" ? (
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
            </button>

            <div className="h-3 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

                      </div>
        </div>
      </header>

      {/* 主视区 */}
      <main>
        {activeCandidateId ? (
          <CandidateDetailView
            candidateId={activeCandidateId}
            onBackToInbox={() => navigateTo("#/")}
            actorId={actorId}
            onSaveActorId={handleSaveActorId}
            lang={lang}
          />
        ) : (
          <InboxView
            candidates={candidates}
            isLoading={isLoading}
            error={listError}
            onRetry={loadCandidates}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCandidate={(id) => navigateTo(`#/candidate/${id}`)}
            lang={lang}
          />
        )}
      </main>

    </div>
  );
}
