import { CommonFieldEntry } from './loginTypes';

export interface ServerFormState {
  title: string;
  url: string;
  username: string;
  password: string;
  
  // Admin Console
  adminConsoleUrl: string;
  adminConsoleUsername: string;
  adminPassword: string;
  
  // Hosting Provider
  hostingProviderName: string;
  hostingProviderWebsite: string;
  supportUrl: string;
  supportPhone: string;
  
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type ServerPayload = Omit<ServerFormState, 'favorite'>;

export const defaultServerFormState = (): ServerFormState => ({
  title: 'Server',
  url: '',
  username: '',
  password: '',
  
  adminConsoleUrl: '',
  adminConsoleUsername: '',
  adminPassword: '',
  
  hostingProviderName: '',
  hostingProviderWebsite: '',
  supportUrl: '',
  supportPhone: '',
  
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
