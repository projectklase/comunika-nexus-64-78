import { SchoolClass } from '@/types/class';
import { usePeopleStore } from '@/stores/people-store';
import { useTeachers } from '@/hooks/useTeachers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Users, Archive, ArchiveRestore, Trash2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClassHeaderProps {
  schoolClass: SchoolClass;
  onEdit: () => void;
  onAssignTeachers: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onQuickAssignTeacher?: () => void;
}

export function ClassHeader({
  schoolClass,
  onEdit,
  onAssignTeachers,
  onArchive,
  onDelete,
  onQuickAssignTeacher
}: ClassHeaderProps) {
  const navigate = useNavigate();
  const { getPerson } = usePeopleStore();
  const { teachers, loading: loadingTeachers } = useTeachers();

  const teacherNames = schoolClass.teachers.map(id => {
    // Buscar professor no hook useTeachers ao invés de people-store
    const teacher = teachers.find(t => t.id === id);
    return teacher?.name || 'Professor não encontrado';
  });

  return (
    <div className="glass-card p-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate('/secretaria/turmas')}
        className="mb-4 hover:bg-accent/50"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para turmas
      </Button>

      <div className="flex items-start justify-between">
        <div className="space-y-4">
          {/* Title and Status */}
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold gradient-text">
              {schoolClass.name}
            </h1>
            <Badge 
              variant={schoolClass.status === 'ATIVA' ? 'default' : 'secondary'}
              className={schoolClass.status === 'ATIVA' ? 'bg-green-500/20 text-green-300' : ''}
            >
              {schoolClass.status}
            </Badge>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="text-muted-foreground">Código</label>
              <div className="font-medium">
                {schoolClass.code || '—'}
              </div>
            </div>
            
            <div>
              <label className="text-muted-foreground">Série/Ano</label>
              <div className="font-medium">
                {schoolClass.grade && schoolClass.year 
                  ? `${schoolClass.grade} (${schoolClass.year})`
                  : schoolClass.grade || schoolClass.year || '—'
                }
              </div>
            </div>

            <div>
              <label className="text-muted-foreground">Criada em</label>
              <div className="font-medium">
                {new Date(schoolClass.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Teachers */}
          <div>
            <label className="text-muted-foreground text-sm">Professores</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {loadingTeachers ? (
                <span className="text-muted-foreground text-sm animate-pulse">
                  Carregando professores...
                </span>
              ) : teacherNames.length > 0 ? (
                teacherNames.map((name, index) => (
                  <Badge key={index} variant="outline">
                    {name}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">
                  Nenhum professor atribuído
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={onEdit}
            className="glass-button"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onAssignTeachers}
            className="glass-button"
          >
            <Users className="h-4 w-4 mr-2" />
            Professores
          </Button>

          {onQuickAssignTeacher && (
            <Button 
              variant="outline" 
              onClick={onQuickAssignTeacher}
              className="glass-button"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Atribuir Professor
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={onArchive}
            className="glass-button"
          >
            {schoolClass.status === 'ATIVA' ? (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </>
            ) : (
              <>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Desarquivar
              </>
            )}
          </Button>
          
          <Button 
            variant="destructive" 
            onClick={onDelete}
            className="hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}