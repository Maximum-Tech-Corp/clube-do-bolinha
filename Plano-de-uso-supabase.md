Supabase Free Plan — Limites conhecidos
Recurso Free
Database (Postgres) 500 MB de storage
Auth (MAU) 50.000 usuários ativos/mês
Storage de arquivos 1 GB
Bandwidth 5 GB/mês
Edge Functions 500.000 invocações/mês
Projetos ativos 2 projetos
⚠️ Pausa por inatividade Projeto congela após 7 dias sem acesso
O último ponto é o mais crítico — durante os testes E2E você não vai ter esse problema porque estará usando o projeto ativamente. Mas em produção real, o congelamento é inaceitável.

Planos pagos (referência)
Free Pro Team
Preço $0 ~$25/mês ~$599/mês
Database 500 MB 8 GB 8 GB
Auth MAU 50k 100k 100k
Bandwidth 5 GB 250 GB 250 GB
Pausa por inatividade ✅ Sim ❌ Não ❌ Não
SLA Nenhum 99,9% 99,95%
Backups automáticos ❌ ✅ Diário ✅
Support Community Email Dedicado
Para o seu caso específico
Perfil de uso:

10 admins (autenticam com e-mail/senha)
~40 jogadores por admin = ~400 jogadores no total
Jogadores não fazem login — só usam o service role via cookie
Uso básico: confirmar presença, ver times, ver jogos
Análise por recurso:

Auth MAU: Os únicos usuários autenticados são os 10 admins. 10 de 50.000 — irrelevante. Nunca vai ser o gargalo.

Database: Vamos estimar:

10 times × 40 jogadores = 400 rows em players
~4 jogos/mês por time × 10 times = 40 jogos/mês → ~2.000 confirmações/mês acumuladas
Histórico, stats, times sorteados — tudo muito leve
Estimativa realista: menos de 50 MB no horizonte de 1 ano. Longe dos 500 MB.
Bandwidth: Com 400 jogadores fazendo uso básico (~10 requests/sessão, cada response ~10KB), são ~40 MB de tráfego por sessão coletiva. Caberia folgado em 5 GB/mês.

Minha recomendação direta
Agora (testes E2E): Free plan está ótimo. Você vai usar o projeto regularmente, então sem risco de pausa.

Quando for para produção (Step 17a): Mude para o Pro ($25/mês). O motivo não é recurso — é a pausa por inatividade. Um app em produção com usuários reais não pode congelar. Além disso, você ganha backup diário automático, que é essencial em produção.

O custo de $25/mês de Supabase + Vercel Hobby (gratuito ou ~$20/mês) vai ser sua infraestrutura base. Com 10 admins pagando mensalidade, você precisa de no mínimo R$ 30-40/usuário/mês só para cobrir infra (considerando câmbio e impostos), mais a sua margem de lucro.

Antes de definir o preço final, monitore o consumo real no primeiro mês de produção com usuários reais — os números concretos vão te dar muito mais segurança para precificar.
