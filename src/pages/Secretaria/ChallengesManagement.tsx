import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Trophy, Award } from 'lucide-react';
import { ChallengesTable } from '@/components/challenges/ChallengesTable';
import { ChallengeFormModal } from '@/components/challenges/ChallengeFormModal';
import { ChallengeFilters } from '@/components/challenges/ChallengeFilters';
import { useChallenges, Challenge } from '@/hooks/useChallenges';

export default function ChallengesManagement() {
  const {
    challenges,
    loading,
    createChallenge,
    updateChallenge,
    deleteChallenge,
    toggleActive,
  } = useChallenges();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChallenges = useMemo(() => {
    return challenges.filter(challenge => {
      const matchesType = typeFilter === 'ALL' || challenge.type === typeFilter;
      const matchesSearch = challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           challenge.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [challenges, typeFilter, searchQuery]);

  const stats = useMemo(() => {
    const daily = challenges.filter(c => c.type === 'DAILY').length;
    const weekly = challenges.filter(c => c.type === 'WEEKLY').length;
    const achievements = challenges.filter(c => c.type === 'ACHIEVEMENT').length;
    const active = challenges.filter(c => c.is_active).length;

    return { daily, weekly, achievements, active, total: challenges.length };
  }, [challenges]);

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setShowFormModal(true);
  };

  const handleCloseModal = () => {
    setShowFormModal(false);
    setEditingChallenge(null);
  };

  const handleSubmit = async (data: Omit<Challenge, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingChallenge) {
      await updateChallenge(editingChallenge.id, data);
    } else {
      await createChallenge(data);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando desafios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Gerenciar Desafios
          </h1>
          <p className="text-muted-foreground">
            Configure desafios e recompensas para engajar os alunos
          </p>
        </div>

        <Button onClick={() => setShowFormModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Desafio
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="glass-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Desafios</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Target className="h-8 w-8 text-primary opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Desafios Ativos</p>
                <p className="text-2xl font-bold text-green-500">{stats.active}</p>
              </div>
              <Trophy className="h-8 w-8 text-green-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Diários</p>
                <p className="text-2xl font-bold text-blue-500">{stats.daily}</p>
              </div>
              <Award className="h-8 w-8 text-blue-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Semanais</p>
                <p className="text-2xl font-bold text-purple-500">{stats.weekly}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ChallengeFilters
          typeFilter={typeFilter}
          searchQuery={searchQuery}
          onTypeFilterChange={setTypeFilter}
          onSearchQueryChange={setSearchQuery}
        />
      </div>

      {/* Challenges List */}
      {filteredChallenges.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery || typeFilter !== 'ALL' ? 'Nenhum desafio encontrado' : 'Nenhum desafio criado'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || typeFilter !== 'ALL' 
                ? 'Tente ajustar os filtros para encontrar desafios.'
                : 'Crie o primeiro desafio para começar a engajar os alunos.'
              }
            </p>
            {!searchQuery && typeFilter === 'ALL' && (
              <Button onClick={() => setShowFormModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Desafio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ChallengesTable
          challenges={filteredChallenges}
          onEdit={handleEdit}
          onDelete={deleteChallenge}
          onToggleActive={toggleActive}
        />
      )}

      {/* Form Modal */}
      <ChallengeFormModal
        isOpen={showFormModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        challenge={editingChallenge}
      />
    </div>
  );
}
