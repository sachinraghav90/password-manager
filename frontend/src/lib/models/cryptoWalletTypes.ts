import { CommonFieldEntry } from './loginTypes';

export interface CryptoWalletFormState {
  title: string;
  recoveryPhrase: string;
  passwordValue: string;
  walletAddress: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type CryptoWalletPayload = Omit<CryptoWalletFormState, 'favorite'>;

export const defaultCryptoWalletFormState = (): CryptoWalletFormState => ({
  title: 'Crypto Wallet',
  recoveryPhrase: '',
  passwordValue: '',
  walletAddress: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
