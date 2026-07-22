import { CommonFieldEntry } from './loginTypes';

export interface DrivingLicenseFormState {
  title: string;
  fullName: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  height: string;
  number: string;
  licenseClass: string;
  conditions: string;
  state: string;
  country: string;
  expiryDate: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type DrivingLicensePayload = Omit<DrivingLicenseFormState, 'favorite'>;

export const defaultDrivingLicenseFormState = (): DrivingLicenseFormState => ({
  title: 'Driving License',
  fullName: '',
  address: '',
  dateOfBirth: '',
  gender: '',
  height: '',
  number: '',
  licenseClass: '',
  conditions: '',
  state: '',
  country: '',
  expiryDate: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
