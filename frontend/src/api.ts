import type {
  CandidateDetail,
  CandidateSummary,
  ReviewAction,
  ReviewState,
} from "./types";

/** The raw `/v1` payload; the API shape is wide, so it stays loosely typed here. */
type BackendCandidate = Record<string, any>;

const REVIEW_STATES: Record<string, ReviewState> = {
  approve: "approved",
  defer: "deferred",
  reject: "rejected",
  blocklist: "blocklisted",
};

const statusSummary = (item: BackendCandidate, key: "newness" | "reachability") => {
  const fact = item[key] || {};
  if (fact.status !== "passed") return fact.status === "failed" ? "不通过" : "未验证";
  if (key === "newness") return `CT 首见${fact.ct_first_seen_at ? ` ${fact.ct_first_seen_at}` : ""}${typeof fact.rdap_age_days === "number" ? ` · RDAP ${fact.rdap_age_days} 天` : ""}`;
  return `HTTP ${fact.http_status_code ?? "已验证"}${fact.same_root === true ? " · 根域名一致" : ""}`;
};

const toCandidate = (item: BackendCandidate): CandidateDetail => ({
  id: item.candidate_id,
  version: item.version,
  domain: item.domain,
  displayName: item.name_suggestion || undefined,
  canonicalUrl: item.canonical_url || undefined,
  reviewState: item.review_state === "pending" ? "pending" : REVIEW_STATES[item.review_state] || "pending",
  verdict: { label: item.primary_outcome || "待判断", confidence: item.classification_confidence },
  priority: item.priority?.score ?? 0,
  newness: { status: item.newness?.status || "unknown", summary: statusSummary(item, "newness") },
  reachability: { status: item.reachability?.status || "unknown", summary: statusSummary(item, "reachability") },
  productSummary: item.description_suggestion || undefined,
  updatedAt: item.newness?.checked_at || "",
  evidence: [
    { category: "newness", status: item.newness?.status || "unknown", title: "CT 与 RDAP 新网站证据", explanation: statusSummary(item, "newness"), observedAt: item.newness?.checked_at },
    { category: "reachability", status: item.reachability?.status || "unknown", title: "可访问性与根域名一致性", explanation: statusSummary(item, "reachability"), sourceUrl: item.reachability?.final_url || item.canonical_url },
    ...(item.evidence || []).map((e: BackendCandidate) => ({ category: "product" as const, status: "passed" as const, title: e.type || "产品证据", explanation: e.quote, quote: e.quote, sourceUrl: e.url })),
  ],
  audit: item.audit ? { sourceEvents: [], observations: [], decisionHistory: item.audit.decisions || [] } : undefined,
});

async function readJson(response: Response): Promise<BackendCandidate> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`);
  return body;
}

export const liveApi = {
  async fetchCandidates(): Promise<CandidateSummary[]> {
    const body = await readJson(await fetch("/v1/review-queue", { cache: "no-store" }));
    return (body.items || []).map(toCandidate);
  },
  async getCandidate(id: string): Promise<CandidateDetail> {
    const body = await readJson(
      await fetch(`/v1/candidates/${encodeURIComponent(id)}/review-context`, { cache: "no-store" })
    );
    return toCandidate(body);
  },
  async fetchLog(tail = 120): Promise<string[]> {
    const body = await readJson(
      await fetch(`/v1/discovery/log?tail=${tail}`, { cache: "no-store" })
    );
    return body.lines || [];
  },
  async submitReview(id: string, action: ReviewAction, actorId: string, version: number): Promise<void> {
    await readJson(
      await fetch(`/v1/candidates/${encodeURIComponent(id)}/versions/${version}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Actor-ID": actorId },
        body: JSON.stringify({ request_id: crypto.randomUUID(), action, reason_tags: [] }),
      })
    );
  },
};
