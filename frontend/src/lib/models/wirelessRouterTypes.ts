import { CommonFieldEntry } from './loginTypes';

export interface WirelessRouterFormState {
  title: string;
  baseStationName: string;
  baseStationPassword: string;
  serverAddress: string;
  airportId: string;
  networkName: string;
  wirelessSecurity: string;
  wirelessNetworkPassword: string;
  attachedStrongPassword: string;

  notes: string;
  tags: string[];
  commonFields: CommonFieldEntry[];
  favorite: boolean;
}

export type WirelessRouterPayload = Omit<WirelessRouterFormState, 'favorite'>;

export const defaultWirelessRouterFormState = (): WirelessRouterFormState => ({
  title: 'Wireless Router',
  baseStationName: '',
  baseStationPassword: '',
  serverAddress: '',
  airportId: '',
  networkName: '',
  wirelessSecurity: '',
  wirelessNetworkPassword: '',
  attachedStrongPassword: '',

  notes: '',
  tags: [],
  commonFields: [],
  favorite: false,
});
