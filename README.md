<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# v3 POS / PDV Universal — Run locally

Pequeno guia para executar e desenvolver localmente o sistema POS (PDV) focado em hospitalidade e varejo.

## Visão geral

Este repositório contém a aplicação frontend + backend legada usada para POS, inventário, KDS e sincronização P2P/inter-pipeline.

## Pré-requisitos
- Node.js 18+ ou compatível
- `npm` (ou `pnpm`/`yarn` se preferir ajustando os comandos)

## Rodando localmente

1. Instale dependências:
   `npm install`
2. Copie o exemplo de variáveis de ambiente e ajuste chaves sensíveis:
   `cp .env.example .env.local` (no Windows: copie manualmente ou use PowerShell `Copy-Item`)
   - Ajuste `GEMINI_API_KEY` se for usar integrações de IA; configure também credenciais Firebase se necessário.
3. Inicie em modo de desenvolvimento:
   `npm run dev`

## Scripts úteis
- `npm run dev` — inicia `server.ts` em modo desenvolvimento
- `npm run build` — build para produção (usa `vite build`)
- `npm run preview` — preview do build
- `npm run lint` — checagem TypeScript

## Notas de segurança e operação
- Não commit suas chaves (`.env*` está no `.gitignore`).
- Revise [security_spec.md](security_spec.md) para validações de regras do Firestore e cenários de ataque.

Se quiser, eu atualizo este README com instruções de deploy específicas (Firebase, Container, ou Azure). 
