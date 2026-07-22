import { CommonFieldEntry } from './loginTypes';

export interface PasswordFormState {
  title: string;
  username: string;
  passwordValue: string;
  website: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type PasswordPayload = Omit<PasswordFormState, 'favorite'>;

export const defaultPasswordFormState = (): PasswordFormState => ({
  title: 'Password',
  username: '',
  passwordValue: '',
  website: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
