import { CommonFieldEntry } from './loginTypes';

export interface MedicalRecordFormState {
  title: string;
  date: string;
  location: string;
  healthcareProfessional: string;
  patient: string;
  reasonForVisit: string;
  medicationName: string;
  dosage: string;
  medicationNotes: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type MedicalRecordPayload = Omit<MedicalRecordFormState, 'favorite'>;

export const defaultMedicalRecordFormState = (): MedicalRecordFormState => ({
  title: 'Medical Record',
  date: '',
  location: '',
  healthcareProfessional: '',
  patient: '',
  reasonForVisit: '',
  medicationName: '',
  dosage: '',
  medicationNotes: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
