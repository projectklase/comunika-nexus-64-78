import { supabase } from '@/integrations/supabase/client';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SystemLogContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

class SystemLogger {
  private async log(level: LogLevel, message: string, context?: SystemLogContext) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('system_logs').insert([{
        level,
        message,
        context: context || {},
        user_id: user?.id || context?.userId,
      }]);
    } catch (error) {
      // Fallback para console em caso de erro
      console.error(`[SystemLogger] Failed to log: ${level} - ${message}`, error);
    }
  }

  info(message: string, context?: SystemLogContext) {
    return this.log('info', message, context);
  }

  warn(message: string, context?: SystemLogContext) {
    return this.log('warn', message, context);
  }

  error(message: string, context?: SystemLogContext) {
    return this.log('error', message, context);
  }

  debug(message: string, context?: SystemLogContext) {
    if (import.meta.env.DEV) {
      return this.log('debug', message, context);
    }
  }

  // Buscar logs (apenas para secretaria)
  async getLogs(filters?: {
    level?: LogLevel;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    limit?: number;
  }) {
    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.level) {
        query = query.eq('level', filters.level);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[SystemLogger] Error fetching logs:', error);
      return [];
    }
  }

  // Limpar logs antigos (apenas para secretaria)
  async cleanupOldLogs(daysToKeep: number = 90) {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_system_logs', {
        days_to_keep: daysToKeep
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[SystemLogger] Error cleaning up logs:', error);
      throw error;
    }
  }
}

export const systemLogger = new SystemLogger();
