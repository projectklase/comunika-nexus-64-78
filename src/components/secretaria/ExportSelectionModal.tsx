import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Users, CheckCircle2, ClipboardList } from "lucide-react";

interface ExportSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  invitationsCount: number;
  confirmationsCount: number;
  onExportInvitations: () => void;
  onExportConfirmations: () => void;
  onOpenAttendanceChecklist: () => void;
}

export function ExportSelectionModal({
  isOpen,
  onClose,
  eventTitle,
  invitationsCount,
  confirmationsCount,
  onExportInvitations,
  onExportConfirmations,
  onOpenAttendanceChecklist,
}: ExportSelectionModalProps) {
  const handleInvitationsExport = () => {
    onExportInvitations();
    onClose();
  };

  const handleConfirmationsExport = () => {
    onExportConfirmations();
    onClose();
  };

  const handleAttendanceChecklist = () => {
    onOpenAttendanceChecklist();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Exportar Dados do Evento</DialogTitle>
          <DialogDescription>
            Selecione o tipo de exportação para <span className="font-semibold text-foreground">{eventTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Card: Exportar Convites */}
          <button
            onClick={handleInvitationsExport}
            className="group relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-accent/50 transition-all duration-200"
          >
            <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Users className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-base mb-1">Convites</h3>
              <p className="text-sm text-muted-foreground">
                Exportar lista de amigos convidados
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {invitationsCount} {invitationsCount === 1 ? 'convite' : 'convites'}
              </p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground absolute top-3 right-3" />
          </button>

          {/* Card: Exportar Confirmações */}
          <button
            onClick={handleConfirmationsExport}
            className="group relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-accent/50 transition-all duration-200"
          >
            <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-base mb-1">Confirmações</h3>
              <p className="text-sm text-muted-foreground">
                Exportar alunos que confirmaram presença
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {confirmationsCount} {confirmationsCount === 1 ? 'confirmação' : 'confirmações'}
              </p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground absolute top-3 right-3" />
          </button>
        </div>

        {/* Card: Lista de Chamada - Destaque */}
        <button
          onClick={handleAttendanceChecklist}
          className="group relative flex items-center gap-4 p-6 rounded-lg border-2 border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all duration-200"
        >
          <div className="p-3 rounded-full bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-lg mb-1">Lista de Chamada</h3>
            <p className="text-sm text-muted-foreground">
              Registrar presença de alunos e convidados no evento
            </p>
          </div>
          <div className="text-xs font-medium px-3 py-1 rounded-full bg-primary/20 text-primary">
            Recomendado
          </div>
        </button>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
