import { firebaseService } from '../../services/firebaseService';
import { accountService } from '../services/accountService';
import { Order, Product, Shop } from '../../types';
import { format } from 'date-fns';
import { logger } from '../services/logger';

/**
 * FiscalSAFTGenerator - Motor de conformidade fiscal para Portugal (SAFT-PT)
 * Gera o arquivo XML padrão para inspeções da Autoridade Tributária (AT).
 * Baseado na Portaria n.º 302/2016 (Estrutura de dados 1.04_01).
 */
export class FiscalSAFTGenerator {
  /**
   * Gera o conteúdo XML do SAFT-PT para um período específico.
   */
  static async generateSAFT(enterpriseId: string, month: number, year: number): Promise<string> {
    logger.info('fiscal', 'Iniciando geração de auditoria SAFT-PT', { month, year });

    try {
      const company = await accountService.getCompanyById(enterpriseId);
      if (!company) throw new Error('empresa_nao_localizada');

      // Auditoria Preventiva: Verifica identificação mínima necessária para Portugal
      if (!company.nif && !company.cnpj) {
        logger.error('fiscal', 'Empresa sem NIF/CNPJ configurado para exportação SAFT', { enterpriseId });
      }

      // 1. Coleta de dados via Firebase Service
      const periodOrders = (await firebaseService.getDocsByQuery('orders', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'closedAt', op: '>=', value: new Date(year, month, 1).getTime() },
        { field: 'closedAt', op: '<=', value: new Date(year, month + 1, 0, 23, 59, 59).getTime() }
      ])) as Order[];

      const products = (await firebaseService.getDocsByQuery('products', [
        { field: 'enterpriseId', op: '==', value: enterpriseId }
      ])) as Product[];

      // 2. Montagem do XML (AuditFile)
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
      
      // Header: Identificação da Empresa e Software
      xml += this.buildHeader(company, year, month);
      
      // MasterFiles: Catálogo de Produtos e Impostos
      xml += `  <MasterFiles>\n`;
      xml += this.buildProductsXML(products);
      xml += this.buildTaxTableXML();
      xml += `  </MasterFiles>\n`;
      
      // SourceDocuments: Movimentos de Venda (Faturas)
      xml += `  <SourceDocuments>\n`;
      xml += await this.buildSalesInvoicesXML(periodOrders, company);
      xml += `  </SourceDocuments>\n`;

      xml += `</AuditFile>`;

      logger.info('fiscal', 'SAFT-PT processado com sucesso', { entries: periodOrders.length });
      return xml;
    } catch (error) {
      logger.error('fiscal', 'Falha crítica na geração do SAFT-PT', { error });
      throw error;
    }
  }

  private static buildHeader(company: any, year: number, month: number): string {
    const today = format(new Date(), 'yyyy-MM-dd');
    return `    <Header>
      <AuditFileSchemaVersion>1.04_01</AuditFileSchemaVersion>
      <CompanyID>${company.id}</CompanyID>
      <TaxRegistrationNumber>${company.nif || company.cnpj || '999999990'}</TaxRegistrationNumber>
      <TaxAccountingBasis>P</TaxAccountingBasis>
      <CompanyName>${company.name}</CompanyName>
      <BusinessName>${company.name}</BusinessName>
      <CompanyAddress>
        <AddressDetail>${company.address || 'Portugal Office'}</AddressDetail>
        <City>Lisboa</City>
        <PostalCode>1000-001</PostalCode>
        <Country>PT</Country>
      </CompanyAddress>
      <FiscalYear>${year}</FiscalYear>
      <StartDate>${format(new Date(year, month, 1), 'yyyy-MM-dd')}</StartDate>
      <EndDate>${format(new Date(year, month + 1, 0), 'yyyy-MM-dd')}</EndDate>
      <CurrencyCode>EUR</CurrencyCode>
      <DateCreated>${today}</DateCreated>
      <TaxEntity>Global</TaxEntity>
      <ProductCompanyID>Modular POS Universal</ProductCompanyID>
      <SoftwareCertificateNumber>0000</SoftwareCertificateNumber>
    </Header>\n`;
  }

  private static buildProductsXML(products: Product[]): string {
    return products.map(p => `    <Product>
      <ProductType>P</ProductType>
      <ProductCode>${p.id.slice(-8).toUpperCase()}</ProductCode>
      <ProductDescription>${p.name}</ProductDescription>
      <ProductNumberCode>${p.id.slice(-8)}</ProductNumberCode>
    </Product>\n`).join('');
  }

  private static buildTaxTableXML(): string {
    // Regra IVA Portugal: NOR (Normal 23%), INT (Intermédio 13%), RED (Reduzido 6%)
    return `    <TaxTable>
      <TaxTableEntry>
        <TaxType>IVA</TaxTableEntry>
        <TaxCountryRegion>PT</TaxCountryRegion>
        <TaxCode>NOR</TaxCode>
        <Description>Taxa Normal</Description>
        <TaxPercentage>23.00</TaxPercentage>
      </TaxTableEntry>
    </TaxTable>\n`;
  }

  private static async buildSalesInvoicesXML(orders: Order[], company: any): Promise<string> {
    const totalSales = orders.reduce((acc, o) => acc + o.total, 0);
    let lastHash = ''; // Mantém a referência para o encadeamento (Chaining)
    
    let xml = `    <SalesInvoices>
      <NumberOfEntries>${orders.length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${totalSales.toFixed(2)}</TotalCredit>\n`;

    // Ordenação cronológica rigorosa é obrigatória para o encadeamento do Hash
    const sortedOrders = [...orders].sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0));

    for (const order of sortedOrders) {
      const invoiceNo = `FT ${format(order.closedAt!, 'yyyy')}/${order.id.slice(-6).toUpperCase()}`;
      const systemEntryDate = format(order.closedAt!, "yyyy-MM-dd'T'HH:mm:ss");
      const invoiceDate = format(order.closedAt!, 'yyyy-MM-dd');
      
      const currentHash = this.signDocument(invoiceDate, systemEntryDate, invoiceNo, order.total, lastHash);

      xml += `      <Invoice>
        <InvoiceNo>${invoiceNo}</InvoiceNo>
        <ATCUD>0</ATCUD>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>${format(order.closedAt!, "yyyy-MM-dd'T'HH:mm:ss")}</InvoiceStatusDate>
          <SourceID>${order.staffId || 'POS_USER'}</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>${currentHash}</Hash>
        <HashControl>1</HashControl>
        <Period>${format(order.closedAt!, 'MM')}</Period>
        <InvoiceDate>${invoiceDate}</InvoiceDate>
        <InvoiceType>FT</InvoiceType>
        <SystemEntryDate>${systemEntryDate}</SystemEntryDate>
        <CustomerID>Consumidor Final</CustomerID>\n`;
        
      order.items.forEach((item, idx) => {
        const lineTotal = Number((item as any).totalPrice ?? ((item as any).price || 0) * (item.quantity || 0));
        xml += `        <Line>
          <LineNumber>${idx + 1}</LineNumber>
          <ProductCode>${(item as any).productId?.slice(-8).toUpperCase() || 'SKU-001'}</ProductCode>
          <Quantity>${item.quantity}</Quantity>
          <UnitOfMeasure>UN</UnitOfMeasure>
          <UnitPrice>${(item as any).unitPrice?.toFixed(2) || '0.00'}</UnitPrice>
          <TaxPointDate>${format(order.closedAt!, 'yyyy-MM-dd')}</TaxPointDate>
          <Description>${item.name}</Description>
          <CreditAmount>${lineTotal.toFixed(2)}</CreditAmount>
          <Tax>
            <TaxType>IVA</TaxType>
            <TaxCountryRegion>PT</TaxCountryRegion>
            <TaxCode>NOR</TaxCode>
            <TaxPercentage>23.00</TaxPercentage>
          </Tax>
        </Line>\n`;
      });

      xml += `        <DocumentTotals>
          <TaxPayable>${(order.total * 0.23 / 1.23).toFixed(2)}</TaxPayable>
          <NetTotal>${(order.total / 1.23).toFixed(2)}</NetTotal>
          <GrossTotal>${order.total.toFixed(2)}</GrossTotal>
        </DocumentTotals>
      </Invoice>\n`;

      lastHash = currentHash; // Atualiza para a próxima fatura
    }

    xml += `    </SalesInvoices>\n`;
    return xml;
  }

  /**
   * Lógica de Assinatura RSA-SHA1 (Norma AT Portugal)
   * String a assinar: InvoiceDate + ";" + SystemEntryDate + ";" + InvoiceNo + ";" + GrossTotal + ";" + PreviousHash
   */
  private static signDocument(date: string, entryDate: string, no: string, total: number, prevHash: string): string {
    const rawString = `${date};${entryDate};${no};${total.toFixed(2)};${prevHash}`;
    
    try {
      // AUDITORIA: Em produção, você deve usar uma biblioteca como 'jsrsasign' ou 'node-forge'
      // para assinar a 'rawString' com sua chave privada PEM de 1024 bits.
      
      // Exemplo de como a string é montada antes de encriptar:
      logger.debug('fiscal', 'String preparada para Assinatura AT', { rawString });

      // Simulando o Hash assinado (Base64) para fins de estrutura XML
      // EM PRODUÇÃO: Este valor DEVE ser o resultado da assinatura RSA-SHA1 da rawString
      // usando uma chave privada PEM de 1024 bits, conforme Portaria n.º 302/2016.
      const mockHash = btoa(rawString).slice(0, 40).padEnd(40, 'A'); // Mock mais robusto
      
      /**
       * TODO: Implementação Real com biblioteca criptográfica (ex: 'jsrsasign' ou 'node-forge'):
       * import { KJUR } from 'jsrsasign';
       * const sig = new KJUR.crypto.Signature({ "alg": "SHA1withRSA" });
       * sig.init(privateKeyPEM); // privateKeyPEM deve ser carregada de forma segura
       * sig.updateString(rawString); // A string a ser assinada
       * return KJUR.hextob64(sig.sign()); // Retorna o hash assinado em Base64
       */
      
      return mockHash;
    } catch (error) {
      logger.error('fiscal', 'Erro ao gerar assinatura digital da fatura', { no });
      return 'ERROR_SIGNING';
    }
  }

  static downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}
