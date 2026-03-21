1. Verificar o build local
   Antes de qualquer coisa, confirma que não há erros:

npm run build
Se passar limpo, pode seguir.

2. Zerar o banco (Supabase Dashboard)
   Acesse supabase.com → seu projeto → SQL Editor e execute:

TRUNCATE TABLE tournament_matches CASCADE;
TRUNCATE TABLE game_team_players CASCADE;
TRUNCATE TABLE game_teams CASCADE;
TRUNCATE TABLE game_confirmations CASCADE;
TRUNCATE TABLE player_stat_adjustments CASCADE;
TRUNCATE TABLE games CASCADE;
TRUNCATE TABLE players CASCADE;
TRUNCATE TABLE teams CASCADE;
TRUNCATE TABLE admins CASCADE;
Depois vá em Authentication → Users e apague os usuários manualmente.

3. Push para o GitHub

git add -A
git commit -m "Step 17a: deploy para produção"
git push origin main 4. Criar projeto na Vercel
Acesse vercel.com → Add New Project
Importe o repositório Maximum-Tech-Corp/clube-do-bolinha
Framework: Next.js (detectado automaticamente)
Não clique em Deploy ainda — configure as variáveis primeiro 5. Configurar variáveis de ambiente na Vercel
Adicione exatamente estas variáveis (os mesmos valores do seu .env.local):

Variável Valor
NEXT_PUBLIC_SUPABASE_URL do seu .env.local
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY do seu .env.local
SUPABASE_SERVICE_ROLE_KEY do seu .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY do seu .env.local
STRIPE_SECRET_KEY do seu .env.local
STRIPE_WEBHOOK_SECRET deixe vazio por enquanto — será preenchido no passo 7
STRIPE_PRICE_ID do seu .env.local
NEXT_PUBLIC_APP_URL a URL que a Vercel vai gerar, ex: https://clube-do-bolinha.vercel.app
NEXT_PUBLIC_APP_URL você preenche com a URL final após o primeiro deploy. Se não souber ainda, coloque provisoriamente e depois atualiza.

6. Fazer o deploy
   Clique em Deploy. A Vercel vai buildar e publicar. Aguarde a URL final.

Depois volte nas variáveis e atualize NEXT_PUBLIC_APP_URL com a URL real → Redeploy.

7. Configurar Supabase para aceitar a URL de produção
   No painel do Supabase → Authentication → URL Configuration:

Site URL: https://sua-url.vercel.app
Redirect URLs: adicione https://sua-url.vercel.app/**
Sem isso o login vai redirecionar para localhost.

8. Configurar webhook do Stripe (modo teste)
   Stripe Dashboard → Developers → Webhooks → Add endpoint
   URL: https://sua-url.vercel.app/api/webhooks/stripe
   Eventos a escutar: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed
   Copie o Signing secret gerado
   Cole em Vercel → Environment Variables → STRIPE_WEBHOOK_SECRET
   Faça Redeploy para a variável entrar em vigor
   Lado do código
   Nenhuma implementação necessária. O app está pronto. Só precisa garantir que o build passa no passo 1.

Checklist final
npm run build sem erros
Banco zerado (SQL + usuários Auth)
Push no GitHub
Variáveis configuradas na Vercel
NEXT_PUBLIC_APP_URL atualizado com a URL real
Supabase com a URL de produção em Redirect URLs
Webhook do Stripe apontando para produção com o secret correto
Login funcionando em produção
Jogador consegue acessar via código
PWA instalável no celular
