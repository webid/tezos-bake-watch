
import { HeadResponse, BakingRight } from '../types';

const BASE_URL = 'https://api.tzkt.io/v1';

export const tzktService = {
  /**
   * Fetches the current head of the Tezos blockchain to get the current level.
   */
  async getHeadLevel(): Promise<number> {
    const response = await fetch(`${BASE_URL}/head`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Tezos head: ${response.statusText}`);
    }
    const data: HeadResponse = await response.json();
    return data.level;
  },

  /**
   * Fetches upcoming rights (baking and endorsing) for a specific baker starting from a given level.
   */
  async getBakingRights(startLevel: number, bakerAddress: string): Promise<BakingRight[]> {
    const query = new URLSearchParams({
      baker: bakerAddress,
      'level.ge': startLevel.toString(),
      limit: '10000',
      type: 'baking',
      select: 'cycle,level,timestamp,type,round' 
    });

    const response = await fetch(`${BASE_URL}/rights?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch baking rights: ${response.statusText}`);
    }
    return await response.json();
  }
};
