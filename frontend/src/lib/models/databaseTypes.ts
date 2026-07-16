import { CommonFieldEntry } from './loginTypes';

export interface DatabaseFormState {
  title: string;
  type: string;
  server: string;
  port: string;
  databaseName: string;
  username: string;
  passwordValue: string;
  sid: string;
  alias: string;
  connectionOptions: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type DatabasePayload = Omit<DatabaseFormState, 'favorite'>;

export const defaultDatabaseFormState = (): DatabaseFormState => ({
  title: 'Database',
  type: '',
  server: '',
  port: '',
  databaseName: '',
  username: '',
  passwordValue: '',
  sid: '',
  alias: '',
  connectionOptions: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
