# Biblioteca Nova Alexandria (BNA)

Projeto novo e independente da antiga Biblioteca Lúdica. **Fase CF-01**: núcleo funcional online antes de qualquer expansão estética.

## Meta de homologação

Em uma sala provisória (640×352), um ADM autorizado move um caixote, o D1 registra a nova posição e um visitante em outro navegador vê a mudança automaticamente, sem F5. O código utiliza Cloudflare Workers, D1, Durable Objects (WebSockets) e Cloudflare Access.

## Situação

A infraestrutura GitHub foi iniciada em 24/10/2026. **Ainda não existe implantação Cloudflare homologada**. Variáveis e identificadores de infraestrutura não devem ser publicados como segredos em Git.

O repositório é público; todos os segredos são configurados em Cloudflare ou no cofre de segredos do GitHub, nunca no repositório.

## Ordem

1. Código inicial + validações automatizadas no GitHub.
2. Vincular Worker ao repositório e criar D1 na Cloudflare.
3. Configurar autenticação ADM (Cloudflare Access) e segredos.
4. Implantar o Worker, executar a migração e homologar dois navegadores.
5. Só depois iniciar EPUB/R2 e outros recursos.

Leia `docs/PRIMEIRA-CONEXAO.md` e `docs/CF01-CHECKLIST.md` para instruções.
