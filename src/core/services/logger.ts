import { SystemLog } from '../types';

class Logger {
  private logs: SystemLog[] = [];

  log(origin: SystemLog['origin'], action: string, data?: any, userId?: string) {
    const entry: SystemLog = {
      timestamp: Date.now(),
      origin,
      action,
      data,
      userId
    };
    
    this.logs.push(entry);
    
    // In a real app, this would also write to a service or local storage
    console.log(`[${origin.toUpperCase()}] ${action}`, data || '');
    
    return entry;
  }

  getLogs() {
    return [...this.logs];
  }
}

export const logger = new Logger();
