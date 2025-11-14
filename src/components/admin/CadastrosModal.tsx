import { useNavigate } from "react-router-dom";
import { Users, UserCog, UsersRound, Layers, BookOpen, FolderKanban, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    title: "Alunos",
    description: "Gerenciar cadastro de alunos",
    url: "/secretaria/cadastros/alunos",
    icon: Users,
  },
  {
    title: "Professores",
    description: "Gerenciar cadastro de professores",
    url: "/secretaria/cadastros/professores",
    icon: UserCog,
  },
  {
    title: "Secretárias",
    description: "Gerenciar cadastro de secretárias",
    url: "/secretaria/cadastros/secretarias",
    icon: UsersRound,
  },
  {
    title: "Níveis",
    description: "Gerenciar níveis escolares",
    url: "/secretaria/cadastros/niveis",
    icon: Layers,
  },
  {
    title: "Modalidades",
    description: "Gerenciar modalidades de ensino",
    url: "/secretaria/cadastros/modalidades",
    icon: FolderKanban,
  },
  {
    title: "Matérias",
    description: "Gerenciar disciplinas e matérias",
    url: "/secretaria/cadastros/materias",
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
      <DialogContent className="backdrop-blur-2xl bg-black/80 border border-purple-500/30 max-w-4xl shadow-2xl shadow-purple-500/10 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-4xl font-bold gradient-text text-center drop-shadow-[0_0_15px_rgba(147,51,234,0.5)]">
            Cadastros
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {cadastrosLinks.map((link, index) => (
            <Button
              key={link.url}
              variant="outline"
              className="group relative h-auto min-h-[130px] flex flex-col items-start justify-start gap-3 p-5
                         backdrop-blur-xl bg-white/5 rounded-xl border border-white/10
                         hover:scale-[1.02] hover:bg-white/10 hover:border-primary/50
                         hover:shadow-2xl hover:shadow-primary/20
                         transition-all duration-300 ease-out cursor-pointer
                         animate-fade-in text-left"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleNavigate(link.url)}
            >
              {/* Ícone e Título */}
              <div className="flex items-center gap-3 w-full">
                <div
                  className="flex-shrink-0 p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 
                                ring-1 ring-primary/20 group-hover:ring-primary/40
                                transition-all duration-300"
                >
                  <link.icon className="h-5 w-5 text-primary/80 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-bold text-base text-white group-hover:text-primary/90 transition-colors leading-tight">
                  {link.title}
                </h3>
              </div>

              {/* Descrição */}
              <p className="text-xs text-gray-400 group-hover:text-gray-300 leading-relaxed transition-colors w-full">
                {link.description}
              </p>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
