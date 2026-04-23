# POS Requisitos (Web Audit) - Restaurante e Varejo

Data da varredura: 23/04/2026

## Fontes usadas (oficiais/primárias)
- GS1 - 2D Barcodes at Retail POS (Release 1.1.0, ratified Dec/2025): [ref.gs1.org/guidelines/2d-in-retail](https://ref.gs1.org/guidelines/2d-in-retail/)
- GS1 - Barcode standards: [gs1.org/standards/barcodes](https://www.gs1.org/standards/barcodes)
- PCI SSC - PTS POI (segurança de dispositivo de pagamento): [pcisecuritystandards.org/standards/pts-point-of-interaction-poi](https://www.pcisecuritystandards.org/standards/pts-point-of-interaction-poi/)
- PCI SSC FAQ - proteção física de POI (PCI DSS Req. 9.5): [pcisecuritystandards.org/faqs/...9-5](https://www.pcisecuritystandards.org/faqs/are-point-of-interaction-devices-required-to-be-physically-secured-for-example-with-a-cable-or-tether-to-prevent-removal-or-substitution-to-meet-pci-dss-requirement-9-5/)
- Portal NF-e/NFC-e - MOC 7.0 (publicações recentes de abril/2026): [nfe.fazenda.gov.br ... MOC 7.0](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=J+I+v4eN00E%3D)
- Portal NF-e - Informes Técnicos vigentes: [nfe.fazenda.gov.br ... Informes Técnicos](https://www.nfe.fazenda.gov.br/portal/consulta.aspx/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4%3D)
- BCB - Normas do Pix: [bcb.gov.br/estabilidadefinanceira/pix-normas](https://www.bcb.gov.br/estabilidadefinanceira/pix-normas)
- Shopify POS docs (referência operacional varejo): [Inventory management](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/inventory-management), [Returns/Exchanges](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/order-management)
- Toast POS docs (referência operacional restaurante): [How Toast Works](https://pos.toasttab.com/how-toast-works/)

## Requisitos essenciais mapeados

### Comuns (Restaurante e Varejo)
- Pagamentos com trilha de auditoria (quem, quando, valor, método).
- Segurança de meios de pagamento (POI hardening + inspeção física periódica).
- Sincronização offline/online resiliente.
- Gestão de estoque com contagem e reconciliação.
- Logs de eventos críticos (ajuste de estoque, estorno/devolução, cancelamento).

### Varejo
- Leitura de código de barras com conformidade GS1 (1D + 2D progressivo até 2027).
- Devolução/troca com atualização de estoque.
- Regras de retorno (janela, exceções, motivo).
- Inventário por loja + histórico de ajustes.

### Restaurante
- Encaminhamento de pedidos para cozinha/KDS.
- Integração salão/cozinha (status do item).
- Operação multicanal (balcão, mesa, online) com roteamento único.

### Fiscal Brasil
- Atualização contínua com MOC 7.0 e Informes Técnicos da NF-e/NFC-e.
- Suporte à evolução de tabelas técnicas e regras de validação.
- Adequações de meios de pagamento e QRCode NFC-e por UF conforme notas técnicas.

## Gaps tratados neste ciclo
- Motor financeiro com resumo e filtros centralizados.
- DRE simplificada na tela de finanças.
- Contagem/reconciliação de estoque com impacto financeiro.
- Devolução rápida no varejo com reversão de estoque e sincronização.

## Próximos gaps (prioridade alta)
- Modo de leitura 2D GS1 no scanner de varejo (extração GTIN de Digital Link/AI).
- Política configurável de devolução/troca (janela em dias, motivo obrigatório, override com justificativa).
- Dashboard fiscal técnico (monitor de aderência MOC/NT por versão).
- Roteamento avançado de produção/KDS por estação no restaurante.

