import { useState } from 'react';
import { differenceInYears } from 'date-fns';
import { Trash2, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useStudentEventInvitations } from '@/hooks/useStudentEventInvitations';

interface StudentInvitationsListProps {
  eventId: string;
  studentId: string;
  onInvitationsChange?: () => void;
}

export function StudentInvitationsList({ 
  eventId, 
  studentId,
  onInvitationsChange 
}: StudentInvitationsListProps) {
  const { invitations, isLoading, deleteInvitation, isDeletingInvitation } = 
    useStudentEventInvitations(eventId, studentId);
  
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    invitationId: string;
    friendName: string;
  }>({
    isOpen: false,
    invitationId: '',
    friendName: '',
  });

  const handleDeleteClick = (invitationId: string, friendName: string) => {
    setDeleteDialog({
      isOpen: true,
      invitationId,
      friendName,
    });
  };

  const handleConfirmDelete = () => {
    deleteInvitation(deleteDialog.invitationId, {
      onSuccess: () => {
        setDeleteDialog({ isOpen: false, invitationId: '', friendName: '' });
        onInvitationsChange?.();
      },
    });
  };

  const calculateAge = (dobStr: string) => {
    try {
      return differenceInYears(new Date(), new Date(dobStr));
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-6 text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Você ainda não convidou nenhum amigo para este evento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {invitations.map((invitation) => {
          const age = calculateAge(invitation.friend_dob);
          
          return (
            <Card 
              key={invitation.id} 
              className="bg-gradient-to-r from-purple-500/10 to-pink-500/5 border-purple-500/30 hover:border-purple-500/50 transition-all"
            >
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-full bg-purple-500/20 flex-shrink-0">
                    <Users className="h-4 w-4 text-purple-300" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">
                        {invitation.friend_name}
                      </p>
                      {age !== null && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30">
                          {age} anos
                        </Badge>
                      )}
                    </div>
                    
                    {invitation.friend_contact && (
                      <p className="text-xs text-muted-foreground truncate">
                        {invitation.friend_contact}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(invitation.id, invitation.friend_name)}
                  disabled={isDeletingInvitation}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                  title="Remover convite"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => 
        setDeleteDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-destructive" />
              Remover Convite
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o convite de{' '}
              <strong className="text-foreground">{deleteDialog.friendName}</strong>?
              <br />
              <br />
              Você poderá convidar outro amigo no lugar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingInvitation}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeletingInvitation}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingInvitation ? 'Removendo...' : 'Remover Convite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
