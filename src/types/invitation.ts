export interface EventInvitation {
  id: string;
  eventId: string;
  invitingStudentId: string;
  friendName: string;
  parentName: string;
  parentContact: string;
  createdAt: string;
}

export interface EventInvitationInput {
  eventId: string;
  friendName: string;
  parentName: string;
  parentContact: string;
}
