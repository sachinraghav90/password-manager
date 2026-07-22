import { CommonFieldEntry } from './loginTypes';

export interface CreditCardFormState {
  title: string;              
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  verificationNumber: string;
  validFrom: string;
  type: string;
  issuingBank: string;
  phone: string;
  website: string;
  notes: string;              
  tags: string[];             
  commonFields: CommonFieldEntry[]; 
  favorite: boolean;
}

export type CreditCardPayload = Omit<CreditCardFormState, 'favorite'>;

export const defaultCreditCardFormState = (): CreditCardFormState => ({
  title: 'Credit Card',
  cardholderName: '',
  cardNumber: '',
  expiry: '',
  verificationNumber: '',
  validFrom: '',
  type: '',
  issuingBank: '',
  phone: '',
  website: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
