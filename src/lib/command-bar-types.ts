// Command Bar type definitions — shared between frontend and backend

export interface CommandBarMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  searchResults?: SearchResult[];
  suggestions?: string[];
}

export interface SearchResult {
  id: string;
  type:
    | "deal"
    | "entity"
    | "asset"
    | "investor"
    | "contact"
    | "company"
    | "document"
    | "task"
    | "meeting"
    | "page";
  title: string;
  subtitle: string;
  url: string;
  metadata?: Record<string, string>;
  relevanceScore?: number;
}

export interface AIResponse {
  message: string;
  searchResults: SearchResult[];
  suggestions: string[];
}

export interface CommandAction {
  id: string;
  label: string;
  description: string;
  category: "navigation" | "action" | "create";
  keywords: string[];
  path?: string;
  actionId?: string;
  icon: string;
  priority: number;
}

export interface AgentCapability {
  agent: string;
  name: string;
  description: string;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: unknown;
  routed_to?: string;
  routing_confidence?: number;
  searchResults?: SearchResult[];
  suggestions?: string[];
}

export interface DatabaseContext {
  firm: { id: string; name: string } | null;
  dealsByStage: Record<string, number>;
  totalDeals: number;
  entitiesByType: Record<string, number>;
  totalEntities: number;
  assetsByClass: Record<string, number>;
  totalAssets: number;
  totalFairValue: number;
  totalCostBasis: number;
  investorCount: number;
  totalCommitted: number;
  tasksByStatus: Record<string, number>;
  recentActivity: { description: string; createdAt: string }[];
}
