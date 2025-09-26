import { KoinTransaction } from './rewards';

/**
 * Enhanced transaction interface for administrative view
 * Includes resolved human-readable information
 */
export interface EnhancedKoinTransaction extends KoinTransaction {
  // Student information
  studentName: string;
  
  // Responsible administrator information  
  responsibleAdminName?: string;
  
  // Humanized source information
  humanizedSource: {
    type: 'item' | 'task' | 'event' | 'system';
    name: string;
    details?: string;
  };
  
  // Additional context for admin view
  redemptionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}