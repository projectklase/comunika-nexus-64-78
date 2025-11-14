import { useNavigate } from 'react-router-dom';
import { Users, UserCog, UsersRound, Layers, BookOpen, FolderKanban, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CadastrosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CadastroLink {
  title: string;
  description: string;
  url: string;
  icon: LucideIcon;
}

const cadastrosLinks: CadastroLink[] = [
  {
    title: 'Alunos',
    description: 'Gerenciar cadastro de alunos',
    url: '/secretaria/cadastros/alunos',
    icon: Users,
  },
  {
    title: 'Professores',
    description: 'Gerenciar cadastro de professores',
    url: '/secretaria/cadastros/professores',
    icon: UserCog,
  },
  {
    title: 'Secretárias',
    description: 'Gerenciar cadastro de secretárias',
    url: '/secretaria/cadastros/secretarias',
    icon: UsersRound,
  },
  {
    title: 'Níveis',
    description: 'Gerenciar níveis escolares',
    url: '/secretaria/cadastros/niveis',
    icon: Layers,
  },
  {
    title: 'Modalidades',
    description: 'Gerenciar modalidades de ensino',
    url: '/secretaria/cadastros/modalidades',
    icon: FolderKanban,
  },
  {
    title: 'Matérias',
    description: 'Gerenciar disciplinas e matérias',
    url: '/secretaria/cadastros/materias',
    icon: BookOpen,
  },
];

export function CadastrosModal({ open, onOpenChange }: CadastrosModalProps) {
  const navigate = useNavigate();

  const handleNavigate = (url: string) => {
    navigate(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-3xl border-purple-500/20">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-3xl font-bold gradient-text text-center">Cadastros</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
          {cadastrosLinks.map((link) => (
            <Button
              key={link.url}
              variant="outline"
              className="h-24 flex-col items-start justify-center gap-3 p-5 glass-soft hover:glass hover:scale-[1.02] hover:border-purple-500/40 transition-all duration-200 group"
              onClick={() => handleNavigate(link.url)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <link.icon className="h-5 w-5 text-purple-400" />
                </div>
                <span className="font-semibold text-base text-white">{link.title}</span>
              </div>
              <span className="text-xs text-muted-foreground/80 text-left leading-relaxed">{link.description}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
