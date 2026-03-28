# Padrão de Layout — Clube do Bolinha

Design system e guia de padrões visuais adotados no app. Consulte este documento ao criar ou padronizar telas.

---

## Paleta de Cores

| Token / Uso | Valor | Onde usar |
|---|---|---|
| Amarelo (header) | `#fed015` | **Exclusivo** para o fundo do cabeçalho de todas as telas |
| Azul escuro | `#002776` | Textos sobre fundo amarelo; pequenos detalhes de destaque |
| Verde (primary) | Tailwind `primary` (shadcn) | Botões primários, bordas/texto de botões outline, ícones de destaque |
| Verde claro | `bg-primary/5`, `bg-primary/10` | Background de cards, hover states, seções de destaque suave |
| Azul claro | `bg-blue-50 border-blue-200 text-blue-800` | Caixas de aviso/informação (info notice) |
| Cinza (background) | `bg-background`, `bg-muted`, `bg-muted/40` | Background predominante em todas as páginas e seções |
| Texto auxiliar | `text-muted-foreground` | Subtítulos, descrições, textos secundários |
| Preto / foreground | `text-foreground` | Labels de inputs, títulos de formulários |
| Vermelho (erro) | `text-destructive` | Mensagens de erro de validação e servidor |

> **Regra do amarelo:** por ser uma cor forte, o amarelo é restrito ao cabeçalho. Não usar em outros elementos.

---

## Estrutura de Tela (Page Layout)

Toda tela segue esta estrutura vertical:

```
┌──────────────────────────────────────┐
│  HEADER AMARELO (#fed015)            │
│  pt-12 pb-10 px-8                    │
│  • AppLogo size="md" centralizada    │
│  • Texto opcional: text-sm font-bold │
│    color #002776 (NÃO branco)        │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  CONTEÚDO                            │
│  flex-1 max-w-sm mx-auto px-6 pt-8   │
│  • Formulários sem Card wrapper      │
│  • Cards de listagem / seções        │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  FOOTER CARD (navegação de volta)    │
│  max-w-sm mx-auto p-4 mt-1           │
│  • Card bg-primary/5 ring-0          │
│  • Ícone ArrowLeft em bg-muted       │
│  • Título + subtítulo descritivo     │
└──────────────────────────────────────┘
```

### Header amarelo — código de referência

```tsx
<div
  className="w-full flex flex-col items-center pt-12 pb-10 px-8"
  style={{ backgroundColor: '#fed015' }}
>
  <AppLogo size="md" />
  {/* Texto opcional abaixo da logo */}
  <p className="text-sm mt-4 font-bold" style={{ color: '#002776' }}>
    Texto descritivo da tela
  </p>
</div>
```

### Footer card — código de referência

```tsx
<div className="w-full max-w-sm mx-auto p-4 mt-1">
  <Link href="/destino">
    <Card className="cursor-pointer bg-primary/5 transition-colors ring-0">
      <CardContent className="flex items-center gap-4 py-1">
        <div className="bg-muted rounded-md p-3 shrink-0">
          <ArrowLeft className="w-5 h-5 text-primary" strokeWidth={3} />
        </div>
        <div>
          <p className="font-semibold text-sm">Título da ação</p>
          <p className="text-xs text-muted-foreground">Subtítulo descritivo</p>
        </div>
      </CardContent>
    </Card>
  </Link>
</div>
```

---

## Formulários

- **Sem Card wrapper** — form solto na área de conteúdo
- Estrutura interna com `className="space-y-4"`

### Inputs

```tsx
<Input className="h-auto py-2 border-gray-300" />
```

### Botão primário (ação principal)

```tsx
<Button type="submit" className="w-full py-5">
  Texto da ação
</Button>
```

### Botão outline (ação secundária)

```tsx
<Button
  variant="outline"
  className="w-full py-5 border-primary text-primary hover:bg-primary/5 hover:text-primary"
>
  Texto da ação
</Button>
```

> Regra: todos os botões de formulário usam `py-5` para altura consistente. Nunca usar `h-10` ou altura default nesses contextos.

---

## Caixa de Aviso / Informação (Info Notice)

Usada para mensagens informativas ou alertas leves. **Não usar amarelo aqui** — usar azul claro.

```tsx
<div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
  <span className="text-blue-400 text-base font-bold leading-none mt-0.5">
    i
  </span>
  <p className="text-xs text-blue-800">
    Texto informativo com <span className="font-semibold">destaque</span> se necessário.
  </p>
</div>
```

---

## Cards de Listagem (List Row Cards)

Usados na landing page para seleção de tipo de acesso e similares.

```tsx
<div className="flex items-center gap-4 bg-primary/5 rounded-xl px-4 py-6 hover:bg-primary/10 transition-colors cursor-pointer">
  <IconeRelevante className="w-6 h-6 text-primary shrink-0" strokeWidth={2.5} />
  <div className="flex-1 min-w-0">
    <p className="font-semibold text-sm">Título</p>
    <p className="text-xs text-muted-foreground mt-0.5">Descrição</p>
  </div>
  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
</div>
```

---

## Navegação Inferior (Bottom Nav — área do admin)

- Fixo no rodapé: `fixed bottom-0 left-0 right-0`
- Background: `bg-background/95 backdrop-blur`
- Labels: `text-xs font-medium`
- Item ativo: `text-primary` com `stroke-[2.5px]` no ícone
- Item inativo: `text-muted-foreground hover:text-foreground`

---

## Telas existentes com padrão aplicado

| Rota | Header amarelo | Texto sob logo | Footer card |
|---|---|---|---|
| `/` | ✅ | "Organize o futebol da sua turma" | ✗ (fixed footer MaxTech) |
| `/login` | ✅ | "Acesso do organizador da turma" | ✅ → `/` |
| `/cadastro` | ✅ | ✗ | ✅ → `/login` |
| `/esqueci-senha` | ✅ | ✗ | ✅ → `/login` |
| `/jogador` | ✅ | "Acesse com o código da sua turma" | ✅ → `/` |
| `/dashboard` | ✅ | Nome da turma + saudação (dinâmico, cor `#002776`) | ✗ (usa bottom nav) |
