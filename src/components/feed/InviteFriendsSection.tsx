import { Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { StudentInvitationsList } from '@/components/aluno/StudentInvitationsList';
import { useStudentInvitationsCount } from '@/hooks/useStudentInvitationsCount';
import { useEventCapacityValidation } from '@/hooks/useEventCapacityValidation';
import { Post } from '@/types/post';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface InviteFriendsSectionProps {
  post: Post;
  studentId: string;
  onInviteFriend: (post: Post) => void;
}

export function InviteFriendsSection({ 
  post, 
  studentId, 
  onInviteFriend 
}: InviteFriendsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: invitationsCount, refetch: refetchCount } = useStudentInvitationsCount(post.id, studentId);
  const { checkInvitationLimits } = useEventCapacityValidation();
  const [canInvite, setCanInvite] = useState(true);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    const checkLimits = async () => {
      if (post.eventCapacityEnabled) {
        const result = await checkInvitationLimits(post.id, studentId);
        setCanInvite(result.canInvite);
        setLimitReached(!result.canInvite);
      }
    };
    checkLimits();
  }, [post.id, studentId, post.eventCapacityEnabled, checkInvitationLimits, invitationsCount]);

  const handleInvitationsChange = () => {
    refetchCount();
  };

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-2 border-purple-500/40 shadow-md shadow-purple-500/10 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-purple-500/30 ring-2 ring-purple-400/50 flex-shrink-0">
          <Users className="h-4 w-4 text-purple-200" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-sm text-purple-100 flex items-center gap-1.5">
              🎉 Convide seus amigos!
            </h4>
            {invitationsCount > 0 && (
              <Badge variant="secondary" className="bg-purple-500/30 text-purple-100 text-xs">
                {invitationsCount} convidado{invitationsCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-purple-100/90 leading-snug">
            {limitReached 
              ? 'Você atingiu o limite de convites para este evento.' 
              : 'Traga seus amigos e divirtam-se juntos!'}
          </p>
        </div>
      </div>

      {/* Lista de Convites - Collapsible */}
      {invitationsCount > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs text-purple-200 hover:text-purple-100 hover:bg-purple-500/20 h-8"
            >
              {isOpen ? 'Ocultar' : 'Ver'} seus convites ({invitationsCount})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <StudentInvitationsList 
              eventId={post.id}
              studentId={studentId}
              onInvitationsChange={handleInvitationsChange}
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Botão de Convidar */}
      <Button 
        onClick={() => onInviteFriend(post)}
        disabled={limitReached}
        className={cn(
          "w-full shadow-md text-xs font-semibold h-9 transition-all",
          limitReached 
            ? "bg-gradient-to-r from-red-900/40 to-orange-900/40 text-red-200 border-2 border-red-500/50 cursor-not-allowed hover:bg-gradient-to-r hover:from-red-900/40 hover:to-orange-900/40 opacity-75"
            : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:shadow-lg hover:shadow-purple-500/30"
        )}
        size="sm"
      >
        {limitReached ? (
          <>
            <AlertCircle className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
            Limite de Convidados Atingido
          </>
        ) : (
          <>
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Convidar Amigo
          </>
        )}
      </Button>
    </div>
  );
}
