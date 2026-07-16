import { CommonFieldEntry } from './loginTypes';

export interface OutdoorLicenseFormState {
  title: string;
  fullName: string;
  validFrom: string;
  expire: string;
  approvedWildlife: string;
  maximumQuota: string;
  state: string;
  country: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type OutdoorLicensePayload = Omit<OutdoorLicenseFormState, 'favorite'>;

export const defaultOutdoorLicenseFormState = (): OutdoorLicenseFormState => ({
  title: 'Outdoor License',
  fullName: '',
  validFrom: '',
  expire: '',
  approvedWildlife: '',
  maximumQuota: '',
  state: '',
  country: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
