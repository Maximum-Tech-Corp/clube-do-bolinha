Vercel Hobby — o que você tem e os riscos reais
O que o plano Hobby inclui (e você já usa)
Preview deployments — cada PR ganha uma URL única de staging automaticamente. Você já viu isso.
Domínio customizado — sem custo.
Analytics básico — métricas de visitas, Web Vitals, por página. Acessível no dashboard.
Logs em tempo real — você consegue ver logs das Server Actions em produção.
Builds ilimitados — sem limite de número de deploys. Mas só 1 build por vez (sem paralelismo).
Bandwidth: 100 GB/mês — absurdamente generoso para o perfil do app.
Os limites que importam
Limite Hobby Risco para o Clube do Bolinha
Timeout de funções 10 segundos ⚠️ O principal risco — ver abaixo
Bandwidth 100 GB/mês Nenhum — o app é leve
Builds simultâneos 1 Irrelevante para time pequeno
Membros da equipe 1 Risco se um segundo dev entrar
SLA Nenhum Risco quando tiver clientes pagantes
Regiões de Edge Limitadas Irrelevante no Brasil
O risco real: timeout de 10 segundos
Server Actions no Hobby têm 10 segundos de timeout. Para as operações atuais do app (sorteio, confirmações, salvar gol) isso é confortável — cada uma termina em menos de 1s.

O timeout vira problema se algum dia adicionarmos operações em batch: notificar 30+ jogadores por WhatsApp após o sorteio, gerar relatório de temporada, etc. Esse tipo de operação seria melhor delegado ao Supabase Edge Functions (timeout de 150s) de qualquer forma.

Conclusão sobre timeout: não é risco hoje, mas monitore se adicionar operações pesadas.

Sem SLA
No Hobby, a Vercel não garante uptime contratualmente. Na prática a Vercel tem histórico excelente de disponibilidade, mas sem SLA você não tem nada para acionar se o app cair. Para um app em fase de aquisição de clientes isso é aceitável. Quando tiver admins pagando mensalidade e dependendo do app para organizar o jogo toda semana, a percepção muda.

A partir de quantos assinantes você deve se preocupar?
Diferente do Supabase, a Vercel Hobby não tem um limite técnico que você vai atingir cedo. O gatilho para pagar não é consumo — é responsabilidade.

Momento O que acontece O que fazer
0–1 assinantes Zero risco, zero custo Hobby está ótimo
Primeiro assinante pagante O admin está dependendo do app; sem SLA é desconfortável Ainda OK — monitore
~5 assinantes O app tem valor real para pessoas reais Considere Vercel Pro ($20/mês)
Segundo dev no time	Hobby só permite 1 membro	Obrigado a migrar para Pro
Operação batch necessária	Timeout de 10s pode ser atingido	Migrar ou usar Supabase Edge Functions
O Vercel Pro custa $20/mês. Com 5 admins pagando R$ 30/mês cada (R$ 150/mês), cobrir R$ 100–120 de infra (Supabase Pro + Vercel Pro) é confortável. Esse é o horizonte natural.
