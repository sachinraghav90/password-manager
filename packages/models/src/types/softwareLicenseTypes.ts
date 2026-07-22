import { CommonFieldEntry } from './loginTypes';

export interface SoftwareLicenseFormState {
  title: string;
  version: string;
  licenseKey: string;
  
  // Customer
  licensedTo: string;
  registeredEmail: string;
  company: string;
  
  // Publisher
  downloadPage: string;
  publisher: string;
  website: string;
  supportEmail: string;
  retailPrice: string;
  
  // Order
  purchaseDate: string;
  orderNumber: string;
  orderTotal: string;

  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type SoftwareLicensePayload = Omit<SoftwareLicenseFormState, 'favorite'>;

export const defaultSoftwareLicenseFormState = (): SoftwareLicenseFormState => ({
  title: 'Software License',
  version: '',
  licenseKey: '',
  
  licensedTo: '',
  registeredEmail: '',
  company: '',
  
  downloadPage: '',
  publisher: '',
  website: '',
  supportEmail: '',
  retailPrice: '',
  
  purchaseDate: '',
  orderNumber: '',
  orderTotal: '',

  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
