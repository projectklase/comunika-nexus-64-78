export type PasswordResetStatus = 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';

export interface PasswordResetRequest {
  id: string;
  email: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  reason?: string;
  status: PasswordResetStatus;
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string;
  notes?: string;
  requiresChangeOnNextLogin?: boolean;
  // Placeholder para futuro Resend
  emailConfig?: {
    sendTo: string;
    templateId?: string;
    scheduled?: boolean;
  };
}
