import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { useStoreInitialization } from '@/hooks/useStoreInitialization';
import { useClassStore } from '@/stores/class-store';
import { orderClassesBySchedule, getClassDisplayInfo } from '@/utils/class-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Calendar, Clock, Plus, FileText, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SchoolClass } from '@/types/class';
import { useLevels } from '@/hooks/useLevels';
import { useModalities } from '@/hooks/useModalities';

export default function ProfessorClasses() {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  useStoreInitialization();
  const { classes } = useClassStore();
  const { levels } = useLevels();
  const { modalities } = useModalities();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // ✅ Filtrar turmas do professor com reatividade correta
  const allClasses = useMemo(() => {
    if (!user?.id || !currentSchool?.id) return [];
    return classes.filter(c => 
      c.teachers?.includes(user.id) && 
      c.schoolId === currentSchool.id &&
      c.status === 'ATIVA'
    );
  }, [user?.id, currentSchool?.id, classes]);
  
  const orderedClasses = useMemo(() => 
    orderClassesBySchedule(allClasses), 
    [allClasses]
  );
  
  if (!user) return null;
  
  // Filtros
  const filteredClasses = orderedClasses.filter(schoolClass => {
    const matchesSearch = 
      schoolClass.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schoolClass.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    
    const matchesYear = !selectedYear || schoolClass.year === selectedYear;
    
    const matchesDay = !selectedDay || 
      schoolClass.daysOfWeek.some(day => 
        day.toLowerCase().includes(selectedDay.toLowerCase())
      );
    
    return matchesSearch && matchesYear && matchesDay;
  });
  
  // Anos disponíveis
  const availableYears = Array.from(new Set(
    allClasses.map(c => c.year).filter((year): year is number => year !== undefined)
  )).sort((a, b) => b - a);
  
  // Dias da semana
  const daysOfWeek = [
    'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'
  ];
  
  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
            Minhas Turmas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {allClasses.length} turma{allClasses.length !== 1 ? 's' : ''} atribuída{allClasses.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Button asChild className="w-full sm:w-auto min-h-11">
          <Link to="/professor/atividades/nova">
            <Plus className="h-4 w-4 mr-2" />
            Nova Atividade
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-3 sm:space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 min-h-11"
              />
            </div>
            
            {/* Anos */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <Button
                variant={selectedYear === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedYear(null)}
                className="text-xs sm:text-sm min-h-9"
              >
                Todos
              </Button>
              {availableYears.map(year => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                  className="text-xs sm:text-sm min-h-9"
                >
                  {year}
                </Button>
              ))}
            </div>
            
            {/* Dias da semana */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <Button
                variant={selectedDay === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDay(null)}
                className="text-xs sm:text-sm min-h-9"
              >
                Todos
              </Button>
              {daysOfWeek.map(day => (
                <Button
                  key={day}
                  variant={selectedDay === day ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDay(day)}
                  className="text-xs sm:text-sm min-h-9"
                >
                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de turmas */}
      {filteredClasses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            {allClasses.length === 0 ? (
              <>
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma turma atribuída</h3>
                <p className="text-muted-foreground mb-6">
                  Entre em contato com a secretaria para ter turmas atribuídas ao seu perfil.
                </p>
                <Button variant="outline" asChild>
                  <Link to="/professor/dashboard">Voltar ao Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma turma encontrada</h3>
                <p className="text-muted-foreground mb-6">
                  Tente ajustar os filtros para encontrar suas turmas.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedYear(null);
                    setSelectedDay(null);
                  }}
                >
                  Limpar Filtros
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredClasses.map((schoolClass) => {
            const info = getClassDisplayInfo(schoolClass, levels, modalities);
            
            return (
              <Card key={schoolClass.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{schoolClass.name}</CardTitle>
                      {schoolClass.code && (
                        <p className="text-sm text-muted-foreground">{schoolClass.code}</p>
                      )}
                    </div>
                    {schoolClass.year && (
                      <Badge variant="secondary">{schoolClass.year}</Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Informações básicas */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{schoolClass.students.length} aluno{schoolClass.students.length !== 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{info.days}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{info.time}</span>
                    </div>
                    
                    {(info.level !== 'Sem nível' || info.modality !== 'Sem modalidade') && (
                      <div className="text-xs text-muted-foreground">
                        {info.levelModality}
                      </div>
                    )}
                  </div>
                  
                  {/* Ações */}
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1 min-h-10">
                      <Link to={`/professor/turma/${schoolClass.id}`}>
                        Abrir
                      </Link>
                    </Button>
                    
                    <Button variant="outline" size="sm" asChild className="min-h-10 min-w-10">
                      <Link to={`/professor/atividades/nova?turma=${schoolClass.id}`}>
                        <FileText className="h-4 w-4" />
                      </Link>
                    </Button>
                    
                    <Button variant="outline" size="sm" title="Exportar CSV" className="min-h-10 min-w-10">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}