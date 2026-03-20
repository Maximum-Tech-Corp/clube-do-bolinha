@AGENTS.md

# Diretrizes de Desenvolvimento — Clube do Bolinha

## Testes
- Não criar testes unitários

## Código
- Seguir boas práticas de programação e clean code
- Priorizar performance (evitar re-renders desnecessários, queries N+1, etc.)
- Comentar apenas métodos/funções com lógica complexa (algoritmos, regras de negócio não óbvias)
- Código autoexplicativo: nomes claros dispensam comentários óbvios

## TypeScript
- Sempre tipado — sem `any`
- Usar types do Supabase definidos em `src/types/database.types.ts`

## Next.js
- Preferir Server Components e Server Actions
- Client Components apenas quando necessário (interatividade, estado local)
- Nunca expor chaves secretas no client
- Arquivo de proxy em `src/proxy.ts` (Next.js 16 — não usar `middleware.ts`)

## UI
- Usar shadcn/ui como base de componentes
- Design mobile-first
