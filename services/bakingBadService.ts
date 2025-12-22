
import { Baker } from '../types';

export const bakingBadService = {
  async getBakers(): Promise<Baker[]> {
    const response = await fetch('https://api.baking-bad.org/v3/bakers');
    if (!response.ok) {
      throw new Error(`Failed to fetch bakers: ${response.statusText}`);
    }
    return await response.json();
  }
};
