import type { ThirdPartyProvider } from '../../../types';

export interface CsvMappingRow {
  productId: string;
  externalSku: string;
  externalName?: string;
  active?: boolean;
  provider?: ThirdPartyProvider;
}

const normalizeHeader = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, '');

const toBoolean = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'sim', 'ativo'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'nao', 'não', 'inativo'].includes(normalized)) return false;
  return undefined;
};

const splitCsvLine = (line: string, delimiter: string): string[] => {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cols.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cols.push(current.trim());
  return cols;
};

const detectDelimiter = (headerLine: string): string => {
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
};

export class ThirdPartyMappingCsvEngine {
  static parse(csvText: string): CsvMappingRow[] {
    const lines = csvText
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      throw new Error('CSV vazio ou sem linhas suficientes.');
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
    const indexByHeader = headers.reduce<Record<string, number>>((acc, header, index) => {
      acc[header] = index;
      return acc;
    }, {});

    const productIdIndex = indexByHeader.productid ?? indexByHeader.product_id ?? indexByHeader.id;
    const externalSkuIndex = indexByHeader.externalsku ?? indexByHeader.external_sku ?? indexByHeader.sku;
    const externalNameIndex = indexByHeader.externalname ?? indexByHeader.external_name ?? indexByHeader.name;
    const activeIndex = indexByHeader.active ?? indexByHeader.ativo;
    const providerIndex = indexByHeader.provider ?? indexByHeader.provedor;

    if (productIdIndex === undefined || externalSkuIndex === undefined) {
      throw new Error('CSV precisa conter as colunas productId e externalSku.');
    }

    const rows: CsvMappingRow[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cols = splitCsvLine(lines[i], delimiter);
      const productId = (cols[productIdIndex] || '').trim();
      const externalSku = (cols[externalSkuIndex] || '').trim();
      if (!productId || !externalSku) continue;

      rows.push({
        productId,
        externalSku,
        externalName: externalNameIndex !== undefined ? (cols[externalNameIndex] || '').trim() || undefined : undefined,
        active: activeIndex !== undefined ? toBoolean(cols[activeIndex]) : undefined,
        provider:
          providerIndex !== undefined && cols[providerIndex]
            ? (cols[providerIndex].trim().toLowerCase() as ThirdPartyProvider)
            : undefined,
      });
    }
    return rows;
  }
}
