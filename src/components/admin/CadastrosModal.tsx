import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Target, BookOpen, Users, UserCog, School } from 'lucide-react';

interface CadastrosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const cadastrosLinks = [
  { title: 'Programas', url: '/secretaria/cadastros/programas', icon: Target, description: 'Gerencie programas e modalidades' },
  { title: 'Catálogo Global', url: '/secretaria/cadastros/catalogo', icon: BookOpen, description: 'Níveis, matérias e modalidades' },
  { title: 'Alunos', url: '/secretaria/cadastros/alunos', icon: Users, description: 'Cadastro e gestão de alunos' },
  { title: 'Professores', url: '/secretaria/cadastros/professores', icon: UserCog, description: 'Cadastro e gestão de professores' },
  { title: 'Turmas', url: '/secretaria/turmas', icon: School, description: 'Gestão de turmas' },
];

export function CadastrosModal({ open, onOpenChange }: CadastrosModalProps) {
  const navigate = useNavigate();

  const handleNavigate = (url: string) => {
    navigate(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">Cadastros</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {cadastrosLinks.map((link) => (
            <Button
              key={link.url}
              variant="outline"
              className="h-auto flex-col items-start gap-2 p-4 glass-soft hover:glass transition-all"
              onClick={() => handleNavigate(link.url)}
            >
              <div className="flex items-center gap-2 w-full">
                <link.icon className="h-5 w-5 text-primary" />
                <span className="font-semibold">{link.title}</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                {link.description}
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
