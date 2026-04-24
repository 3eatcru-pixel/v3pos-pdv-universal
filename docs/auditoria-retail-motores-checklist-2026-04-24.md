# Auditoria Retail - Novos Motores e Logica (2026-04-24)

## Escopo auditado
- Modulo `retail`:
  - `RetailLayout`
  - `RetailDashboard`
  - `RetailPOS`
  - `RetailCRM`
  - `retailService`
  - Repositorios locais (`saleRepository`, `productRepository`)
- Motores de referencia:
  - `StockReconciliationEngine`
  - `FinanceEngine`
  - `FinanceManagementView`

## Resultado por submodulo

### 1) Layout / Navegacao (`RetailLayout`)
- [x] Financeiro integrado com novo motor via `FinanceManagementView`.
- [x] Escopo por unidade (`shopId`) ja injetado no Financeiro.
- [ ] Definir permissao explicita para "ajuste acima do limite" no menu/perfil (owner/manager).

### 2) Financeiro (`FinanceManagementView` usado no retail)
- [x] Sessao de contagem cega (abertura/fechamento com assinatura).
- [x] Reconciliacao de estoque com trilha de auditoria.
- [x] Dupla aprovacao para ajuste acima do limite.
- [x] Impacto financeiro de reconciliacao no DRE.
- [ ] Adicionar filtro/segmentacao visual "somente retail" para auditoria operacional (colunas/tags de origem).

### 3) POS (`RetailPOS`)
- [x] Venda e devolucao com sincronizacao de malha.
- [x] Indicadores de sync (pendente/online/manual sync).
- [x] Fluxo de "Gestao de Faltas" migrado para contagem/reconciliacao oficial (motor novo).
- [x] CTA no POS para abrir contagem oficial sem sair da operacao.
- [x] Devolucao vinculada a registro financeiro formal (`transactions`) para caixa/DRE.
- [~] Fluxo de devolucao migrou de `prompt` para formulario auditavel no POS (ID + motivo obrigatorios); pendente assinatura/comprovante.

### 4) Dashboard (`RetailDashboard`)
- [x] Indicadores de vendas e sync basicos.
- [~] Indicadores principais ainda usam repositorio local para vendas/produtos; camada de auditoria operacional agora consolidada do motor novo.
- [x] Cards de auditoria adicionados: sessoes cegas abertas, ajustes criticos, impacto negativo por ajuste.
- [ ] Falta "reconciliacoes por operador/turno" para supervisao detalhada.

### 5) CRM (`RetailCRM`)
- [x] Dados sairam de mock e foram conectados a `customers` por tenant/shop.
- [ ] Sem vinculo automatico com eventos de venda/devolucao do novo fluxo financeiro.
- [~] Trilha de consentimento inicial implementada no cadastro (consentimento + audit log); pendente governanca completa de campanhas.

### 6) Servico retail (`retailService`)
- [x] Processa venda/devolucao e sincroniza malha.
- [x] Trata duplicidade de eventos em sync.
- [x] Grava transacao financeira formal via `FinanceEngine` ao concluir venda/devolucao.
- [ ] Nao consome sessao de contagem cega ou aprovacao por limite em ajustes de estoque.
- [ ] Garantia (`Warranty`) apenas em evento de malha; falta persistencia/consulta/auditoria no fluxo atual.

### 7) Repositorios locais (`productRepository` / `saleRepository`)
- [x] Controle local de estoque por venda/devolucao.
- [ ] Estoque local nao esta unificado com ajuste atomico central (risco de divergencia em concorrencia).
- [ ] Falta reconciliacao automatica entre estoque local e estoque oficial apos sync.

## Gaps criticos (prioridade alta)
- [x] Substituir "Gestao de Faltas" do POS para usar o novo motor de reconciliacao (contagem + comentario + aprovador quando aplicavel).
- [x] Registrar venda/devolucao do retail tambem em `transactions` para alimentar DRE e caixa oficialmente.
- [x] Remover `prompt/alert` de devolucao e criar formulario auditavel com campos obrigatorios.
- [x] Evoluir formulario de devolucao para assinatura/comprovante.
- [x] Criar painel de excecoes no dashboard (sessoes cegas abertas, ajustes criticos, impacto negativo).

## Plano de execucao recomendado (curto)
- Fase A (motor): integrar `retailService` com `FinanceEngine` e eventos de reconciliacao.
- Fase B (POS): trocar fluxo "falta/86" por fluxo oficial de contagem/reconciliacao.
- Fase C (dashboard): cards e lista de auditoria operacional retail.
- Fase D (CRM): tirar mocks e conectar base real por tenant/shop.

## Criterio de aceite retail (target)
- [x] Toda venda/devolucao gera reflexo financeiro auditavel.
- [x] Todo ajuste de estoque passa por contagem formal e, quando necessario, aprovacao.
- [x] Nenhum ajuste critico ocorre via toggle simples (`active`) sem trilha.
- [ ] Dashboard exibe estado de controle (pendencias, riscos, impacto).
