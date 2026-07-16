import { CommonFieldEntry } from './loginTypes';

export interface MembershipFormState {
  title: string;
  groupName: string;
  website: string;
  telephone: string;
  memberName: string;
  memberSince: string;
  expiryDate: string;
  memberId: string;
  pin: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type MembershipPayload = Omit<MembershipFormState, 'favorite'>;

export const defaultMembershipFormState = (): MembershipFormState => ({
  title: 'Membership',
  groupName: '',
  website: '',
  telephone: '',
  memberName: '',
  memberSince: '',
  expiryDate: '',
  memberId: '',
  pin: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
