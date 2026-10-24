# CF-01 — Critérios de aprovação

## Infraestrutura
- [ ] D1 remoto criado, migração aplicada e dados iniciais consultáveis.
- [ ] Worker `biblioteca-nova-alexandria` hospedado na Cloudflare.
- [ ] GitHub integrado ao Workers Builds.
- [ ] CI de JavaScript e testes unitários aprovado.
- [ ] Access protegendo somente /admin e /admin/*; páginas públicas acessíveis anonimamente.

## Sistema
- [ ] Visitante entra na sala e vê a estante fixa e o caixote móvel.
- [ ] ADM autorizado consegue mover um caixote e gravar.
- [ ] Visitante B vê a modificação sem F5 por WebSocket.
- [ ] Novo dispositivo recebe a posição mais recente do D1.
- [ ] Reiniciar navegador não perde os dados.
- [ ] Alteração em um aparelho não afeta estado local do avatar dos demais.

## Segurança e resiliência
- [ ] Visitante não consegue executar POST/PATCH/DELETE administrativos.
- [ ] Envio com revisão desatualizada recebe 409 e não sobrescreve dados.
- [ ] Colisões e limites da sala são validados no servidor.
- [ ] Desconectar/reconectar não perde a revisão.
- [ ] Após deploy do código, dados continuam iguais.
- [ ] Segredos não existem no GitHub.
- [ ] Backup e procedimentos de recuperação documentados.

CF-01 só será concluída após a comprovação de TODOS os critérios em ambiente publicado.
