export enum AppMode {
  HOME = 'HOME',
  LOGIN = 'LOGIN',
  IMAGE_GENERATOR = 'IMAGE_GENERATOR',
  ADMIN_COMPANIES = 'ADMIN_COMPANIES',
  ADMIN_TEMPLATES = 'ADMIN_TEMPLATES',
  ADMIN_IMAGE_SIZES = 'ADMIN_IMAGE_SIZES',
  HISTORY_VIEWER = 'HISTORY_VIEWER',
  IMAGE_RESIZER = 'IMAGE_RESIZER',
  TEMPLATE_TO_BANNER = 'TEMPLATE_TO_BANNER',
  ADMIN_USERS = 'ADMIN_USERS',
  HELP_CENTER = 'HELP_CENTER'
}

export interface User {
  username: string;
  name: string;
  initials: string;
  role: 'admin' | 'user' | 'guest';
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
  warning?: string; // Optional warning, e.g. "Ratio adjusted from 8:1 to 21:9"
}

export interface ImageSize {
  id: string;
  label: string;
  ratio: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  tagline: string;
  activeTab?: 'new' | 'include_product'; // Optional now for legacy/deal generator
  type?: 'image_generator' | 'image_resizer' | 'template_to_banner'; // New discriminator
  results: GeneratedResult[];
  companyCount: number;
}
