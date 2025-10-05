import { supabase } from '@/integrations/supabase/client'; // Ajuste o caminho se for diferente

/**
 * Interface para o VALOR de uma configuração.
 * O VALOR é um objeto JSONB, o que nos dá flexibilidade.
 */
export interface SchoolSettingValue {
  enabled?: boolean;
  // Podemos adicionar outros campos no futuro, ex: value: number, options: string[]
  [key: string]: any; 
}

/**
 * Busca o valor de uma configuração específica no Supabase.
 * @param key A chave da configuração (ex: 'use_activity_weights')
 * @returns O objeto de valor da configuração, ou null se não for encontrado.
 */
export const getSetting = async (key: string): Promise<SchoolSettingValue | null> => {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', key)
    .single();

  // O erro 'PGRST116' significa 'nenhuma linha encontrada', o que é normal.
  // Tratamos qualquer outro erro como um problema real.
  if (error && error.code !== 'PGRST116') {
    console.error(`Erro ao buscar configuração '${key}':`, error);
    return null;
  }

  return data ? (data.value as SchoolSettingValue) : null;
};

/**
 * Atualiza ou cria uma configuração no Supabase.
 * @param key A chave da configuração (ex: 'use_activity_weights')
 * @param value O novo objeto de valor para a configuração.
 */
export const updateSetting = async (key: string, value: SchoolSettingValue): Promise<void> => {
  const { error } = await supabase
    .from('school_settings')
    .upsert({ key, value }, { onConflict: 'key' }); // Upsert é perfeito: cria se não existir, atualiza se já existir.

  if (error) {
    console.error(`Erro ao atualizar configuração '${key}':`, error);
    throw error;
  }
};

/**
 * Helper assíncrono para verificar se o sistema de pesos de atividades está habilitado.
 * Retorna 'true' como padrão se a configuração não existir.
 */
export const isWeightsEnabled = async (): Promise<boolean> => {
  const setting = await getSetting('use_activity_weights');
  // Se a configuração não existir (null) ou a propriedade 'enabled' não estiver definida,
  // retornamos 'true' como um padrão seguro.
  return setting?.enabled ?? true;
};

/**
 * Helper assíncrono para ATUALIZAR o estado do sistema de pesos.
 */
export const setWeightsEnabled = async (enabled: boolean): Promise<void> => {
  await updateSetting('use_activity_weights', { enabled });
};