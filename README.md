# IntegraSUS

Frontend responsivo e API para gerenciamento de receitas, pacientes, medicamentos e retiradas. A interface usa o protótipo Clinical Direct como referência, com navegação principal fixa na parte inferior no desktop e no celular, sem menu hambúrguer ou gaveta lateral.

## Executar

Requer Node.js 20 ou superior.

```sh
npm install
npm start
```

Abra **http://localhost:3000**. A API e a interface são servidas pelo mesmo Express, sem etapa de build. `npm run dev` reinicia o servidor quando os arquivos do servidor mudam; atualize o navegador após editar o frontend.

Também é possível executar `docker compose up --build` e acessar o mesmo endereço.

## Usar a interface

- **Visão geral:** indicadores calculados a partir dos registros, gráfico dos últimos sete dias, receitas recentes e alertas de estoque.
- **Nova receita:** selecione ou cadastre um paciente, adicione medicamentos e posologia, revise e emita o código de retirada.
- **Dispensação:** busque uma receita pelo código e registre uma retirada parcial ou integral. As quantidades respeitam o saldo da receita e o estoque disponível.
- **Pacientes:** cadastro, busca por nome/CPF e edição.
- **Estoque:** cadastro e edição de medicamentos, ajustes de quantidade e filtros de disponibilidade. Estoque baixo corresponde a até dez unidades; crítico, até duas.
- **Histórico:** busca, filtros por status, paginação, detalhes, impressão, cancelamento com confirmação e exportação CSV da seleção atual.

### Acesso ao sistema

A tela inicial é o login. Escolha **Médico** ou **Farmacêutico**, entre com sua conta ou use **Criar conta profissional**. O cadastro médico pede CRM/UF; o farmacêutico pede CRF/UF. As operações usam a API e são persistidas em `sistema.db`, sem opções de explorar demonstrações na interface.

A consulta pública por código continua disponível na tela de login e tem um botão **Voltar para o login** para retornar à entrada principal.

Há apenas dois perfis autenticados, com navegação inferior e ações próprias:

| Operação | Médico | Farmacêutico |
| --- | --- | --- |
| Visão geral | Consultório e prescrições próprias | Dispensações e estoque |
| Cadastrar e editar pacientes | Sim | Não |
| Emitir, editar orientações e cancelar receita | Somente as próprias | Não |
| Histórico autenticado | Somente as próprias receitas e retiradas | Todas as receitas e retiradas |
| Consultar catálogo de medicamentos | Sim, na prescrição | Sim, no estoque |
| Cadastrar e ajustar medicamentos/estoque | Não | Sim |
| Registrar retirada | Não | Sim |

Em uma base vazia, cadastre os medicamentos com uma conta de farmacêutico e os pacientes com uma conta médica. Emita a receita como médico e registre a retirada como farmacêutico. A consulta pública por código permanece disponível sem criar um terceiro perfil de usuário.

As permissões são verificadas no servidor a partir do perfil do JWT e da conta existente no banco. Alterar o menu, o hash da URL, o corpo da requisição ou o perfil salvo no navegador não concede permissões na API. O nome e o ID do farmacêutico na retirada vêm da conta autenticada; o formulário mostra o responsável sem permitir edição. O médico não pode acessar ou alterar por ID receitas emitidas por outro médico.

Os cadastros médicos existentes são mantidos. O servidor cria a tabela `farmaceuticos` e adiciona `farmaceutico_id` às retiradas em uma migração aditiva e idempotente; retiradas anteriores conservam seus dados. Sessões emitidas antes da separação de perfis precisam de novo login.

O mesmo e-mail pode ter uma conta médica e uma farmacêutica independentes; selecione o perfil correspondente ao entrar. Dentro de cada perfil, o e-mail e o registro profissional devem ser únicos. Senhas são armazenadas como hash bcrypt.

O JWT é mantido no `sessionStorage` da aba. Ao sair, ele e os dados carregados são removidos da sessão da interface. A opção **Consultar uma receita por código**, na página de acesso, usa `/receitas/codigo/:codigo`, exclusivamente com dados da API real. Recuperação de senha, assinatura digital e notificações externas não estão implementadas.

### Rotas de autenticação

- `POST /medicos` — cadastro médico (`nome`, `crm`, `email`, `senha`).
- `POST /medicos/login` — login médico (`email`, `senha`).
- `POST /farmaceuticos` — cadastro farmacêutico (`nome`, `crf`, `email`, `senha`).
- `POST /farmaceuticos/login` — login farmacêutico (`email`, `senha`).

Os dois logins retornam `{ token, usuario }`, com `usuario.perfil` igual a `medico` ou `farmaceutico`. O campo `medico` também é preservado no login médico para compatibilidade. As rotas protegidas usam `Authorization: Bearer <token>`. Falta de autenticação retorna 401; operação de outro perfil retorna 403. Cada profissional só pode editar seu próprio cadastro.

## Organização

```text
public/
  index.html   Página de entrada
  styles.css   Componentes e breakpoints responsivos
  app.js       Telas, formulários, navegação e interações
  data.js      Adaptador HTTP e dados fictícios usados nos testes
  profiles.js  Definição das duas visões e seus menus
  icons.js     Ícones SVG e identidade visual
src/
  app.js       Express: arquivos estáticos e rotas da API
tests/
  frontend.test.js  Fluxos de dados e integração HTTP
  profiles.test.js  Autenticação, permissões e fluxo entre os dois perfis
  migration.test.js Preservação dos registros anteriores na migração
```

Os estilos usam DM Sans e Manrope via Google Fonts, com fontes locais de fallback. O restante da interface não depende de bibliotecas ou CDNs.

As rotas existentes foram preservadas. O resumo que anteriormente respondia em `/` está em **`/api`**; `/` agora entrega o frontend.

## Verificar

```sh
npm run check
npm test
```

Os testes verificam emissão e retirada na demonstração, consistência do estoque, autenticação dos dois perfis, acessos indevidos, isolamento das receitas médicas, identificação do responsável e integração HTTP. Os testes de integração usam SQLite em memória; o teste de migração usa uma base fictícia temporária, removida ao terminar. Eles não criam ou alteram registros na base local do projeto. `DATABASE_PATH` permite configurar outra base para execução isolada; o padrão continua sendo `sistema.db`.

Para uma implantação real, configure `JWT_SECRET` no ambiente do servidor e use HTTPS.
