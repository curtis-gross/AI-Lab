export enum AppMode {
  HOME = 'HOME',
  DEAL_GENERATOR = 'DEAL_GENERATOR',
  ADMIN = 'ADMIN',
  HISTORY_VIEWER = 'HISTORY_VIEWER',
  DEAL_RESIZER = 'DEAL_RESIZER',
  TEMPLATE_TO_BANNER = 'TEMPLATE_TO_BANNER'
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

export interface TemplateConfig {
  id: string;
  name: string;
  text: string;
  imageUrl: string;
  analysis?: string;
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
  activeTab?: 'new' | 'include_product'; // Optional now for legacy/deal generator
  type?: 'deal_generator' | 'deal_resizer' | 'template_to_banner'; // New discriminator
  results: GeneratedResult[];
  companyCount: number;
}
