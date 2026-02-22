import { Baker } from '../types';

const HARDCODED_BAKERS: Baker[] = [
  {
    address: 'tz3W7k9v3uniY1f2HQRKxymJybNvH3FgvZ5N',
    name: 'Stacy.fi',
    status: 'active',
    balance: 0,
    delegation: {
      enabled: false,
      minBalance: 0,
      fee: 0,
      capacity: 0,
      freeSpace: 0,
      estimatedApy: 0
    },
    staking: {
      enabled: false,
      minBalance: 0,
      fee: 0,
      capacity: 0,
      freeSpace: 0,
      estimatedApy: 0
    },
    isHardcoded: true
  }
];

export const bakingBadService = {
  async getBakers(): Promise<Baker[]> {
    const response = await fetch('https://api.baking-bad.org/v3/bakers');
    if (!response.ok) {
      throw new Error(`Failed to fetch bakers: ${response.statusText}`);
    }
    const apiBakers: Baker[] = await response.json();
    return [...apiBakers, ...HARDCODED_BAKERS];
  }
};
