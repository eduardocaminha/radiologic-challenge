# Arquitetura de challenge.radiologic.io

Aprovada pelo dono em 2026-10-03. Mudança de decisão passa por ele.

## Decisões de produto

- **D1 Formato:** showcase permanente, sem prazo e sem prêmio. Só projetos submetidos pelo público. Escopo ampliado em 2026-10-30 para a workstation de laudo: `workflow_parts` guarda as partes (viewer, worklist, ai, agent, report), com ao menos uma exigida no envio. A demo pública não chama LLM ao vivo.
- **D2 Julgamento:** só voto popular. Login Google ou GitHub, um voto por conta por viewer. Voto próprio é permitido.
- **D3 Destaques:** top 3 do mês. O mês fecha à meia-noite de `America/Sao_Paulo`. Resultado gravado em snapshot imutável.
- **D4 Submissão:** formulário no site e Issue Form no GitHub, na mesma fila de moderação.
- **D5 Open source obrigatório:** repo público com licença open source declarada em SPDX.
- **D6 Moderação:** pré-moderação na primeira publicação e em cada imagem.
- **D7 Exclusão de conta:** apaga os votos e as submissões do usuário. O nome do viewer em destaques de meses fechados permanece.

## Rotas

| Rota | Conteúdo | Cache |
|---|---|---|
| `/` | Redireciona para `/pt` ou `/en` por `Accept-Language`, fallback `pt` | proxy |
| `/[locale]` | Abertura curta e galeria com ranking | `revalidate = 60` |
| `/[locale]/v/[slug]` | Ficha do viewer e botão de voto | `revalidate = 60` |
| `/[locale]/submit` | Formulário, exige login | dinâmica |
| `/[locale]/me` | Submissões do usuário, status, edição, exclusão | dinâmica |
| `/[locale]/highlights` | Meses fechados, lidos de `monthly_highlights` | `revalidate` |
| `/[locale]/rules`, `/privacy`, `/kit` | Páginas estáticas | estática |
| `/admin` | Moderação e integridade do voto, só `admins` | dinâmica |
| `/auth/callback` | Troca do código OAuth | dinâmica |
| `POST /api/intake/github` | Intake assinado do Issue Form | dinâmica |
| `GET /api/cron/digest` | E-mail diário de pendências | dinâmica |

Galeria: a página entrega a lista inteira de viewers aprovados e o cliente ordena (votos totais, votos no mês, recentes) e filtra (plataforma, base tecnológica, país do autor). O estado "você votou" vem de uma ilha client que consulta os votos do usuário logado.

## Modelo de dados

Todas as tabelas em `public`, com RLS ligado e `revoke all` de `anon` e `authenticated`. Leitura pública por funções ou views com `grant` explícito.

### `submissions`

- **Identidade e estado:** `id uuid`, `slug text unique` (congelado após aprovação), `status text` em (`draft`, `pending`, `approved`, `rejected`, `removed`), `rejection_reason text`, `owner_id uuid null` (FK `auth.users`, `on delete cascade`), `source text` em (`form`, `github`), `github_issue_number int unique null`, `github_user_id text null` (imutável após o insert), `created_at`, `updated_at`, `approved_at`.
- **Ficha obrigatória para sair de `draft`:** `name` (até 60), `tagline` (até 120), `description` (até 2000), `differential` (até 280), `lang` em (`pt`, `en`), `platforms text[]` em (`web`, `desktop`, `mobile`, `xr`), `requires_install bool`, `repo_url`, `license` (SPDX), `base_tech` em (`scratch`, `ohif`, `cornerstone3d`, `vtkjs`, `dwv`, `niivue`, `volview`, `other`), `data_source` (até 200), `data_license` (até 60), `external_api bool`, `external_api_detail` (até 280, obrigatório se `external_api`).
- **Demo navegável:** `demo_url`, `download_url`, `video_url`. Se `platforms` contém `web`, `demo_url` é obrigatório. Se não contém, `download_url` e `video_url` são obrigatórios.
- **Ficha opcional:** `ai_tools jsonb` (lista de `{name, version}`, até 10), `ai_code_share` em (`none`, `lt25`, `25to75`, `gt75`, `all`), `prompts_url`, `time_spent` em (`lt1d`, `1to7d`, `1to4w`, `gt1m`), `cost` em (`lt10`, `10to100`, `100to1000`, `gt1000`), `features text[]`, `modalities text[]`, `dicomweb bool`, `stack` (até 200), `author_name` (até 80), `author_profile` em (`radiologist`, `resident`, `physician`, `developer`, `student`, `physicist`, `team`), `country` (ISO 3166-1 alfa-2), `limitations` (até 500).
- **Aceite:** `rules_version text`, `rules_accepted_at timestamptz`.
- **URLs:** toda URL começa com `https://` e tem até 300 caracteres.

As colunas da ficha aceitam nulo enquanto a linha está em `draft`. A completude (ficha obrigatória, regra da demo e ao menos uma imagem) é conferida pela função que envia para moderação.

Transições válidas: `draft` para `pending` (envio pelo dono, com ficha completa). `pending` para `approved` ou `rejected`. `rejected` para `pending` (reenvio pelo dono). `approved` para `removed` e de volta. Qualquer outra falha.

### `screenshots`

`id uuid`, `submission_id` (FK, `on delete cascade`), `path text` (objeto no Storage), `status` em (`pending`, `approved`, `rejected`), `position int`, `created_at`. Até 5 por submissão, limite aplicado no banco. Só imagem `approved` aparece em página pública.

Storage: bucket público `screenshots`, objeto em `{uid}/{submission_id}/{uuid}.{ext}`, MIME `image/png`, `image/jpeg` ou `image/webp`, até 2 MB, sem policy de listagem, `cacheControl` curto. Excluir a linha remove o objeto.

### `votes`

`user_id` (FK `auth.users`, `on delete cascade`), `submission_id` (FK, `on delete cascade`), `created_at` imutável, `revoked_at null`, `voided_at null`. PK `(user_id, submission_id)`. Voto conta quando `revoked_at` e `voided_at` são nulos. Desvotar preenche `revoked_at`. Votar de novo limpa `revoked_at` e preserva `created_at`.

### `monthly_highlights`

`month date` (primeiro dia do mês em `America/Sao_Paulo`), `rank int` (1 a 3), `submission_id uuid null` (`on delete set null`), `name`, `slug`, `votes int`. PK `(month, rank)`. Desempate: viewer aprovado há mais tempo.

### `admins`, `banned_voters`, `submission_events`

- `admins(user_id)`: semeada por SQL.
- `banned_voters(user_id, reason, created_at)`.
- `submission_events(id, submission_id null, actor_id null, kind text, detail jsonb, created_at)`: append-only. Registra transição de estado, mudança de URL em viewer aprovado, anulação de voto, banimento e recálculo de snapshot.

## Funções (única via de escrita)

Todas `security definer`, `search_path = ''`, com erro tipado.

- **Voto:** `cast_vote(submission_id)`, `revoke_vote(submission_id)`, `my_votes()`. Exigem `auth.uid()`, identidade `google` ou `github` em `auth.identities`, usuário fora de `banned_voters`, viewer `approved`, e respeitam 30 operações por minuto por usuário.
- **Leitura pública:** `ranking()` devolve viewers aprovados com contagem total e do mês corrente, sem expor `user_id`.
- **Snapshot:** `snapshot_month(month)` idempotente, agendada no `pg_cron` para o primeiro dia de cada mês.
- **Submissão:** `create_submission` (cria `draft`), `update_submission`, `submit_submission` (`draft` para `pending`), `resubmit_submission` (`rejected` para `pending`), `delete_submission`. Teto de 3 submissões em `draft` ou `pending` por usuário.
- **Moderação (só admin):** `moderate_submission(id, action, reason)`, `moderate_screenshot(id, action)`.
- **Integridade (só admin):** `vote_report(submission_id)`, `void_votes(user_id)`, `ban_voter(user_id, reason)`, `recompute_month(month)`.
- **Intake:** `intake_github_issue(...)` e `claim_github_submissions()`.

## Caminho GitHub

1. O autor abre uma issue pelo Issue Form do repo público. O form só tem `input`, `dropdown` e `checkboxes`.
2. O workflow `on: issues [opened, edited]` envia o corpo cru, o número e o `issue.user.id` para `POST /api/intake/github`, com assinatura HMAC-SHA256 e timestamp. O workflow não interpola `github.event.issue.*` em `run:` e fixa actions por SHA.
3. O app valida a assinatura e a janela de tempo, faz o parse dos blocos `### Rótulo`, valida com o mesmo schema Zod do formulário (parte que cabe no form) e chama `intake_github_issue`. A função cria ou atualiza linha `draft` com `owner_id` nulo. Nunca toca linha com dono ou fora de `draft`.
4. A resposta (aceito ou lista de erros) vira comentário do workflow na issue.
5. Quando o autor entra no site com GitHub, `claim_github_submissions()` casa o `provider_id` de `auth.identities` com `github_user_id` e atribui a posse. O autor completa descrição longa e screenshots no site e envia para moderação.

## Moderação e aviso

- Primeira publicação e toda imagem passam por aprovação. Aprovar uma submissão exige ao menos uma imagem aprovada.
- Edição de texto em viewer aprovado entra direto. Mudança de URL em viewer aprovado entra direto e grava evento.
- `GET /api/cron/digest` roda uma vez por dia pelo cron da Vercel, exige `Authorization: Bearer $CRON_SECRET`, consulta pendências e envia um e-mail por `fetch` à API do Resend. Sem `RESEND_API_KEY` vira no-op logado. A consulta diária também mantém o projeto Supabase ativo.

## Variáveis de ambiente

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `GITHUB_INTAKE_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`, `ADMIN_EMAIL`.

No repo público `eduardocaminha/dicom-viewer-challenge`, o mesmo valor de `GITHUB_INTAKE_SECRET` fica no segredo `RADIOLOGIC_INTAKE_SECRET`, porque o GitHub não aceita nome de segredo começando com `GITHUB_`. A URL do endpoint fica na variável `RADIOLOGIC_INTAKE_URL`. O conteúdo publicado lá é o de `docs/public-repo/`.

## Supabase local

`supabase/config.toml` com `project_id = "radiologic-viewers"` e portas na faixa 553xx, para não colidir com o `reporter` (5432x). Testes de usuário usam contas locais com identidade `github` ou `google` semeada por SQL.
