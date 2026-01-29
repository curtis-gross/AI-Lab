export enum AppMode {
  HOME = 'HOME',
  DEAL_GENERATOR = 'DEAL_GENERATOR',
  ADMIN = 'ADMIN'
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
}
