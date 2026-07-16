import { CommonFieldEntry } from './loginTypes';

export interface BankAccountFormState {
  title: string;
  bankName: string;
  nameOnAccount: string;
  type: string;
  routingNumber: string;
  accountNumber: string;
  swift: string;
  iban: string;
  pin: string;
  phone: string;
  address: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type BankAccountPayload = Omit<BankAccountFormState, 'favorite'>;

export const defaultBankAccountFormState = (): BankAccountFormState => ({
  title: 'Bank Account',
  bankName: '',
  nameOnAccount: '',
  type: '',
  routingNumber: '',
  accountNumber: '',
  swift: '',
  iban: '',
  pin: '',
  phone: '',
  address: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
