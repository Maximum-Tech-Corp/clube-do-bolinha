# Plano: Notificações Push (PWA)

**Objetivo:** Enviar notificações de celular para jogadores quando eventos relevantes ocorrerem (nova lista aberta, sorteio realizado, torneio atualizado).

**Estratégia:** Web Push API com VAPID próprio + `web-push` (Node.js lib). Sem serviços pagos, sem Firebase, zero custo de infra.

**Compatibilidade:**
- Android: Chrome, Firefox, Edge — funciona sem restrições
- iOS: Safari 16.4+ **apenas se o app estiver salvo na tela inicial (Add to Home Screen)**

---

## Visão geral do fluxo

```
Jogador abre o PWA
  → aceita permissão de notificação
  → navegador gera PushSubscription (endpoint + keys)
  → app salva essa subscription no banco (tabela player_push_subscriptions)

Admin realiza ação (ex: abre lista, faz sorteio)
  → Server Action dispara sendPushNotification()
  → web-push envia para todos os endpoints cadastrados daquele time
  → navegador do jogador exibe a notificação
```

---

## Pré-requisitos de leitura

Antes de começar: ler `node_modules/next/dist/docs/` conforme indicado em `AGENTS.md` para verificar como Service Workers são registrados nesta versão do Next.js.

---

## FASE 1 — Configuração de infra (sem código ainda)

### 1.1 Gerar par de chaves VAPID

VAPID (Voluntary Application Server Identification) é o mecanismo de autenticação do Web Push. Precisa de um par de chaves pública/privada gerado uma única vez.

**Passos:**

1. No terminal local do projeto:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. O comando retorna:
   ```
   Public Key: BA...
   Private Key: xx...
   ```
3. Guardar esses valores — **a chave privada nunca vai para o frontend**.

### 1.2 Adicionar variáveis de ambiente

**No arquivo `.env.local`** (desenvolvimento):
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BAxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:suporte@seudominio.com.br
```

**No painel do Vercel** (produção):
1. Acessar: vercel.com → projeto `clube-do-bolinha` → Settings → Environment Variables
2. Adicionar as três variáveis acima com os mesmos valores
3. Marcar ambiente: Production + Preview
4. Após salvar → **Redeploy obrigatório** (conforme nota no CLAUDE.md)

---

## FASE 2 — Banco de dados

### 2.1 Criar tabela `player_push_subscriptions`

Cada jogador pode ter múltiplos dispositivos (celular + tablet). A subscription é por dispositivo, não por jogador.

**Migration SQL** (aplicar via Supabase SQL Editor):

```sql
create table player_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  -- evita duplicatas do mesmo dispositivo
  unique(endpoint)
);

-- índices para busca por time (envio em lote)
create index on player_push_subscriptions(team_id);
create index on player_push_subscriptions(player_id);
```

**No Supabase SQL Editor:**
1. Acessar: supabase.com → projeto → SQL Editor → New query
2. Colar o SQL acima
3. Clicar em Run

### 2.2 Atualizar `src/types/database.types.ts`

Após criar a tabela, adicionar manualmente o tipo (conforme regra do CLAUDE.md):

```typescript
player_push_subscriptions: {
  Row: {
    id: string
    player_id: string
    team_id: string
    endpoint: string
    p256dh: string
    auth: string
    created_at: string
  }
  Insert: {
    id?: string
    player_id: string
    team_id: string
    endpoint: string
    p256dh: string
    auth: string
    created_at?: string
  }
  Update: {
    id?: string
    player_id?: string
    team_id?: string
    endpoint?: string
    p256dh?: string
    auth?: string
    created_at?: string
  }
}
```

---

## FASE 3 — Service Worker

O Service Worker é o que recebe as notificações mesmo com o navegador fechado. Deve ficar em `public/sw.js` para ser servido na raiz do domínio.

### 3.1 Criar `public/sw.js`

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'Clube do Bolinha'
  const options = {
    body: data.body ?? '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: { url: data.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(clients.openWindow(url))
})
```

**Nota sobre ícones:** Os caminhos `/icons/icon-192x192.png` e `/icons/icon-72x72.png` devem existir em `public/icons/`. Verificar se já existem (o PWA pode já tê-los); se não, adicionar imagens do logo do app nessas dimensões.

### 3.2 Registrar o Service Worker

Criar `src/components/push-notification-setup.tsx` (Client Component):

```typescript
'use client'

import { useEffect } from 'react'
import { savePushSubscription } from '@/actions/push-notifications'

interface Props {
  playerId: string
  teamId: string
}

export function PushNotificationSetup({ playerId, teamId }: Props) {
  useEffect(() => {
    async function register() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

      const registration = await navigator.serviceWorker.register('/sw.js')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await savePushSubscription({
        playerId,
        teamId,
        subscription: subscription.toJSON() as PushSubscriptionJSON,
      })
    }

    register()
  }, [playerId, teamId])

  return null
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
```

---

## FASE 4 — Server Actions

### 4.1 Instalar `web-push`

```bash
npm install web-push
npm install --save-dev @types/web-push
```

### 4.2 Criar `src/actions/push-notifications.ts`

```typescript
'use server'

import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

// Called from PushNotificationSetup component to save subscription
export async function savePushSubscription({
  playerId,
  teamId,
  subscription,
}: {
  playerId: string
  teamId: string
  subscription: PushSubscriptionJSON
}) {
  const supabase = createServiceClient()
  await supabase.from('player_push_subscriptions').upsert(
    {
      player_id: playerId,
      team_id: teamId,
      endpoint: subscription.endpoint!,
      p256dh: (subscription.keys as Record<string, string>).p256dh,
      auth: (subscription.keys as Record<string, string>).auth,
    },
    { onConflict: 'endpoint' },
  )
}

// Called from other Server Actions to notify all players of a team
export async function sendPushToTeam({
  teamId,
  title,
  body,
  url,
}: {
  teamId: string
  title: string
  body: string
  url: string
}) {
  const supabase = createServiceClient()
  const { data: subscriptions } = await supabase
    .from('player_push_subscriptions')
    .select('*')
    .eq('team_id', teamId)

  if (!subscriptions?.length) return

  const payload = JSON.stringify({ title, body, url })

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      } catch (err: unknown) {
        // Subscription expired or invalid — remove it
        if (err instanceof webpush.WebPushError && err.statusCode === 410) {
          await supabase
            .from('player_push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        }
      }
    }),
  )
}
```

---

## FASE 5 — Integrar nos eventos relevantes

Para cada evento, localizar a Server Action correspondente e adicionar a chamada a `sendPushToTeam`.

### 5.1 Lista aberta (confirmações abertas para jogadores)

- **Arquivo:** `src/actions/games.ts` (ou similar — localizar a action que cria/abre um jogo)
- **Após** a inserção/update do jogo, adicionar:
  ```typescript
  await sendPushToTeam({
    teamId,
    title: 'Lista aberta!',
    body: 'Confirme sua presença no próximo jogo.',
    url: `/jogador/${accessCode}/lista/${gameId}`,
  })
  ```

### 5.2 Sorteio realizado

- **Arquivo:** action que executa o sorteio (provavelmente em `src/actions/games.ts` ou `src/actions/draw.ts`)
- Adicionar após o draw ser salvo:
  ```typescript
  await sendPushToTeam({
    teamId,
    title: 'Times sorteados!',
    body: 'Veja em qual time você ficou.',
    url: `/jogador/${accessCode}/times/${gameId}`,
  })
  ```

### 5.3 (Opcional) Placar atualizado em torneio

- **Arquivo:** action que registra gol/assistência
- Avaliar se o volume de notificações seria excessivo (a cada gol). Pode ser limitado a "fase encerrada" em vez de a cada gol.

---

## FASE 6 — Expor o componente nas telas dos jogadores

O `PushNotificationSetup` deve ser montado em todas as telas onde o jogador já está identificado (tem `player_id` e `team_id` disponíveis).

**Candidatos:**
- `src/app/jogador/[code]/lista/[gameId]/page.tsx`
- `src/app/jogador/[code]/times/[gameId]/page.tsx`
- Ou em um layout compartilhado `src/app/jogador/[code]/layout.tsx` (mais eficiente — roda uma única vez)

**Exemplo de uso no layout:**
```tsx
import { PushNotificationSetup } from '@/components/push-notification-setup'

// ... dentro do JSX, após resolver playerId e teamId do cookie:
<PushNotificationSetup playerId={playerId} teamId={teamId} />
```

**Importante:** O pedido de permissão de notificação só pode ser feito em resposta a um gesto do usuário em alguns contextos. Testar se o `useEffect` é suficiente ou se é necessário um botão "Ativar notificações".

---

## FASE 7 — Testes

### 7.1 Teste local

1. Rodar `npm run dev`
2. Acessar o app via `http://localhost:3000`
3. Navegar até uma tela de jogador
4. Verificar no DevTools → Application → Service Workers se `sw.js` está registrado
5. Verificar Application → Push Messaging
6. Testar manualmente via DevTools: Application → Service Workers → Push (inserir JSON de teste)

### 7.2 Teste de envio end-to-end

1. Em uma Server Action de teste (ou via Supabase Edge Function temporária), chamar `sendPushToTeam` manualmente
2. Verificar se a notificação aparece no dispositivo
3. Verificar se o clique na notificação abre a URL correta

### 7.3 Teste iOS

1. Acessar o app no Safari (iOS 16.4+)
2. Adicionar à tela inicial via "Compartilhar → Adicionar à Tela de Início"
3. Abrir o app **pela tela inicial** (não pelo Safari)
4. Aceitar a permissão de notificação
5. Testar recebimento

---

## FASE 8 — Hardening e edge cases

- **Subscription expirada:** já tratada no `sendPushToTeam` com remoção automática (status 410)
- **Jogador sem subscription:** `Promise.allSettled` garante que erros isolados não bloqueiam outros envios
- **Jogador usa múltiplos dispositivos:** múltiplas rows com o mesmo `player_id` — todos recebem
- **Rate limiting:** Web Push não tem rate limit relevante para o volume esperado deste app
- **GDPR/LGPD:** exibir texto informativo antes de pedir permissão ("Usaremos para avisar sobre jogos")

---

## Resumo de custo

| Item | Custo |
|---|---|
| Web Push API (VAPID) | Gratuito |
| `web-push` npm package | Gratuito |
| Supabase (nova tabela) | Gratuito no plano Free |
| Vercel (execução da Server Action) | Gratuito no Hobby plan |
| **Total** | **R$ 0** |

---

## Ordem recomendada de execução

1. Fase 1 (VAPID keys + env vars)
2. Fase 2 (banco + tipos)
3. Fase 4.1 (instalar web-push)
4. Fase 3 (Service Worker)
5. Fase 4.2 (Server Actions)
6. Fase 6 (componente no layout do jogador)
7. Fase 7 (testes locais)
8. Fase 5 (integrar nos eventos)
9. Fase 7 novamente (teste end-to-end)
10. Fase 8 (revisão de edge cases)
