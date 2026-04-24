import { SystemLog } from '../types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogOrigin = SystemLog['origin'];

interface LogEntry extends SystemLog {
  level: LogLevel;
  timestamp: number;
}

/**
 * Logger Centralizado com Múltiplos Níveis de Severidade
 * 
 * Uso:
 * - logger.debug('core', 'Iniciando sincronização', { items: 5 })
 * - logger.info('restaurant', 'Pedido criado', { orderId: '123' })
 * - logger.warn('inventory', 'Estoque baixo', { product: 'Coca' })
 * - logger.error('payment', 'Falha na transação', { error: 'timeout' })
 */
class Logger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000; // Limitar tamanho do histórico em memória
  private logLevel: LogLevel = 'info'; // Nível padrão

  /**
   * Configurar o nível mínimo de log
   * debug < info < warn < error
   */
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
    this.info('system', 'Log level changed', { level });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private createEntry(
    level: LogLevel,
    origin: LogOrigin,
    action: string,
    data?: any,
    userId?: string
  ): LogEntry {
    return {
      timestamp: Date.now(),
      level,
      origin,
      action,
      data,
      userId
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);

    // Manter apenas os últimos maxLogs registros
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Adicionar styling baseado no nível (opcional)
    this.logToConsole(entry);
  }

  private logToConsole(entry: LogEntry) {
    const prefix = `[${entry.level.toUpperCase()}] [${entry.origin.toUpperCase()}]`;
    const styles = {
      debug: 'color: gray; font-style: italic;',
      info: 'color: blue;',
      warn: 'color: orange; font-weight: bold;',
      error: 'color: red; font-weight: bold;'
    };

    if (this.shouldLog(entry.level)) {
      const style = styles[entry.level];
      console.log(
        `%c${prefix} ${entry.action}`,
        style,
        entry.data || ''
      );
    }
  }

  /**
   * Log de Debug - Informações detalhadas para diagnóstico
   */
  debug(origin: LogOrigin, action: string, data?: any, userId?: string) {
    if (this.shouldLog('debug')) {
      const entry = this.createEntry('debug', origin, action, data, userId);
      this.addLog(entry);
      return entry;
    }
  }

  /**
   * Log de Info - Eventos significativos no fluxo normal da aplicação
   */
  info(origin: LogOrigin, action: string, data?: any, userId?: string) {
    if (this.shouldLog('info')) {
      const entry = this.createEntry('info', origin, action, data, userId);
      this.addLog(entry);
      return entry;
    }
  }

  /**
   * Log de Warn - Situações potencialmente prejudiciais
   */
  warn(origin: LogOrigin, action: string, data?: any, userId?: string) {
    if (this.shouldLog('warn')) {
      const entry = this.createEntry('warn', origin, action, data, userId);
      this.addLog(entry);
      return entry;
    }
  }

  /**
   * Log de Error - Erros que precisam de atenção imediata
   */
  error(origin: LogOrigin, action: string, data?: any, userId?: string) {
    if (this.shouldLog('error')) {
      const entry = this.createEntry('error', origin, action, data, userId);
      this.addLog(entry);
      return entry;
    }
  }

  /**
   * Método legado para compatibilidade
   */
  log(origin: LogOrigin, action: string, data?: any, userId?: string) {
    return this.info(origin, action, data, userId);
  }

  /**
   * Obter todos os logs
   */
  getLogs(level?: LogLevel, origin?: LogOrigin): LogEntry[] {
    let filtered = [...this.logs];

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (origin) {
      filtered = filtered.filter(log => log.origin === origin);
    }

    return filtered;
  }

  /**
   * Obter logs dos últimos N segundos
   */
  getRecentLogs(seconds: number = 60): LogEntry[] {
    const cutoffTime = Date.now() - (seconds * 1000);
    return this.logs.filter(log => log.timestamp >= cutoffTime);
  }

  /**
   * Limpar histórico de logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Exportar logs para análise (JSON)
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Exportar logs para análise (CSV)
   */
  exportLogsAsCSV(): string {
    const headers = ['Timestamp', 'Level', 'Origin', 'Action', 'Data', 'User ID'];
    const rows = this.logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.origin,
      log.action,
      JSON.stringify(log.data || {}),
      log.userId || 'N/A'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Obter estatísticas de logs
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
      byOrigin: {} as Record<string, number>,
      oldestLog: this.logs[0]?.timestamp || null,
      newestLog: this.logs[this.logs.length - 1]?.timestamp || null
    };

    for (const log of this.logs) {
      stats.byLevel[log.level]++;
      stats.byOrigin[log.origin] = (stats.byOrigin[log.origin] || 0) + 1;
    }

    return stats;
  }
}

export const logger = new Logger();

// Configurar nível de log baseado no ambiente
if (import.meta.env.DEV) {
  logger.setLogLevel('debug');
} else {
  logger.setLogLevel('info');
}
