# Requisitos de Integração de Pedidos de Terceiros (Restaurante)

Data da varredura: 2026-04-23

## Objetivo

Checklist mínimo para um POS receber e tratar pedidos de terceiros com segurança e rastreabilidade por usuário.

## iFood (Merchant API)

- Receber eventos via webhook HTTPS e/ou polling de contingência.
- Tratar entrega "at least once": deduplicar por `id` de evento/pedido.
- Confirmar recebimento no polling com `/events/acknowledgment`.
- Implementar fallback de polling para reconciliação durante instabilidade.
- Validar autenticação OAuth 2.0 com Bearer token.

Fontes:
- https://developer.ifood.com.br/en-US/docs/guides/order/workflow/
- https://developer.ifood.com.br/en-US/docs/guides/modules/events/webhook-overview
- https://developer.ifood.com.br/en-US/docs/guides/modules/events/polling-overview
- https://developer.ifood.com.br/en-US/docs/guides/modules/authentication/intro

## Uber Eats (Marketplace API)

- Configurar webhook primário no dashboard do app.
- Responder webhook com HTTP 200 para ACK.
- Validar assinatura `X-Uber-Signature` (HMAC SHA256).
- Após webhook de novo pedido, executar accept/deny dentro da janela operacional.
- Usar OAuth 2.0 e escopos corretos (`eats.order`).

Fontes:
- https://developer.uber.com/docs/eats/guides/webhooks
- https://developer.uber.com/docs/eats/references/api/webhooks.orders-notification
- https://developer.uber.com/docs/eats/references/api/v1/post-eats-order-orderid-acceptposorder
- https://developer.uber.com/docs/eats/references/api/v1/post-eats-order-orderid-denyposorder
- https://developer.uber.com/docs/eats/guides/authentication

## Google Food Ordering (Actions Center / Order with Google)

- Modelo de parceria via Actions Center (onboarding e portal de parceiro).
- Para food ordering redirect, usar action links dedicados (delivery/takeout).
- Exigir landing pages específicas de ação (evitar homepage genérica).

Fontes:
- https://developers.google.com/actions-center/verticals/ordering/redirect/reference/action-link-feeds/ordering-action-links-delivery-and-takeout
- https://developers.google.com/actions-center/verticals/ordering/redirect/reference/feed-best-practices/food-and-retail-action-links
- https://developers.google.com/actions-center/verticals/dining/guides/end-to-end-integration/overview
- https://support.google.com/business/answer/10918858?hl=en

## Requisitos transversais para POS

- Configuração por usuário + provedor (credenciais e segredos separados).
- Fila de pedidos recebidos com estados: `received`, `accepted`, `rejected`, `failed`.
- Aceite de pedido de terceiro criando pedido interno rastreável.
- Auditoria: manter `provider`, `externalOrderId`, `internalOrderId`, timestamps e usuário responsável.
- Modo de teste para ingestão de payload (simulação de webhook).
- Observabilidade: logs de erro por provedor e retentativas controladas.
