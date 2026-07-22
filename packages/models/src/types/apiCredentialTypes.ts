import { CommonFieldEntry } from './loginTypes';

export interface ApiCredentialFormState {
  title: string;
  username: string;
  credentialValue: string;
  type: string;
  filename: string;
  validatesFrom: string;
  expires: string;
  hostName: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type ApiCredentialPayload = Omit<ApiCredentialFormState, 'favorite'>;

export const defaultApiCredentialFormState = (): ApiCredentialFormState => ({
  title: 'API Credential',
  username: '',
  credentialValue: '',
  type: '',
  filename: '',
  validatesFrom: '',
  expires: '',
  hostName: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
