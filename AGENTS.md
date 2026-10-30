# radiologic-viewers, instruções para agentes

## Sobre

Site `challenge.radiologic.io`: showcase permanente e bilíngue (PT e EN) de DICOM viewers submetidos pelo público, posicionado como desafio de criatividade da marca Radiologic. Ranking ao vivo por voto popular, destaques mensais, sem prêmio. A arquitetura aprovada está em `docs/architecture.md`. Leia antes de implementar qualquer tarefa.

Repos relacionados:

- `eduardocaminha/dicom-viewer-challenge` (público): Issue Form de submissão, regulamento, kit de dados e workflow de intake.
- `eduardocaminha/radiologic-site` (privado): site de marca, origem da identidade visual (tokens, logo, padrões). A fonte é diferente da do site de marca.

## Stack

- Next.js 16 (App Router), TypeScript strict, ESM, pnpm.
- Código sob AGPL-3.0 (`LICENSE`), por causa do COSS UI. O rodapé do site aponta para o código-fonte público.
- Tailwind v4 CSS-first em `app/globals.css`. Não criar `tailwind.config.*`.
- Supabase: Auth (Google e GitHub), Postgres, Storage. CLI fixada como devDependency.
- Zod para validação, Vitest para unidade, Playwright para e2e, pgTAP para o banco.
- Deploy na Vercel.

## Comandos

```bash
pnpm verify      # lint + typecheck + unit + build (gate do projeto)
pnpm db:test     # Supabase local em Docker, db reset, pgTAP
pnpm test:e2e    # Playwright contra o Supabase local
```

Toda mudança vai por branch e PR para `main`. Antes do PR, rode `pnpm verify`. Se a mudança toca o banco, rode também `pnpm db:test`. Se toca tela, rode `pnpm test:e2e` das suítes afetadas e confira a tela em celular e desktop. O merge em `main` publica em produção pela Vercel.

Todo comando de verificação precisa ser hermético: sem segredo, sem OAuth real, sem Vercel, sem Resend, sem rede externa. O ambiente local do Supabase vem de `supabase status -o json`.

## Invariantes de segurança

- Tabelas com RLS ligado e `revoke all` de `anon` e `authenticated`. Nenhuma escrita direta pelo cliente.
- Toda escrita passa por função `security definer` com `search_path = ''`. A função carrega a regra (um voto por conta, transições de estado, limites). A server action só valida com Zod e chama a função.
- Autorização nunca lê `user_metadata` nem e-mail. Admin é linha na tabela `admins`.
- Chaves do Supabase: só `publishable` e `secret`. A `secret` fica em módulo com `server-only`.
- Toda migration traz `grant` explícito do que precisa ser exposto.
- Voto só por POST autenticado. Nunca por GET. Redirect pós-login só para caminho relativo validado.
- Páginas públicas não leem cookies e ficam cacheadas (`revalidate = 60`). `cacheComponents` desligado. O `proxy.ts` cobre só a raiz, `/(pt|en)/(submit|me)` e `/admin`.
- Sem fetch server-side de URL fornecida por usuário.
- Header `Content-Security-Policy: frame-ancestors 'none'`.

## Convenções de escrita

Valem para copy, dicionários, docs, comentários e commits.

- Sem emoji.
- Sem travessão. Usar vírgula, parênteses ou nova frase.
- Não usar a palavra "hype".
- Falar "grupo de discussão" ou "grupo", nunca "comunidade".
- Todo texto de interface existe em `pt` e `en`, com paridade de chaves testada.

## Identidade visual

- Fonte única Inter 4.1 (SIL OFL 1.1, licença em `assets/fonts/OFL.txt`). Variável em `public/fonts/InterVariable.woff2` (wght 100 a 900, opsz automático) para o site. TTF estático em `assets/fonts/` para a imagem Open Graph, em subconjunto latino para caber no limite de 500 KB. Sem fonte mono. A Saans do `radiologic-site` não entra neste repo.
- `font-feature-settings` só com `calt`. Os conjuntos `ss01` e `ss07` da referência eram da Saans e ativam outras formas na Inter.
- Tokens OKLCH herdados. Cor nova só em `oklch()`. Primary é monocromático. O verde (`--success`) fica reservado a estado de sucesso. `--accent` é o fundo neutro de hover dos componentes, não cor.
- Componentes do COSS UI em `components/ui/`, instalados pelo registry `@coss` de `components.json` (`pnpm dlx shadcn add @coss/<nome>`), sobre `@base-ui/react`. O tema do COSS é mapeado à mão nos tokens de `app/globals.css`; não aplicar `@coss/style`. Controle novo usa o componente COSS, nunca Tailwind escrito à mão. Instalar só o que for usado.
- Forma por papel (`app/globals.css`): controle (botão, toggle, aba, Select, campo de uma linha, destaque de hover) em `rounded-full`; campo de várias linhas e popup em `rounded-lg` (12px); superfície (card, diálogo, estado vazio) em `rounded-2xl` (20px); imagem dentro de card em `rounded-lg`, porque raio interno = raio externo menos o respiro.
- Tamanho de controle por contexto, na escala do COSS (altura mobile / desktop): `lg` 40/36 para a ação principal da página ou de um estado (hero, demo e voto, enviar o formulário, login, estado vazio); `default` 36/32 para ação dentro de formulário ou diálogo, na altura dos campos; `sm` e `icon-sm` 32/28 para navegação e ação de linha (header, voltar, editar, excluir, copiar, filtros da barra). Link que se comporta como botão usa `Button` com `render`.
- Tipografia por papel, nos tokens `text-display-{lg,md,sm}`, `text-headline-{lg,md}`, `text-title-{lg,md,sm}`, `text-body-lg` e `text-label-md`, que já trazem peso, tracking e entrelinha. Display só na headline da home e no nome do viewer; headline no h1 das demais páginas; title nos h2 e h3; label em rótulo de interface. Título em 600, rótulo em 500, texto corrido em 400. Não escrever tamanho, peso ou tracking soltos em título.
- `@shadcn/lint` no ESLint para `app/` e `components/*.tsx`: sem cor bruta, sem valor arbitrário, sem classe desconhecida, sem estilo inline (valor dinâmico vai por custom property). Valor que falta vira token no tema.
- Sem eyebrow acima de título, sem subtítulo descritivo abaixo de título, sem travessão na copy.
- Motion sutil com `motion` e os padrões do Fluid Functionalism: durações só pelos tiers de `lib/springs.ts` (`fast`, `moderate`, `slow`, com `.exit` na saída), destaque de hover que desliza com `useFluidHover` + `FluidHoverHighlight`, `layout` para reposicionar. Entrada e pressão em CSS (`reveal-item`, `scale-[0.97]` no `:active`), curva `--ease-out-strong`. Toda árvore com motion fica em `MotionConfig reducedMotion="user"`. Nada anima em ação de teclado repetida.
- Estado precisa ser legível de relance. Evitar painel de indicadores sem ação, etiquetas em excesso por linha, card para tudo e subtítulo que narra a tela.

## O que não fazer

- Não adicionar biblioteca de i18n, ORM, Redis, BotID, SDK do Resend ou `issue-ops/parser`.
- Não redigir texto legal. O regulamento e a política de privacidade vêm de `docs/drafts/`, revisados pelo dono.
- Não listar produtos comerciais de mercado. Só viewers submetidos pelo público.
- Não usar `--no-verify` nem force push.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
