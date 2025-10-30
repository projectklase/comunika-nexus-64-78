import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import { AppLayout } from '@/components/Layout/AppLayout';
import { ClassHeader } from '@/components/classes/ClassHeader';
import { ClassRoster } from '@/components/classes/ClassRoster';
import { ClassSubjectsSection } from '@/components/classes/ClassSubjectsSection';
import { ClassFormModal } from '@/components/classes/ClassFormModal';
import { AssignTeachersDialog } from '@/components/classes/AssignTeachersDialog';
import { AssignTeacherDialog } from '@/components/teachers/AssignTeacherDialog';
import { AddStudentsDrawer } from '@/components/classes/AddStudentsDrawer';
import { TransferStudentsDialog } from '@/components/classes/TransferStudentsDialog';
import { ConfirmDialog } from '@/components/classes/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { canAccessManagement } from '@/utils/auth-helpers';

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    getClass, 
    loadClasses, 
    deleteClass, 
    archiveClass, 
    unarchiveClass 
  } = useClassStore();
  const { loadPeople } = usePeopleStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignTeachers, setShowAssignTeachers] = useState(false);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [showTransferStudents, setShowTransferStudents] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showAssignTeacherDialog, setShowAssignTeacherDialog] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const schoolClass = id ? getClass(id) : undefined;

  useEffect(() => {
    loadClasses();
    loadPeople();
  }, [loadClasses, loadPeople]);

  // RBAC: Only management roles can access
  if (!canAccessManagement(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!schoolClass) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-muted-foreground">
            Turma não encontrada
          </h1>
        </div>
      </AppLayout>
    );
  }

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteClass(id);
      toast({
        title: "Turma excluída",
        description: "A turma foi excluída com sucesso.",
      });
      navigate('/secretaria/turmas');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a turma.",
        variant: "destructive",
      });
    }
};

  const handleArchive = async () => {
    if (!id) return;
    
    try {
      if (schoolClass.status === 'ATIVA') {
        await archiveClass(id);
        toast({
          title: "Turma arquivada",
          description: "A turma foi arquivada com sucesso.",
        });
      } else {
        await unarchiveClass(id);
        toast({
          title: "Turma desarquivada",
          description: "A turma foi desarquivada com sucesso.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da turma.",
        variant: "destructive",
      });
    }
  };

  const handleTransferStudents = () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "Nenhum aluno selecionado",
        description: "Selecione pelo menos um aluno para transferir.",
        variant: "destructive",
      });
      return;
    }
    setShowTransferStudents(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="glass p-6">
          <ClassHeader
            schoolClass={schoolClass}
            onEdit={() => setShowEditModal(true)}
            onAssignTeachers={() => setShowAssignTeachers(true)}
            onArchive={() => setShowArchiveConfirm(true)}
            onDelete={() => setShowDeleteConfirm(true)}
            onQuickAssignTeacher={() => setShowAssignTeacherDialog(true)}
          />
        </div>

        <div className="glass-soft glass-hover p-6">
          <ClassSubjectsSection schoolClass={schoolClass} />
        </div>

        <div className="glass-soft glass-hover p-6">
          <ClassRoster
            schoolClass={schoolClass}
            selectedStudents={selectedStudents}
            onSelectedStudentsChange={setSelectedStudents}
            onAddStudents={() => setShowAddStudents(true)}
            onTransferStudents={handleTransferStudents}
          />
        </div>

        {/* Modals and Dialogs */}
        <ClassFormModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          schoolClass={schoolClass}
        />

        <AssignTeachersDialog
          open={showAssignTeachers}
          onOpenChange={setShowAssignTeachers}
          classId={schoolClass.id}
          currentTeachers={schoolClass.teachers}
        />

        <AssignTeacherDialog
          open={showAssignTeacherDialog}
          onOpenChange={setShowAssignTeacherDialog}
          classId={schoolClass.id}
          className={schoolClass.name}
        />

        <AddStudentsDrawer
          open={showAddStudents}
          onOpenChange={setShowAddStudents}
          classId={schoolClass.id}
        />

        <TransferStudentsDialog
          open={showTransferStudents}
          onOpenChange={setShowTransferStudents}
          fromClassId={schoolClass.id}
          studentIds={selectedStudents}
          onComplete={() => setSelectedStudents([])}
        />

        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Excluir Turma"
          description={
            schoolClass.students.length > 0
              ? `Esta turma possui ${schoolClass.students.length} aluno(s). Ao excluí-la, todos os vínculos serão removidos. Esta ação não pode ser desfeita.`
              : "Esta ação não pode ser desfeita."
          }
          confirmText="Excluir"
          onConfirm={handleDelete}
          variant="destructive"
        />

        <ConfirmDialog
          open={showArchiveConfirm}
          onOpenChange={setShowArchiveConfirm}
          title={schoolClass.status === 'ATIVA' ? 'Arquivar Turma' : 'Desarquivar Turma'}
          description={
            schoolClass.status === 'ATIVA'
              ? 'Turmas arquivadas não aparecem em seleções de audiência.'
              : 'A turma voltará a aparecer em seleções de audiência.'
          }
          confirmText={schoolClass.status === 'ATIVA' ? 'Arquivar' : 'Desarquivar'}
          onConfirm={handleArchive}
        />
      </div>
    </AppLayout>
  );
}