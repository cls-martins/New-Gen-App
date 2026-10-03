# New Glen Shitpost — plano de construção

O pedido é grande, então vou construir em etapas. Cada etapa entrega algo que já funciona no app.

## Visual
- Tema escuro por padrão: preto, cinza escuro, vermelho, bordô, textos brancos. Tema claro como opção, salvo na conta.
- Títulos com fonte marcante (estilo cartaz/condensada) e corpo legível. Menu lateral no computador, barra inferior no celular, botão rápido "Postar".

## Etapa 1 — Base (esta entrega)
- Cadastro (username único, email, senha, confirmação, foto opcional), login, esqueci a senha, redefinir senha, logout, páginas protegidas.
- Banco completo de uma vez: perfis, posts, mídia, curtidas, comentários (com imagem), seguidores, amizades e pedidos, conversas e mensagens, avisos, enquetes e votos, configurações, plano free/premium, links do perfil, denúncias e status de moderação. Tudo com regras de acesso seguras.
- Limite de 6 posts/dia para free (valor do premium configurável), verificado no servidor.
- Feed com rolagem infinita, criação de posts: texto, imagem (com corte livre), vídeo, áudio, enquete e combinações. Curtir/descurtir.

## Etapa 2 — Social
- Comentários com curtidas, respostas e foto com editor de corte.
- Perfil completo (banner com imagem/cor, foto com borda colorida, contadores, grid de posts) e mini perfil ao clicar em qualquer nome/foto.
- Seguir, pedidos de amizade (enviar, aceitar, recusar, cancelar, remover).
- Pesquisa de usuários e posts.

## Etapa 3 — Conversas e avisos
- Mensagens em tempo real só entre quem se segue mutuamente, não lidas, status de leitura, fundo personalizado por conversa.
- Avisos (curtida, comentário, seguidor, amizade, mensagem, menções), lidos x não lidos.

## Etapa 4 — Premium e configurações
- Página Premium (pronta para pagamento futuro), links no perfil, efeitos no nome (gradiente, brilho, animação).
- Configurações: conta, perfil, aparência, privacidade, notificações.

## Detalhes técnicos
- Supabase externo já conectado: Auth, Postgres com RLS, Realtime para chat/avisos.
- Mídia: imagens no Supabase Storage (comprimidas no navegador); vídeo/áudio aceitam upload em bucket com limite de tamanho OU URL externa (CDN), com uma tabela `media` pensada para trocar de provedor depois.
- Contagens via triggers/visões; limite diário via trigger no insert de `posts` lendo `plan_limits`.
- Email de confirmação: por padrão o Supabase exige confirmar o email; posso deixar assim.
