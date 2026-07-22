import { CommonFieldEntry } from './loginTypes';

export interface SsnFormState {
  title: string;
  name: string;
  number: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type SsnPayload = Omit<SsnFormState, 'favorite'>;

export const defaultSsnFormState = (): SsnFormState => ({
  title: 'Social Security Number',
  name: '',
  number: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
