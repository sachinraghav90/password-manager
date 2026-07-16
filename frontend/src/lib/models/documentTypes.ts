import { CommonFieldEntry } from './loginTypes';

export interface DocumentFile {
  name: string;
  size: number;
  type: string;
  base64?: string; // Storing as base64 for simulation
}

export interface DocumentFormState {
  title: string;
  files: DocumentFile[];
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type DocumentPayload = Omit<DocumentFormState, 'favorite'>;

export const defaultDocumentFormState = (): DocumentFormState => ({
  title: 'Document',
  files: [],
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
