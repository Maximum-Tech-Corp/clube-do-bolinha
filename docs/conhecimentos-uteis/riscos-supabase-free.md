# Ameaças do plano free do Supabase (pós-Resend)

> Com o Resend configurado como SMTP, o problema de emails está resolvido.
> Este documento mapeia o que ainda pode ser preocupante no free tier — em ordem de ameaça real.
>
> ⚠️ **Verifique os limites atualizados em:** [supabase.com/pricing](https://supabase.com/pricing) — os valores abaixo eram vigentes em meados de 2025 e podem ter mudado.

---

## 1. Pausa por inatividade — o único risco real

Se nenhum usuário acessar o app por **7 dias consecutivos**, o Supabase pausa o projeto. A primeira requisição depois acorda em **5–10 segundos**.

### Por que isso é catastrófico

Um novo admin descobre o Clube do Bolinha, acessa o site pela primeira vez, clica em "Cadastre-se" e... fica olhando para uma tela de carregamento por 5 a 10 segundos. Sem feedback, sem explicação. Para ele parece que o site está quebrado.

Estudos de UX mostram que:

| Tempo de espera | Impacto |
|---|---|
| **3 segundos** | 40% dos usuários abandonam |
| **5 segundos** | A maioria já foi embora ou está desconfiada |
| **10 segundos** | Quem ficou está frustrado e com péssima primeira impressão |

E o pior: isso acontece exatamente no **momento mais crítico** — o cadastro, quando o admin está avaliando se vai assinar ou não.

### Quando isso aconteceria no Clube do Bolinha

- Semana de feriado prolongado
- Período de entressafra (chuvas, férias de julho)
- Nos primeiros meses, quando ainda há poucos usuários
- Qualquer fim de semana em que ninguém jogou

### Resolução: cron-job.org (gratuito, 5 minutos)

1. Cadastre em [cron-job.org](https://cron-job.org)
2. Configure um ping para a URL do app a cada **5 dias**
3. O banco nunca dorme

**Com isso feito, você pode ficar no free indefinidamente até ter clientes reais.**

---

## 2. Tamanho do banco — não é problema

Para o perfil do Clube do Bolinha, o crescimento de dados é muito lento:

| O que gera dado | Estimativa |
|---|---|
| 1 jogo completo (confirmações + times + gols) | ~150 linhas |
| 1 admin ativo por 1 ano (1 jogo/semana) | ~8.000 linhas |
| 100 admins ativos por 1 ano | ~800.000 linhas |

O free tier aguenta facilmente **mais de 1 milhão de linhas** de dados simples. Banco não é preocupação por anos.

---

## 3. Conexões simultâneas — não é problema

O limite do pooler só seria relevante se dezenas de usuários acessassem o app **ao mesmo tempo, no mesmo instante**. Para um SaaS de peladas, esse cenário simplesmente não existe.

---

## Quando pagar o Supabase Pro ($25/mês)

| Gatilho | Por quê | O que fazer |
|---|---|---|
| **Primeiro admin pagante real** | Não pode arriscar o app "dormindo" na frente de um cliente | Pague o Pro — 1 admin já cobre ~30–40% do custo |
| **2 admins pagantes** | O Pro está pago com folga | Mantenha o Pro |
| **Banco chegando em 400 MB** | Margem de segurança antes do limite | Pro tem 8 GB |

> Com o Clube do Bolinha custando algo como R$ 20–40/mês para o admin, **2 assinantes já cobrem o Pro inteiro**. A partir do segundo cliente, não faz mais sentido ficar no free.

---

## Linha do tempo realista

```
Agora
 ├─ Configurar Resend (SMTP)      → resolve emails
 ├─ Configurar cron-job.org       → resolve pausa por inatividade
 └─ Lançar em produção            ✅ free tier seguro

Primeiro admin pagante
 └─ Migrar para Supabase Pro      → paz de espírito, SLA, sem risco de pausa

+10 admins pagantes
 └─ Avaliar Vercel Pro            → mais funções, mais banda
```

---

## Resumo

**Resend + cron-job.org = free tier seguro para lançar e crescer.**
Pague o Pro quando o primeiro cliente real assinar.
