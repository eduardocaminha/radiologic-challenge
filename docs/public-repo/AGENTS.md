# Enviar uma workstation por agente

Instruções para agentes de código que preparam uma submissão em nome de uma pessoa. O agente prepara e a pessoa envia.

## O que o agente faz

Abre uma issue neste repositório com a conta da pessoa no GitHub. A issue vira um rascunho no site.

```bash
gh issue create --repo eduardocaminha/radiologic-challenge-submissions --title "[Workstation] Nome do projeto" --body-file submissao.md
```

O título precisa começar com `[Workstation]`. Cada campo do corpo é um bloco iniciado por `### Rótulo`, com os rótulos de `.github/ISSUE_TEMPLATE/viewer.yml`. Depois de abrir, leia o comentário que o robô deixa na issue: ele confirma o rascunho ou lista os campos a corrigir. Para corrigir, edite a issue.

## O que só a pessoa faz

Entrar em https://challenge.radiologic.io com a mesma conta do GitHub, adicionar as imagens, aceitar o regulamento e mandar para moderação. O agente não aceita o regulamento em nome de ninguém, e marcar isso na issue não tem efeito. Avise a pessoa quando o rascunho estiver pronto.

## Regras para o agente

- Leia o regulamento: https://challenge.radiologic.io/pt/rules
- Nunca envie dado de paciente real, nem em texto, link ou demo. Use o kit de dados ou outra base pública, e informe a fonte e a licença.
- Preencha só o que for verdade sobre o projeto. Na dúvida, pergunte à pessoa.
- O repositório precisa ser público, com licença SPDX.
- Projeto web precisa de `URL da demonstração`. Os demais precisam de `URL do download` e `URL do vídeo`.

## Formato do corpo

```markdown
### Nome da workstation
Nome público, até 60 caracteres

### Frase de apresentação
Até 120 caracteres

### Descrição
Pode ter vários parágrafos, até 2.000 caracteres

### Limitações
Até 500 caracteres

### Diferencial
Até 280 caracteres

### Idioma do projeto
pt

### Partes da workstation
- [x] Viewer
- [ ] Pilha
- [ ] IA
- [ ] Agente
- [ ] Laudo

### Plataformas
- [x] web
- [ ] desktop
- [ ] mobile
- [ ] xr

### Exige instalação
Não

### Repositório público
https://github.com/pessoa/projeto

### Licença SPDX
MIT

### Tecnologia base
cornerstone3d

### Fonte dos dados
Kit de dados do Radiologic Workstation

### Licença dos dados
CC BY 4.0

### Usa API externa
Não

### URL da demonstração
https://exemplo.dev

### Ferramentas de IA
Claude Code, 2.1
```

Os demais campos são opcionais e estão no template. Dropdowns e caixas de marcar aceitam só os valores listados nele.
