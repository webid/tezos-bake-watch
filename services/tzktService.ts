
import { HeadResponse, BakingRight, Cycle } from '../types';

const BASE_URL = 'https://api.tzkt.io/v1';

export const tzktService = {
  /**
   * Fetches cycle information.
   */
  async getCycles(): Promise<Cycle[]> {
    const response = await fetch(`${BASE_URL}/cycles?sort.desc=index&limit=20`);
    if (!response.ok) {
      throw new Error(`Failed to fetch cycles: ${response.statusText}`);
    }
    return await response.json();
  },

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
      select: 'cycle,level,timestamp,type,round,status' 
    });

    const response = await fetch(`${BASE_URL}/rights?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch baking rights: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Fetches detailed account information for a specific baker.
   */
  async getAccount(address: string): Promise<import('../types').BakerExtendedStats> {
    const response = await fetch(`${BASE_URL}/accounts/${address}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch account info: ${response.statusText}`);
    }
    return await response.json();
  },

  /**
   * Fetches the last 20 past baking rights for a specific baker.
   */
  async getPastBakingRights(bakerAddress: string, maxLevel: number): Promise<BakingRight[]> {
    const query = new URLSearchParams({
      baker: bakerAddress,
      limit: '20',
      type: 'baking',
      'level.le': maxLevel.toString(),
      'sort.desc': 'level',
      select: 'cycle,level,timestamp,type,round,status'
    });

    const url = `${BASE_URL}/rights?${query.toString()}`;
    // console.log('Past rights query:', url);

    const response = await fetch(url);
    if (!response.ok) {
       throw new Error(`Failed to fetch past baking rights: ${response.statusText}`);
    }
    return await response.json();
  }
};
