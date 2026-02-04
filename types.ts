export enum AppMode {
  HOME = 'HOME',
  DEAL_GENERATOR = 'DEAL_GENERATOR',
  ADMIN = 'ADMIN',
  HISTORY_VIEWER = 'HISTORY_VIEWER',
  DEAL_RESIZER = 'DEAL_RESIZER'
}

export interface CompanyConfig {
  name: string;
  colors: {
    primaryDark: string;
    secondaryLight: string;
  };
  logos: {
    dark: string; // Base64 or URL
    light: string; // Base64 or URL
  };
  guidelines: string;
  font?: string;
}

export interface GeneratedResult {
  companyId: string;
  companyName: string;
  ratio: string;
  imageUrl: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  tagline: string;
  activeTab: 'new' | 'include_product';
  results: GeneratedResult[];
  companyCount: number;
}
