import { CommonFieldEntry } from './loginTypes';

export interface RewardFormState {
  title: string;
  companyName: string;
  memberName: string;
  memberId: string;
  pin: string;
  memberSince: string;
  customerServicePhone: string;
  phoneForReservations: string;
  website: string;
  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type RewardPayload = Omit<RewardFormState, 'favorite'>;

export const defaultRewardFormState = (): RewardFormState => ({
  title: 'Reward Program',
  companyName: '',
  memberName: '',
  memberId: '',
  pin: '',
  memberSince: '',
  customerServicePhone: '',
  phoneForReservations: '',
  website: '',
  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
