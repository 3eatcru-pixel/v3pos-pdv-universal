# Guia de Logging e Validação - v3pos-pdv-universal

## 📋 Visão Geral

O projeto conta com um sistema de logging centralizado com múltiplos níveis de severidade e validação automática via git hooks.

---

## 🔍 Sistema de Logging

### Níveis de Severidade

O logger suporta 4 níveis de severidade:

| Nível | Uso | Exemplo |
|-------|-----|---------|
| **debug** | Informações detalhadas para diagnóstico | Estado de variáveis, valores intermediários |
| **info** | Eventos significativos no fluxo normal | Usuário logado, pedido criado |
| **warn** | Situações potencialmente prejudiciais | Estoque baixo, falha de sincronização |
| **error** | Erros que precisam de atenção | Falha na transação, dados corrompidos |

### Uso Básico

```typescript
import { logger } from '@/core/services/logger';

// Debug - Informações detalhadas
logger.debug('restaurant', 'Inicializando módulo', { moduleVersion: '1.0' });

// Info - Eventos normais
logger.info('orders', 'Pedido criado', { orderId: 'ORD-123', total: 250.50 }, userId);

// Warn - Avisos
logger.warn('inventory', 'Estoque baixo', { product: 'Coca 2L', quantity: 2 });

// Error - Erros
logger.error('payment', 'Falha na transação', { error: 'timeout', amount: 100 });
```

### Configuração do Nível Mínimo

```typescript
import { logger } from '@/core/services/logger';

// Definir nível mínimo de log
logger.setLogLevel('warn'); // Mostrará apenas warn e error

// Automático baseado no ambiente:
// - Desenvolvimento: 'debug' (todos os níveis)
// - Produção: 'info' (info, warn, error)
```

### Recuperar Logs

```typescript
// Obter todos os logs
const allLogs = logger.getLogs();

// Obter logs de um nível específico
const errors = logger.getLogs('error');

// Obter logs de uma origem específica
const restaurantLogs = logger.getLogs(undefined, 'restaurant');

// Obter logs dos últimos 60 segundos
const recentLogs = logger.getRecentLogs(60);
```

### Exportar Logs

```typescript
// Exportar como JSON
const json = logger.exportLogs();
console.log(json);

// Exportar como CSV (para análise em Excel)
const csv = logger.exportLogsAsCSV();
// Salvar em arquivo ou enviar para servidor

// Obter estatísticas
const stats = logger.getStats();
console.log(stats);
// {
//   total: 245,
//   byLevel: { debug: 100, info: 120, warn: 20, error: 5 },
//   byOrigin: { restaurant: 80, inventory: 65, payment: 100 },
//   oldestLog: 1713974400000,
//   newestLog: 1713981600000
// }
```

### Limpar Histórico

```typescript
// Limpar todos os logs em memória
logger.clearLogs();
```

---

## 🪝 Git Hooks - Validação Automática

### Configuração Inicial

Os hooks são configurados automaticamente após `npm install`, mas você pode configurar manualmente:

```bash
npm run setup:hooks
```

### Pre-commit Hook

Antes de cada commit, o hook valida:

1. **console.log** - Não autorizado em código de produção
2. **UTF-8** - Detecta caracteres corrompidos
3. **TypeScript** - Verifica erros de compilação

#### Exemplo: Bloqueado por console.log

```bash
$ git commit -m "Fix: adicionar log"
❌ Pré-commit checks FALHARAM

🔍 Verificando console.log...
❌ 1 violação(ões) encontrada(s):
   src/services/paymentService.ts:68
   console.log encontrado
   > console.log('Processando pagamento');

Por favor, remova console.log ou use // allow-console
```

#### Permitir console.log Específico

Se realmente precisar de um `console.log`, adicione o comentário `// allow-console`:

```typescript
// Permitido (permitirá o console.log)
console.log('Pagamento processado'); // allow-console

// Bloqueado (será detectado pelo hook)
console.log('Pagamento processado');
```

#### Pular o Hook (Não Recomendado)

```bash
# Fazer commit sem validação
git commit -m "..." --no-verify

# ⚠️ Evite usar --no-verify em produção
```

---

## 🔧 Exemplos Práticos

### Exemplo 1: Rastreamento de Pedido

```typescript
import { logger } from '@/core/services/logger';

async function createOrder(orderData) {
  logger.info('restaurant', 'Iniciando criação de pedido', { 
    itemCount: orderData.items.length 
  }, userId);

  try {
    const order = await firebaseService.saveItem('orders', orderId, orderData);
    
    logger.info('restaurant', 'Pedido criado com sucesso', { 
      orderId: order.id,
      total: order.total,
      table: order.tableId 
    }, userId);

    return order;
  } catch (error) {
    logger.error('restaurant', 'Falha ao criar pedido', { 
      error: error.message,
      orderData 
    }, userId);
    throw error;
  }
}
```

### Exemplo 2: Sincronização de Dados

```typescript
async function syncInventory() {
  logger.debug('inventory', 'Iniciando sincronização', { 
    timestamp: Date.now() 
  });

  const items = await getInventoryItems();
  
  if (items.length === 0) {
    logger.warn('inventory', 'Nenhum item para sincronizar', { 
      location: 'central' 
    });
    return;
  }

  logger.info('inventory', 'Sincronização iniciada', { 
    itemCount: items.length 
  });

  // ... fazer sincronização

  logger.info('inventory', 'Sincronização concluída', { 
    itemCount: items.length,
    duration: endTime - startTime 
  });
}
```

### Exemplo 3: Tratamento de Erros

```typescript
async function processPayment(transaction) {
  logger.debug('payment', 'Iniciando processamento', { 
    amount: transaction.amount,
    method: transaction.method 
  });

  try {
    const result = await paymentProvider.process(transaction);
    
    logger.info('payment', 'Pagamento autorizado', { 
      transactionId: result.id,
      amount: result.amount 
    }, userId);

    return result;
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      logger.warn('payment', 'Timeout na transação', { 
        amount: transaction.amount,
        retryCount: retries 
      });
    } else {
      logger.error('payment', 'Falha crítica', { 
        error: error.message,
        code: error.code,
        transaction: transaction.id 
      });
    }
    throw error;
  }
}
```

---

## 📊 Monitoramento e Análise

### Dashboard de Logs (Futuro)

Você pode criar um dashboard que:
- Exibe logs em tempo real
- Filtra por nível, origem ou usuário
- Mostra tendências e anomalias
- Integra-se com ferramentas de APM

### Integração com Serviços Externos

```typescript
// Exemplo: Enviar logs críticos para Sentry
if (entry.level === 'error') {
  await Sentry.captureException(new Error(entry.action), {
    extra: entry.data,
    user: { id: entry.userId }
  });
}

// Exemplo: Enviar para ELK Stack
if (entry.level === 'warn' || entry.level === 'error') {
  await elasticsearch.index({
    index: 'app-logs',
    body: entry
  });
}
```

---

## 🚀 Melhores Práticas

### ✅ Faça

```typescript
// ✅ Incluir contexto relevante
logger.info('orders', 'Pedido concluído', {
  orderId: '123',
  tableId: '5',
  total: 250.50,
  paymentMethod: 'card'
}, currentUser.id);

// ✅ Usar níveis apropriados
logger.warn('inventory', 'Estoque crítico', { product: 'X', quantity: 1 });

// ✅ Incluir timestamps nos dados quando relevante
logger.info('sync', 'Sincronização iniciada', {
  startTime: Date.now(),
  itemCount: 100
});
```

### ❌ Evite

```typescript
// ❌ Logs genéricos sem contexto
logger.info('core', 'Algo aconteceu', { value: true });

// ❌ Dados sensíveis
logger.info('auth', 'Login bem-sucedido', {
  password: user.password  // ❌ NUNCA!
});

// ❌ console.log em produção
console.log('Processing order...'); // ❌ Use logger.info()

// ❌ Logs em blocos de try-catch genéricos
try {
  // ...
} catch (e) {
  console.log(e); // ❌ Use logger.error()
}
```

---

## 📋 Scripts Disponíveis

```bash
# Setup inicial dos hooks
npm run setup:hooks

# Executar validação manual
npm run pre-commit

# Auditoria completa
npm run audit

# Verificar arquivos órfãos
npm run audit:orphans

# Lint de TypeScript
npm run lint
```

---

## 🔗 Referências

- [Logger API](./src/core/services/logger.ts)
- [Git Hooks Configuration](./scripts/setup-hooks.mjs)
- [Audit Scripts](./scripts/)

---

**Última atualização:** 24 de abril de 2026  
**Versão do Projeto:** 0.0.0
