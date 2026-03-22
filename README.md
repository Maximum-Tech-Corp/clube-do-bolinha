# Clube do Bolinha

PWA para organização de peladas semanais — sorteio de times, controle de presença, placares e rankings.

## Stack

| Camada         | Tecnologia                 |
| -------------- | -------------------------- |
| Frontend / PWA | Next.js 16 (App Router)    |
| UI             | shadcn/ui + Tailwind CSS   |
| Auth + Banco   | Supabase (PostgreSQL)      |
| Pagamento      | Stripe (assinatura mensal) |
| Deploy         | Vercel                     |

---

## Pré-requisitos

- Node.js 18+
- npm
- Conta no [Supabase](https://supabase.com)
- Conta no [Stripe](https://stripe.com)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) instalado

---

## Configuração do ambiente

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.local.example .env.local
```

Edite o `.env.local` com as chaves de cada serviço (veja as seções abaixo).

---

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Durante a criação, certifique-se de que **Enable Data API** está ativado
3. Após criar, acesse **Settings → API** e copie:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (Publishable key)
   - `SUPABASE_SERVICE_ROLE_KEY` (Secret key)

4. Execute o schema do banco de dados:
   - No dashboard do Supabase, acesse **SQL Editor**
   - Cole e execute o conteúdo de `supabase/migrations/001_initial_schema.sql`

5. Desabilite confirmação de e-mail (para desenvolvimento):
   - **Authentication → Providers → Email → desabilite "Confirm email"**

---

## Configuração do Stripe

1. Crie uma conta em [stripe.com](https://stripe.com)
2. Use o **modo de teste** (área restrita) durante o desenvolvimento
3. Crie um produto com assinatura mensal:
   - **Products → Add product**
   - Tipo: Recorrente (Recurring) / Mensal
   - Copie o **Price ID** (`price_...`)
4. Acesse **Developers → API keys** e copie:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Publishable key)
   - `STRIPE_SECRET_KEY` (Secret key)

### Cartão de teste do Stripe:

```bash
Número: 4242 4242 4242 4242
Validade: qualquer data futura
CVC: qualquer 3 dígitos
```

### Instalando o Stripe CLI (Ubuntu)

```bash
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public \
  | gpg --dearmor \
  | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null

echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] \
  https://packages.stripe.dev/stripe-cli-debian-local stable main" \
  | sudo tee /etc/apt/sources.list.d/stripe.list

sudo apt update && sudo apt install stripe -y
```

### Autenticando o Stripe CLI

```bash
stripe login
```

---

## Rodando em desenvolvimento

O ambiente de desenvolvimento requer **dois terminais** rodando simultaneamente.

### Terminal 1 — servidor Next.js

```bash
npm run dev
```

### Terminal 2 — Stripe CLI (webhook listener)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

> O listener exibe o `STRIPE_WEBHOOK_SECRET` no formato `whsec_...` ao iniciar.
> Copie esse valor para o `.env.local`. **Mantenha este terminal aberto** durante
> todo o desenvolvimento — sem ele, os eventos de pagamento do Stripe não chegam
> ao servidor local e a ativação da assinatura não funciona.

Acesse [http://localhost:3000](http://localhost:3000).

---

## Variáveis de ambiente — referência completa

| Variável                                       | Descrição                                              |
| ---------------------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`                     | URL do projeto Supabase                                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Chave pública do Supabase                              |
| `SUPABASE_SERVICE_ROLE_KEY`                    | Chave secreta do Supabase (nunca expor no client)      |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`           | Chave pública do Stripe                                |
| `STRIPE_SECRET_KEY`                            | Chave secreta do Stripe (nunca expor no client)        |
| `STRIPE_WEBHOOK_SECRET`                        | Secret do webhook (`whsec_...` gerado pelo Stripe CLI) |
| `STRIPE_PRICE_ID`                              | ID do preço da assinatura mensal (`price_...`)         |
| `NEXT_PUBLIC_APP_URL`                          | URL base da aplicação (ex: `http://localhost:3000`)    |

---

## Estrutura do projeto

```
src/
├── app/                  # Rotas (App Router)
│   ├── (auth)/           # Páginas de login e cadastro
│   ├── api/webhooks/     # Route handlers (webhook Stripe)
│   ├── dashboard/        # Área autenticada do admin
│   └── pagamento-pendente/
├── actions/              # Server Actions por domínio
├── components/           # Componentes React reutilizáveis
│   └── ui/               # Componentes shadcn/ui
├── lib/                  # Utilitários e clientes externos
│   └── supabase/         # Clientes server e browser
└── types/                # Tipos TypeScript globais
supabase/
└── migrations/           # Scripts SQL do banco de dados
```

---

## Testes

```bash
npm test                 # modo watch (desenvolvimento)
npm run test:run         # execução única (CI)
npm run test:coverage    # relatório de cobertura
```

O relatório de cobertura em HTML fica em `coverage/index.html` após rodar `test:coverage`.

---

## Deploy (produção)

1. Conecte o repositório à [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente na Vercel (mesmas do `.env.local`, com valores de produção)
3. Troque as chaves Stripe de teste (`pk_test_` / `sk_test_`) pelas de produção (`pk_live_` / `sk_live_`)
4. Configure o webhook no dashboard do Stripe apontando para `https://seu-dominio.com/api/webhooks/stripe`
5. Atualize `NEXT_PUBLIC_APP_URL` com a URL de produção
