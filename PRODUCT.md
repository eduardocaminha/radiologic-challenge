# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O site serve dois públicos com o mesmo peso:

- **Quem constrói.** Radiologista, residente, médico, físico, estudante ou dev que construiu uma workstation de laudo ou uma parte dela (viewer, pilha de exames, IA, agente para conversar com a pilha, tela de laudo), em geral com ajuda de IA, e quer mostrá-la. A tarefa dele é preencher a ficha, subir imagens, acompanhar a moderação e divulgar o link.
- **Quem lê exames e vota.** Visitante que abre as demos, compara as ideias e vota na workstation que gostaria de usar. A tarefa dele é percorrer a galeria, abrir a ficha e a demo, e votar com login Google ou GitHub.

## Product Purpose

O challenge.radiologic.io é um desafio de criatividade aberto, mantido pela Radiologic, para mostrar como o trabalho de laudar deveria ser: viewer, pilha de exames, IA no fluxo e agente que conversa com a pilha. Pode ser construído com IA, porque o que importa é a experiência. É um showcase permanente, sem prazo e sem prêmio. O ranking vem só do voto popular, um voto por conta por projeto. Todo mês os três mais votados entram nos destaques.

O site dá certo quando chegam workstations boas e quem visita abre as demos e vota.

## Positioning

- As ideias vêm de quem lê exame todo dia, não de fornecedor.
- Todo projeto tem demo navegável e repositório público com licença open source em SPDX.
- A ficha declara o uso de IA: ferramentas, fração do código gerado, tempo gasto e custo.
- A demo pública não chama LLM ao vivo: agente aparece simulado ou em vídeo.
- É um showcase não clínico. Nenhum projeto é para diagnóstico, e o desafio não compara produtos.

## Operating Context

- Submissão pelo formulário do site ou por Issue Form no repo público `eduardocaminha/radiologic-challenge-submissions`, com as duas entrando na mesma fila.
- Pré-moderação na primeira publicação e em cada imagem, feita no `/admin`.
- Kit de dados com estudos públicos do NCI Imaging Data Commons, sob licença aberta.
- Site trilíngue, pt, en e es.

## Capabilities and Constraints

- As rotas, o modelo de dados e as regras de transição estão em `docs/architecture.md`.
- O regulamento e a política de privacidade estão em `docs/drafts/`, e o organizador é a MEDLABZ CONSULTORIA LTDA.
- Exame próprio, de familiar ou de paciente não entra no site, mesmo anonimizado.
- Até 5 imagens por submissão.
- O código do site é publicado sob AGPL-3.0, porque usa o COSS UI.

## Brand Commitments

- Marca Radiologic: logo squircle herdado do radiologic-site, com o primary monocromático.
- Copy sem emoji, sem travessão e sem a palavra "hype". Usar "grupo de discussão" e nunca "comunidade".

## Evidence on Hand

- Em produção ainda não há nenhum projeto aprovado, então a galeria vazia é a primeira impressão.
- Não existem depoimentos, números de uso nem parceiros, e nada disso deve ser inventado.

## Product Principles

- A demo é a prova. Tudo leva o visitante a abrir e testar o projeto.
- Mostrar o construtor e o processo, incluindo o uso de IA, com o mesmo peso do resultado.
- Votar e submeter precisam ser fáceis, sem atrito além do login.
- Nunca sugerir uso clínico.
