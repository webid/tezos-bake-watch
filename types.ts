
export interface HeadResponse {
  level: number;
  hash: string;
  timestamp: string;
}

export interface BakingRight {
  type: string;
  cycle: number;
  level: number;
  timestamp: string;
  round?: number;
}

export interface APIError {
  message: string;
}

export interface Delegation {
  enabled: boolean;
  minBalance: number;
  fee: number;
  capacity: number;
  freeSpace: number;
  estimatedApy: number;
}

export interface Staking {
  enabled: boolean;
  minBalance: number;
  fee: number;
  capacity: number;
  freeSpace: number;
  estimatedApy: number;
}

export interface Baker {
  address: string;
  name: string;
  logo?: string;
  status: string;
  balance: number;
  delegation: Delegation;
  staking: Staking;
}

export interface Cycle {
  index: number;
  firstLevel: number;
  startTime: string;
  lastLevel: number;
  endTime: string;
  snapshotLevel: number;
  totalBakers: number;
  totalBakingPower: number;
}

export interface BakerExtendedStats {
  balance: number;
  stakedBalance: number;
  unstakedBalance: number;
  externalStakedBalance: number;
  externalUnstakedBalance: number;
  totalStakedBalance: number;
  stakersCount: number;
  limitOfStakingOverBaking: number;
  edgeOfBakingOverStaking: number;
  stakingBalance: number;
  delegatedBalance: number;
}


