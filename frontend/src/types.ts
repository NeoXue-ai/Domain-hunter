export type ReviewState = "pending" | "approved" | "deferred" | "rejected" | "blocklisted";
export type EvidenceStatus = "passed" | "unknown" | "failed";

export interface EvidenceItem {
  category: "newness" | "reachability" | "product" | "classification";
  status: EvidenceStatus;
  title: string;
  explanation: string;
  observedAt?: string;
  sourceUrl?: string;
  quote?: string;
}

export interface CandidateSummary {
  id: string;
  version: number;
  domain: string;
  displayName?: string;
  canonicalUrl?: string;
  reviewState: ReviewState;
  verdict: {
    label: string;
    confidence?: number;
  };
  priority: number;
  newness: {
    status: EvidenceStatus;
    summary: string;
  };
  reachability: {
    status: EvidenceStatus;
    summary: string;
  };
  productSummary?: string;
  updatedAt: string;
}

export interface CandidateDetail extends CandidateSummary {
  evidence: EvidenceItem[];
  audit?: {
    sourceEvents: unknown[];
    observations: unknown[];
    decisionHistory: unknown[];
  };
}

export type ReviewAction = "approve" | "defer" | "reject" | "blocklist";
