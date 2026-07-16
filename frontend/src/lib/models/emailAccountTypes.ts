import { CommonFieldEntry } from './loginTypes';

export interface EmailAccountFormState {
  title: string;
  type: string;
  username: string;
  server: string;
  port: string;
  passwordValue: string;
  security: string;
  authMethod: string;
  
  smtpServer: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPasswordValue: string;
  smtpSecurity: string;
  smtpAuthMethod: string;

  provider: string;
  providerWebsite: string;
  providerPhone: string;

  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type EmailAccountPayload = Omit<EmailAccountFormState, 'favorite'>;

export const defaultEmailAccountFormState = (): EmailAccountFormState => ({
  title: 'Email Account',
  type: '',
  username: '',
  server: '',
  port: '',
  passwordValue: '',
  security: '',
  authMethod: '',
  
  smtpServer: '',
  smtpPort: '',
  smtpUsername: '',
  smtpPasswordValue: '',
  smtpSecurity: '',
  smtpAuthMethod: '',

  provider: '',
  providerWebsite: '',
  providerPhone: '',

  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
