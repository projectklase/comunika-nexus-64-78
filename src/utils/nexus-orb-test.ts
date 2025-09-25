import { postStore } from '@/stores/post-store';
import { PostInput } from '@/types/post';

/**
 * Mini teste para demonstrar funcionamento do UniversalNexusOrb
 * Cria atividades para testar o badge count
 */
export function createTestActivities() {
  const now = new Date();
  const today = new Date();
  today.setHours(23, 59, 0, 0); // Final do dia de hoje
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 0, 0);
  
  // 1. Atividade atrasada (ontem)
  const overdueActivity: PostInput = {
    type: 'ATIVIDADE',
    title: 'Relatório de Física - ATRASADA',
    body: 'Esta atividade está atrasada e deveria aparecer no badge do orb.',
    dueAt: yesterday.toISOString(),
    classIds: ['class-6a'],
    audience: 'CLASS'
  };
  
  // 2. Primeira atividade para hoje
  const todayActivity1: PostInput = {
    type: 'TRABALHO',
    title: 'Redação sobre Meio Ambiente - HOJE',
    body: 'Esta atividade vence hoje e deveria aparecer no badge.',
    dueAt: today.toISOString(),
    classIds: ['class-6a'],
    audience: 'CLASS'
  };
  
  // 3. Segunda atividade para hoje
  const todayActivity2: PostInput = {
    type: 'PROVA',
    title: 'Prova de Matemática - HOJE',
    body: 'Esta prova é hoje e deveria aparecer no badge.',
    dueAt: today.toISOString(),
    classIds: ['class-6a'],
    audience: 'CLASS'
  };
  
  try {
    postStore.create(overdueActivity, 'Sistema de Teste');
    postStore.create(todayActivity1, 'Sistema de Teste');
    postStore.create(todayActivity2, 'Sistema de Teste');
    
    console.log('✅ Atividades de teste criadas:');
    console.log('  - 1 atividade atrasada (ontem)');
    console.log('  - 2 atividades para hoje');
    console.log('  - Badge deveria mostrar "3"');
    
    return {
      success: true,
      expectedBadgeCount: 3,
      message: 'Atividades de teste criadas com sucesso!'
    };
  } catch (error) {
    console.error('❌ Erro ao criar atividades de teste:', error);
    return {
      success: false,
      error: error
    };
  }
}

/**
 * Remove as atividades de teste criadas
 */
export function clearTestActivities() {
  const posts = postStore.list();
  const testPosts = posts.filter(post => 
    post.title.includes('ATRASADA') || 
    post.title.includes('HOJE')
  );
  
  let deleted = 0;
  testPosts.forEach(post => {
    if (postStore.delete(post.id)) {
      deleted++;
    }
  });
  
  console.log(`🧹 ${deleted} atividades de teste removidas`);
  return deleted;
}

/**
 * Simula marcar uma atividade como entregue
 */
export function markActivityAsDelivered(title: string) {
  const posts = postStore.list();
  const activity = posts.find(post => post.title.includes(title));
  
  if (activity) {
    // Simula marcar como entregue arquivando a atividade
    const success = postStore.archive(activity.id);
    if (success) {
      console.log(`✅ Atividade "${title}" marcada como entregue (arquivada)`);
      return true;
    } else {
      console.error(`❌ Erro ao marcar "${title}" como entregue`);
      return false;
    }
  } else {
    console.error(`❌ Atividade "${title}" não encontrada`);
    return false;
  }
}

// Disponibilizar funções globalmente para teste no console
if (typeof window !== 'undefined') {
  (window as any).nexusOrbTest = {
    create: createTestActivities,
    clear: clearTestActivities,
    markDelivered: markActivityAsDelivered
  };
}