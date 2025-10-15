export interface RewardItem {
  id: string;
  name: string;
  description: string;
  images: string[];
  koinPrice: number;
  stock: number;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KoinTransaction {
  id: string;
  studentId: string;
  type: 'EARN' | 'SPEND' | 'BONUS' | 'REFUND' | 'REDEMPTION';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  source: string; // e.g., "TASK:123", "EVENT:45", "REDEMPTION:67"
  description: string;
  timestamp: string;
  responsibleUserId?: string;
  redemptionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  itemName?: string;
}

export interface KoinBalance {
  studentId: string;
  availableBalance: number;
  blockedBalance: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: string;
}

export interface RedemptionRequest {
  id: string;
  studentId: string;
  itemId: string;
  itemName: string;
  koinAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export interface BonusEvent {
  id: string;
  name: string;
  description: string;
  koinAmount: number;
  createdBy: string;
  createdAt: string;
  studentIds: string[];
}