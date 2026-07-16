import { CommonFieldEntry } from './loginTypes';

export interface PassportFormState {
  title: string;
  type: string;
  issuingCountry: string;
  number: string;
  fullName: string;
  gender: string;
  nationality: string;
  issuingAuthority: string;
  dateOfBirth: string;
  placeOfBirth: string;
  issuedOn: string;
  expiryDate: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type PassportPayload = Omit<PassportFormState, 'favorite'>;

export const defaultPassportFormState = (): PassportFormState => ({
  title: 'Passport',
  type: '',
  issuingCountry: '',
  number: '',
  fullName: '',
  gender: '',
  nationality: '',
  issuingAuthority: '',
  dateOfBirth: '',
  placeOfBirth: '',
  issuedOn: '',
  expiryDate: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
