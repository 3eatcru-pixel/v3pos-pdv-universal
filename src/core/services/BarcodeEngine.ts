export interface ParsedBarcode {
  raw: string;
  normalized: string;
  gtin?: string;
  format: 'unknown' | 'gs1-digital-link' | 'numeric-1d';
}

export class BarcodeEngine {
  static parse(input: string): ParsedBarcode {
    const raw = String(input || '').trim();
    if (!raw) return { raw, normalized: '', format: 'unknown' };

    const normalized = raw.replace(/\s+/g, '');

    // GS1 Digital Link (e.g. https://.../01/09506000134352)
    const digitalLinkMatch = normalized.match(/\/01\/(\d{14})/);
    if (digitalLinkMatch) {
      return {
        raw,
        normalized,
        gtin: digitalLinkMatch[1],
        format: 'gs1-digital-link',
      };
    }

    // 1D numeric barcode candidates (EAN/UPC/GTIN fragments)
    const numeric = normalized.replace(/\D/g, '');
    if (numeric.length >= 8) {
      return {
        raw,
        normalized: numeric,
        gtin: numeric.length >= 14 ? numeric.slice(0, 14) : undefined,
        format: 'numeric-1d',
      };
    }

    return { raw, normalized, format: 'unknown' };
  }

  static matchesProduct(parsed: ParsedBarcode, product: any): boolean {
    if (!product) return false;
    const barcodeFields = [
      String(product.barcode || ''),
      String(product.gtin || ''),
      String(product.code || ''),
      String(product.sku || ''),
    ]
      .map((v) => v.trim())
      .filter(Boolean);

    if (barcodeFields.length === 0) return false;

    return barcodeFields.some((value) => {
      const cleanValue = value.replace(/\s+/g, '');
      return (
        cleanValue === parsed.normalized ||
        (parsed.gtin && cleanValue.includes(parsed.gtin)) ||
        cleanValue === parsed.raw
      );
    });
  }
}

