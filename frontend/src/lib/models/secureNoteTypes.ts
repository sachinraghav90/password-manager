import { CommonFieldEntry } from './loginTypes';

export interface SecureNoteFormState {
  title: string;              
  notes: string;              
  tags: string[];             
  commonFields: CommonFieldEntry[]; 
  favorite: boolean;
}

export type SecureNotePayload = Omit<SecureNoteFormState, 'favorite'>;

export const defaultSecureNoteFormState = (): SecureNoteFormState => ({
  title: 'Secure Note',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
