# Lições do radiologic-viewers

## 2026-10-30, crítica antes de declarar o visual pronto

Situação: o redesenho com COSS UI passou em lint, tipos e e2e, e mesmo assim a crítica com dois agentes isolados deu 18/32 nas heurísticas. O veredito foi "design intercambiável", e a home vazia, que é o estado real de produção, parecia abandonada.

Achado: teste verde não avalia design. O estado vazio precisa ser desenhado primeiro quando é o que existe em produção, e a identidade vem da metáfora do domínio (moldura de viewer, janela e nível), não do layout.

Regra em `AGENTS.md`, seção Identidade visual.
