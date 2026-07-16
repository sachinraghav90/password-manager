import { CommonFieldEntry } from './loginTypes';

export interface IdentityFormState {
  title: string;
  firstName: string;
  initial: string;
  lastName: string;
  gender: string;
  birthDate: string;
  occupation: string;
  company: string;
  department: string;
  jobTitle: string;
  address: string;
  defaultPhone: string;
  homePhone: string;
  cellPhone: string;
  businessPhone: string;
  username: string;
  reminderQuestion: string;
  reminderAnswer: string;
  email: string;
  website: string;
  icq: string;
  skype: string;
  aolAim: string;
  yahoo: string;
  msn: string;
  forumSignature: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type IdentityPayload = Omit<IdentityFormState, 'favorite'>;

export const defaultIdentityFormState = (): IdentityFormState => ({
  title: 'Identity',
  firstName: '',
  initial: '',
  lastName: '',
  gender: '',
  birthDate: '',
  occupation: '',
  company: '',
  department: '',
  jobTitle: '',
  address: '',
  defaultPhone: '',
  homePhone: '',
  cellPhone: '',
  businessPhone: '',
  username: '',
  reminderQuestion: '',
  reminderAnswer: '',
  email: '',
  website: '',
  icq: '',
  skype: '',
  aolAim: '',
  yahoo: '',
  msn: '',
  forumSignature: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
