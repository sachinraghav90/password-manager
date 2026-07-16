import { CommonFieldEntry } from './loginTypes';

export interface SshKeyFormState {
  title: string;
  hostname: string;
  privateKey: string;
  publicKey: string;
  passphrase: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type SshKeyPayload = Omit<SshKeyFormState, 'favorite'>;

export const defaultSshKeyFormState = (): SshKeyFormState => ({
  title: 'SSH Key',
  hostname: '',
  privateKey: '',
  publicKey: '',
  passphrase: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
