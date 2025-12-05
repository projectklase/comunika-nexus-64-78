import { useState, useMemo, useEffect } from 'react';
import { format, isToday, isSameMonth, isSameWeek, parseISO, getMonth, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Cake, Search, Sparkles, PartyPopper, Calendar, Gift, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BirthdayStudent {
  id: string;
  name: string;
  avatar: string | null;
  dob: string;
  className?: string;
}

interface BirthdayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BirthdayModal({ open, onOpenChange }: BirthdayModalProps) {
  const { currentSchool } = useSchool();
  const [students, setStudents] = useState<BirthdayStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'today' | 'week' | 'month'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const today = new Date();

  useEffect(() => {
    if (open && currentSchool?.id) {
      fetchStudents();
    }
  }, [open, currentSchool?.id]);

  const fetchStudents = async () => {
    if (!currentSchool?.id) return;
    
    setLoading(true);
    try {
      // Fetch students with DOB from school
      const { data: memberships, error: membershipError } = await supabase
        .from('school_memberships')
        .select('user_id')
        .eq('school_id', currentSchool.id)
        .eq('role', 'aluno');

      if (membershipError) throw membershipError;

      const studentIds = memberships?.map(m => m.user_id) || [];
      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch profiles with DOB
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar, dob')
        .in('id', studentIds)
        .not('dob', 'is', null);

      if (profileError) throw profileError;

      // Fetch class info for students
      const { data: classStudents, error: classError } = await supabase
        .from('class_students')
        .select('student_id, class_id, classes(name)')
        .in('student_id', studentIds);

      if (classError) throw classError;

      // Map class names to students
      const classMap = new Map<string, string>();
      classStudents?.forEach(cs => {
        if (cs.classes && !classMap.has(cs.student_id)) {
          classMap.set(cs.student_id, (cs.classes as any).name);
        }
      });

      const studentsWithBirthdays: BirthdayStudent[] = (profiles || [])
        .filter(p => p.dob)
        .map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          dob: p.dob!,
          className: classMap.get(p.id)
        }));

      setStudents(studentsWithBirthdays);
    } catch (error) {
      console.error('Error fetching birthday students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if birthday matches today (same month and day)
  const isBirthdayToday = (dob: string) => {
    const birthDate = parseISO(dob);
    return getMonth(birthDate) === getMonth(today) && getDate(birthDate) === getDate(today);
  };

  // Check if birthday is this week
  const isBirthdayThisWeek = (dob: string) => {
    const birthDate = parseISO(dob);
    // Create a date in current year with same month/day
    const thisYearBirthday = new Date(today.getFullYear(), getMonth(birthDate), getDate(birthDate));
    return isSameWeek(thisYearBirthday, today, { weekStartsOn: 0 });
  };

  // Check if birthday is this month
  const isBirthdayThisMonth = (dob: string) => {
    const birthDate = parseISO(dob);
    return getMonth(birthDate) === getMonth(today);
  };

  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Apply birthday filter
    switch (filter) {
      case 'today':
        filtered = students.filter(s => isBirthdayToday(s.dob));
        break;
      case 'week':
        filtered = students.filter(s => isBirthdayThisWeek(s.dob));
        break;
      case 'month':
        filtered = students.filter(s => isBirthdayThisMonth(s.dob));
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.className?.toLowerCase().includes(query)
      );
    }

    // Sort by birthday date
    return filtered.sort((a, b) => {
      const dayA = getDate(parseISO(a.dob));
      const dayB = getDate(parseISO(b.dob));
      return dayA - dayB;
    });
  }, [students, filter, searchQuery]);

  const getAge = (dob: string) => {
    const birthDate = parseISO(dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    return age;
  };

  const formatBirthdayDate = (dob: string) => {
    const birthDate = parseISO(dob);
    return format(new Date(today.getFullYear(), getMonth(birthDate), getDate(birthDate)), "d 'de' MMMM", { locale: ptBR });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const counts = useMemo(() => ({
    today: students.filter(s => isBirthdayToday(s.dob)).length,
    week: students.filter(s => isBirthdayThisWeek(s.dob)).length,
    month: students.filter(s => isBirthdayThisMonth(s.dob)).length
  }), [students]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden glass border-pink-500/30">
        {/* Header com gradiente festivo */}
        <div className="relative bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-amber-500/20 p-6 border-b border-pink-500/20">
          <div className="absolute top-2 right-8 text-4xl opacity-50 animate-bounce">🎂</div>
          <div className="absolute top-4 left-8 text-2xl opacity-40">🎈</div>
          <div className="absolute bottom-2 right-16 text-xl opacity-30">🎁</div>
          
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 shadow-lg">
                <Cake className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-amber-400 bg-clip-text text-transparent font-bold">
                Aniversariantes
              </span>
              <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou turma..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-pink-500/30 focus:border-pink-500/50"
            />
          </div>
        </div>

        {/* Tabs de filtro */}
        <div className="px-6 pt-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="today" className="gap-2 data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400">
                <PartyPopper className="h-4 w-4" />
                <span className="hidden sm:inline">Hoje</span>
                {counts.today > 0 && (
                  <Badge variant="secondary" className="bg-pink-500/20 text-pink-400 text-xs">
                    {counts.today}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Semana</span>
                {counts.week > 0 && (
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
                    {counts.week}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                <Gift className="h-4 w-4" />
                <span className="hidden sm:inline">Mês</span>
                {counts.month > 0 && (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 text-xs">
                    {counts.month}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Lista de aniversariantes */}
        <ScrollArea className="h-[400px] px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Cake className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-center">
                {filter === 'today' && 'Nenhum aniversariante hoje'}
                {filter === 'week' && 'Nenhum aniversariante esta semana'}
                {filter === 'month' && 'Nenhum aniversariante este mês'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => {
                const isTodays = isBirthdayToday(student.dob);
                
                return (
                  <div
                    key={student.id}
                    className={cn(
                      "relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.02]",
                      isTodays 
                        ? "bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-amber-500/20 border border-pink-500/40 shadow-lg shadow-pink-500/10" 
                        : "bg-muted/30 border border-border/50 hover:border-pink-500/30"
                    )}
                  >
                    {/* Efeito de confetti para aniversariante de hoje */}
                    {isTodays && (
                      <>
                        <div className="absolute -top-1 -right-1 text-lg">🎉</div>
                        <div className="absolute -bottom-1 -left-1 text-sm">✨</div>
                      </>
                    )}

                    <Avatar className={cn(
                      "h-14 w-14 border-2",
                      isTodays ? "border-pink-500 shadow-lg shadow-pink-500/30" : "border-muted"
                    )}>
                      <AvatarImage src={student.avatar || undefined} />
                      <AvatarFallback className={cn(
                        "text-lg font-bold",
                        isTodays 
                          ? "bg-gradient-to-br from-pink-500 to-purple-500 text-white" 
                          : "bg-muted"
                      )}>
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={cn(
                          "font-semibold truncate",
                          isTodays && "text-pink-400"
                        )}>
                          {student.name}
                        </h4>
                        {isTodays && (
                          <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs shrink-0">
                            🎂 Hoje!
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatBirthdayDate(student.dob)}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{getAge(student.dob)} anos</span>
                      </div>
                      
                      {student.className && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {student.className}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer com total */}
        <div className="border-t border-pink-500/20 px-6 py-3 bg-muted/20">
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-medium text-foreground">{filteredStudents.length}</span>
            {' '}aniversariante{filteredStudents.length !== 1 ? 's' : ''}
            {filter === 'today' && ' hoje'}
            {filter === 'week' && ' esta semana'}
            {filter === 'month' && ' este mês'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
