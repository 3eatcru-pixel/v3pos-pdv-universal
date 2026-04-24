/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Printer, PrintJob } from '../types';

class PrinterService {
  private printers: Printer[] = [];
  private jobs: PrintJob[] = [];

  constructor(initialPrinters: Printer[]) {
    this.printers = initialPrinters;
  }

  getPrinters() {
    return this.printers;
  }

  getPrintersByType(type: Printer['type']) {
    return this.printers.filter(p => p.type === type);
  }

  getDefaultPrinter(type: Printer['type']) {
    return this.printers.find(p => p.type === type && p.isDefault) || this.printers.find(p => p.type === type);
  }

  async print(printerId: string, content: string): Promise<boolean> {
    const printer = this.printers.find(p => p.id === printerId);
    if (!printer) throw new Error('Printer not found');

    const job: PrintJob = {
      id: `job-${Math.random().toString(36).substr(2, 9)}`,
      printerId,
      timestamp: Date.now(),
      content,
      status: 'pending'
    };

    this.jobs.push(job);
    job.status = 'printing';

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (printer.status === 'offline') {
      job.status = 'failed';
      job.error = 'Printer is offline';
      return false;
    }

    job.status = 'completed';
    // [PRINT] Conteúdo enviado para impressora
    
    // For receipt printers, we can also trigger browser print for real hardware testing if system_default
    if (printer.connectionType === 'system_default') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`<pre>${content}</pre>`);
            printWindow.document.close();
            printWindow.print();
            printWindow.close();
        }
    }

    return true;
  }

  getJobs() {
    return this.jobs;
  }

  updatePrinters(printers: Printer[]) {
    this.printers = printers;
  }
}

export const printerService = new PrinterService([]);
