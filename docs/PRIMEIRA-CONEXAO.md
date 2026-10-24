# BNA — Conexão inicial GitHub + Cloudflare

**Status atual:** projeto publicado no GitHub; ainda não ligado a uma conta Cloudflare. O repositório GitHub é público. Não inclua segredos nos arquivos.

## Configuração única (feita pelo titular da conta)

1. Entre no painel [Cloudflare](https://dash.cloudflare.com/) e habilite Workers, D1 e Zero Trust.
2. Em Workers & Pages, crie um Worker com **Workers Builds → GitHub**, conectando o repositório `player2003jl-gif/biblioteca-nova-alexandria`. O nome do Worker deve ser exatamente `biblioteca-nova-alexandria`.
3. **Antes de ativar o deploy**, crie um D1 chamado `bna-db`. Copie o UUID público do banco para o `database_id` em `wrangler.jsonc`. O UUID não é uma chave secreta, mas não copie tokens de API.
4. Execute o arquivo `migrations/0001_nucleo.sql` nesse banco, pelo console D1 ou pelo comando `npx wrangler d1 migrations apply DB --remote` depois de atualizar o UUID e autenticar o Wrangler.
5. Configure uma aplicação self-hosted do Cloudflare Access que proteja **apenas as rotas /admin e /admin/***, mantendo `/`, `/api/state`, `/api/health` e `/api/live` públicos. Autorize somente seu e-mail administrativo.
6. Adicione ao Worker, como **Secrets**, `ACCESS_TEAM_DOMAIN` (ex.: `https://seu-time.cloudflareaccess.com`), `ACCESS_AUD` (AUD Tag da aplicação Access) e `ADMIN_EMAIL` (e-mail administrativo). Esses valores NÃO devem ser enviados pelo chat.
7. Em Workers Builds, use o repositório e branch `main`; comando de build `npm install --no-audit --no-fund && npm run check && npm test`; comando de deploy `npx wrangler deploy`. Configure o acesso do GitHub para permitir builds.
8. Abra a URL do Worker. A página principal é pública e o caminho `/admin` exige login.

**Importante:** o workflow GitHub Actions deste repositório executa SOMENTE TESTES. Quem publica é o Workers Builds, após a conexão. Não ative um segundo deploy por GitHub Actions para evitar duas publicações concorrentes.

## Homologação CF-01

- Navegador A: acessar `/admin` e entrar via Access.
- Navegador B anônimo: abrir `/`.
- No ADM: movimentar caixote e confirmar gravação.
- Confirmar atualização no B sem recarregar.
- Reabrir a página, confirmar persistência D1.
- Tentar mutação sem Access e confirmar recusa.

Se não funcionar, verificar Logs do Worker, migrations D1, segredos e política Access. **Não considerar a Fase 1 homologada sem o teste real.**
