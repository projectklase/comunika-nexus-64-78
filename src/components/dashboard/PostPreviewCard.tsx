import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageViewerModal } from '@/components/ui/image-viewer-modal';
import { Post } from '@/types/post';
import { useAuth } from '@/contexts/AuthContext';
import { usePostViews } from '@/stores/post-views.store';
import { Eye, FileText, FolderOpen, ClipboardCheck } from 'lucide-react';

interface PostPreviewCardProps {
  post: Post;
  onClick: () => void;
}

const typeConfig = {
  ATIVIDADE: { 
    icon: FileText, 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', 
    badgeColor: 'bg-blue-500 hover:bg-blue-600'
  },
  TRABALHO: { 
    icon: FolderOpen, 
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    badgeColor: 'bg-orange-500 hover:bg-orange-600'
  },
  PROVA: { 
    icon: ClipboardCheck, 
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    badgeColor: 'bg-red-500 hover:bg-red-600'
  }
};

export function PostPreviewCard({ post, onClick }: PostPreviewCardProps) {
  const { user } = useAuth();
  const { recordPostView } = usePostViews();
  const [showImageViewer, setShowImageViewer] = useState(false);

  const handleClick = () => {
    if (user) {
      recordPostView(post.id, user, 'dashboard', user.classId);
    }
    onClick();
  };

  // Verificar se há imagens nos anexos
  const hasImages = post.attachments?.some(att => 
    att.url?.startsWith('data:image/') || 
    (att.name && /\.(jpg|jpeg|png|webp)$/i.test(att.name))
  );

  const handleEyeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowImageViewer(true);
  };

  // Get activity type configuration
  const isActivity = ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type);
  const config = isActivity ? typeConfig[post.type as keyof typeof typeConfig] : null;
  const Icon = config?.icon;

  return (
    <>
      <div 
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-all duration-200 group border ${
          config ? `${config.color} border` : 'glass'
        }`}
        onClick={handleClick}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {Icon && (
            <Icon className="h-4 w-4 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">{post.title}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{post.authorName}</p>
              {post.activityMeta?.peso && post.activityMeta?.usePeso !== false && (
                <span className="text-xs text-muted-foreground">• Peso: {post.activityMeta.peso}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasImages && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEyeClick}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/20"
              title="Ver imagens"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          
          <Badge 
            variant="outline"
            className={config ? config.badgeColor + ' text-white border-transparent' : 
                      (post.type === 'AVISO' || post.type === 'COMUNICADO' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground')}
          >
            {post.type}
          </Badge>
        </div>
      </div>

      {/* Modal de Visualização de Imagens */}
      {hasImages && post.attachments && (
        <ImageViewerModal
          isOpen={showImageViewer}
          onClose={() => setShowImageViewer(false)}
          attachments={post.attachments}
          initialIndex={0}
          postTitle={post.title}
        />
      )}
    </>
  );
}