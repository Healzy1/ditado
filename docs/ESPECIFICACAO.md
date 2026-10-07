# Especificação — Ditado

## 1. Visão geral

Ditado é uma aplicação web full stack para transcrição de arquivos de áudio.

Um visitante pode conhecer o produto por meio de uma landing page e criar uma conta.
Após autenticar-se, o usuário pode enviar um arquivo de áudio, receber sua transcrição
em texto, consultar seu histórico pessoal de transcrições e gerenciar a própria conta.

A aplicação permite alterar a senha e, quando habilitado no ambiente, recuperá-la por
e-mail.

Usuários com papel de administrador podem gerenciar contas de usuários.

A transcrição do áudio é realizada por um modelo Whisper por meio da API da Groq.

---

## 2. Objetivo

Construir uma aplicação web que permita:

- apresentar o produto em uma landing page pública;
- cadastrar usuários;
- autenticar usuários;
- permitir que usuários gerenciem o próprio perfil, senha e conta;
- recuperar senhas por e-mail quando a funcionalidade estiver habilitada no ambiente;
- enviar arquivos de áudio para transcrição;
- exibir o texto retornado pela Groq;
- armazenar as transcrições;
- consultar o histórico pessoal;
- excluir transcrições;
- permitir que administradores gerenciem contas.

---

## 3. Escopo

### 3.1 Incluído

- frontend web;
- backend REST;
- autenticação com JWT;
- persistência em PostgreSQL;
- integração com a API da Groq;
- cadastro e login;
- gerenciamento do próprio perfil, senha e conta;
- recuperação de senha por e-mail configurável por ambiente;
- área autenticada;
- upload de áudio;
- histórico de transcrições;
- controle de acesso por usuário;
- área administrativa para gerenciamento de contas.

### 3.2 Fora do escopo desta aula

- deploy em produção;
- HTTPS;
- configuração de VPS;
- Traefik;
- migrações de banco para produção;
- armazenamento permanente do arquivo de áudio enviado.

O deploy e a infraestrutura de produção serão tratados posteriormente.

---

## 4. Arquitetura

A aplicação será dividida em três camadas principais:

### Frontend

Tecnologias:

- React;
- Vite;
- TypeScript;
- React Router;
- Axios;
- TanStack Query;
- Zustand;
- React Hook Form;
- Zod;
- Tailwind CSS v4, integrado ao Vite por `@tailwindcss/vite`;
- Lucide React.

Responsabilidades:

- exibir as telas;
- coletar dados do usuário;
- enviar requisições ao backend;
- manter a sessão no navegador;
- apresentar os dados retornados pela API.

O frontend deve acessar o backend utilizando caminhos relativos iniciados por `/api`.

Não devem existir URLs como:

`http://localhost:3000/api/...`

espalhadas pelo código do frontend.

Durante o desenvolvimento, o Vite deve encaminhar `/api` para o backend.

### Backend

Tecnologias:

- NestJS;
- @nestjs/config;
- TypeScript;
- TypeORM;
- PostgreSQL;
- JWT;
- Passport;
- bcryptjs;
- class-validator;
- class-transformer;
- multer.

Responsabilidades:

- validar requisições;
- autenticar e autorizar usuários;
- executar regras de negócio;
- acessar o banco;
- chamar a API da Groq;
- enviar e-mails transacionais de recuperação de senha;
- impedir acesso a recursos de outros usuários.

### Banco de dados

PostgreSQL executado por Docker Compose.

Durante o desenvolvimento:

- porta interna: 5432;
- publicação no host: `127.0.0.1:5432`;
- TypeORM com `synchronize: true`.

`synchronize: true` deve ser utilizado apenas no ambiente de desenvolvimento.

### Serviços externos

A Groq será utilizada exclusivamente pelo backend.

A chave `GROQ_API_KEY` nunca deve ser enviada ao frontend.

A recuperação de senha utilizará um serviço de e-mail transacional chamado
exclusivamente pelo backend. Para esta versão, o provedor previsto é a Brevo.

A regra de negócio da recuperação de senha não deve depender diretamente de detalhes
específicos da Brevo, de forma a evitar acoplamento desnecessário ao provedor.

### Configuração por ambiente

Valores que variam entre ambientes ou contêm informações sensíveis não devem ser
armazenados diretamente no código-fonte.

A configuração da recuperação de senha deve incluir:

- a disponibilidade da funcionalidade no ambiente;
- o valor de `APP_URL`, utilizado nos links de redefinição;
- as credenciais e demais dados necessários ao envio pelo serviço de e-mail transacional.

Quando `PASSWORD_RESET_ENABLED=false`, a aplicação deve iniciar normalmente sem a
configuração da Brevo. Quando `PASSWORD_RESET_ENABLED=true`, `BREVO_API_KEY`,
`EMAIL_FROM` e `APP_URL` válidos tornam-se obrigatórios, e a ausência ou invalidade de
qualquer um desses valores deve causar falha na inicialização. A interface deve refletir
essa disponibilidade conforme definido na seção 9.

---

## 5. Perfis de usuário

### 5.1 Visitante

Pode:

- visualizar a landing page;
- acessar a página de login;
- criar uma conta;
- solicitar a recuperação de senha quando a funcionalidade estiver disponível.

Não pode:

- acessar a área interna;
- criar transcrições;
- visualizar históricos;
- acessar funções administrativas.

### 5.2 Usuário

Pode:

- autenticar-se utilizando e-mail e senha;
- enviar arquivos de áudio;
- criar transcrições;
- visualizar somente suas próprias transcrições;
- excluir somente suas próprias transcrições;
- visualizar os dados do próprio perfil;
- alterar o próprio nome;
- alterar o próprio e-mail;
- alterar a própria senha;
- excluir a própria conta.

Não pode:

- visualizar transcrições de outros usuários;
- acessar funções administrativas;
- definir ou alterar seu próprio papel.

Regras de alteração do perfil:

- o e-mail deve possuir formato válido;
- o e-mail deve permanecer único entre as contas;
- ao alterar o e-mail, o novo endereço passa a ser utilizado nos próximos logins;
- a alteração bem-sucedida do e-mail invalida tokens pendentes de recuperação,
  conforme a seção 6.3;
- tentativa de utilizar um e-mail já cadastrado deve resultar em `409 Conflict`.

Regras de alteração da própria senha:

- o usuário deve informar a senha atual;
- a nova senha deve obedecer à política de senha definida na seção 7;
- a senha deve ser armazenada somente após geração de novo hash;
- senha não pode ser alterada pela rota de alteração dos dados do perfil.

A alteração bem-sucedida da senha invalida tokens pendentes de recuperação, conforme
a seção 6.3.

Regras de exclusão da própria conta:

- a exclusão deve exigir confirmação explícita na interface;
- o usuário deve informar sua senha atual para confirmar a operação;
- a exclusão é definitiva;
- todas as transcrições pertencentes à conta também são excluídas;
- todos os tokens de recuperação de senha pertencentes à conta também são excluídos;
- se a conta pertencer ao único administrador existente, a exclusão deve ser rejeitada com `409 Conflict`.

### 5.3 Administrador

Possui todas as permissões de um usuário autenticado e também pode gerenciar contas.

Pode:

- listar usuários;
- visualizar os dados públicos de uma conta;
- alterar nome e e-mail de outros usuários;
- alterar o papel de outros usuários entre `user` e `admin`;
- excluir outros usuários.

Não pode:

- excluir a própria conta por meio das funções administrativas;
- alterar o próprio papel por meio das funções administrativas.

A exclusão administrativa de uma conta é definitiva e remove também todas as
transcrições e todos os tokens de recuperação de senha pertencentes ao usuário
excluído.

Regras administrativas:

- o sistema deve possuir sempre pelo menos um administrador;
- uma operação que removeria ou rebaixaria o último administrador deve ser rejeitada
  com `409 Conflict`, respeitada a precedência do `403` para auto-operações
  administrativas proibidas, conforme a seção 9.5.

---

## 6. Modelo de dados

### 6.1 User

Representa uma conta da aplicação.

Campos propostos:

| Campo | Tipo | Regra |
|---|---|---|
| id | UUID | chave primária |
| name | string | obrigatório |
| email | string | obrigatório e único |
| passwordHash | string | obrigatório |
| role | enum | `user` ou `admin` |
| createdAt | datetime | preenchido automaticamente |
| updatedAt | datetime | atualizado automaticamente |

Regras:

- senhas nunca são armazenadas em texto puro;
- `passwordHash` nunca deve aparecer nas respostas da API;
- usuários cadastrados pela rota pública recebem `role = user`;
- o cliente não pode definir `role` durante o cadastro.

### 6.2 Transcription

Representa uma transcrição criada por um usuário.

Campos propostos:

| Campo | Tipo | Regra |
|---|---|---|
| id | UUID | chave primária |
| text | text | texto transcrito |
| originalFilename | string | nome original do arquivo |
| language | string | código de idioma ISO 639-1 obrigatório, enviado para a transcrição |
| createdAt | datetime | criação |
| userId | UUID | usuário proprietário |

Relacionamento:

- `User 1:N Transcription`;
- um usuário pode possuir zero ou várias transcrições;
- cada transcrição pertence exatamente a um usuário.
- ao excluir um usuário, todas as suas transcrições também são excluídas.

Regras:

- o texto da transcrição é produzido pela Groq;
- o arquivo de áudio original não é armazenado permanentemente.

### 6.3 PasswordResetToken

Representa um token temporário utilizado na recuperação de senha.

Campos propostos:

| Campo | Tipo | Regra |
|---|---|---|
| id | UUID | chave primária |
| tokenHash | string | hash obrigatório do token |
| expiresAt | datetime | 30 minutos após `createdAt` |
| createdAt | datetime | preenchido automaticamente |
| userId | UUID | usuário proprietário |

Relacionamento:

- `User 1:N PasswordResetToken`;
- cada token pertence exatamente a um usuário;
- ao excluir um usuário, todos os seus tokens de recuperação também são excluídos.

Regras:

- o valor original do token nunca deve ser armazenado;
- o token deve ser temporário, criptograficamente aleatório e de uso único, inclusive
  contra tentativas simultâneas de consumo;
- o token deve expirar 30 minutos após sua criação;
- ao gerar um novo token para um usuário, todos os tokens anteriores ainda válidos
  desse usuário devem ser invalidados;
- tokens expirados, inválidos ou já utilizados não podem redefinir uma senha;
- após uma alteração autenticada de senha, redefinição de senha ou alteração de e-mail
  bem-sucedida, todos os tokens de recuperação ainda válidos da conta devem ser
  invalidados, incluindo o utilizado na redefinição;
- a invalidação por mudança de e-mail também se aplica à alteração administrativa.

---

## 7. Autenticação

A autenticação utilizará JWT.

### Política de senha

A mesma política deve ser aplicada ao cadastro, à alteração autenticada de senha, à
redefinição de senha por token e à senha do primeiro administrador.

Regras:

- a senha deve possuir no mínimo 12 caracteres;
- a senha deve possuir no máximo 72 bytes quando codificada em UTF-8, limite compatível
  com o processamento realizado pelo bcrypt;
- letras, números, símbolos e espaços são permitidos;
- não é obrigatório combinar categorias específicas de caracteres, como letras
  maiúsculas, letras minúsculas, números ou símbolos;
- os limites devem ser validados antes da geração do hash.

### Cadastro

O usuário informa:

- nome;
- e-mail;
- senha.

O backend:

1. valida os dados;
2. valida a senha utilizando a política definida nesta seção;
3. verifica se o e-mail já está cadastrado;
4. gera o hash da senha;
5. cria o usuário com papel `user`.

O campo `role` não pode ser aceito na requisição pública de cadastro.

### Login

O usuário informa:

- e-mail;
- senha.

O backend:

1. localiza o usuário;
2. compara a senha com `passwordHash` utilizando bcrypt;
3. gera um JWT;
4. devolve os dados públicos do usuário e o token.

Resposta não pode conter `passwordHash`.

### Alteração autenticada de senha

O usuário autenticado pode alterar sua senha informando a senha atual e a nova senha.

O backend deve:

1. confirmar a senha atual;
2. validar a nova senha utilizando a política definida nesta seção;
3. gerar um novo hash;
4. substituir o `passwordHash` armazenado.

Após a alteração bem-sucedida, os tokens pendentes de recuperação devem ser invalidados
conforme a seção 6.3.

A senha atual e a nova senha nunca devem ser armazenadas nem retornadas.

### Recuperação de senha

Quando a funcionalidade estiver habilitada no ambiente, o usuário pode solicitar a
recuperação por e-mail.

O backend deve responder de forma equivalente exista ou não uma conta associada ao
e-mail informado. Para uma conta existente, deve gerar um token temporário e
criptograficamente aleatório, invalidar os tokens anteriores ainda válidos desse
usuário, armazenar somente o hash do novo token, definir sua expiração para 30 minutos
após a criação e enviar por e-mail um link baseado em `APP_URL`.

Na redefinição, o backend deve validar o token, sua expiração e seu uso único. A nova
senha deve obedecer à política definida nesta seção e ser armazenada somente após a
geração de um novo hash. Após o sucesso, todos os tokens ainda válidos da conta devem
ser invalidados conforme a seção 6.3.

Com `PASSWORD_RESET_ENABLED=false`, a recuperação fica indisponível e a configuração
da Brevo não é obrigatória. Com `true`, a configuração local obrigatória deve ser
válida; caso contrário, a inicialização deve falhar, sem chamada externa à Brevo para
testar a credencial, conforme a seção 13.6. Os endpoints e a interface devem respeitar
a indisponibilidade definida nas seções 9 e 10.

### Requisições autenticadas

O frontend envia:

`Authorization: Bearer <token>`

O backend valida o JWT por meio de uma Guard.

Token ausente, inválido ou expirado deve resultar em HTTP `401`.

Toda operação protegida também exige que a conta identificada pelo JWT ainda exista.
Se ela não existir, mesmo com JWT criptograficamente válido, o backend deve retornar
`401` antes de executar qualquer regra de negócio da operação ou chamar um serviço
externo.

### Primeiro administrador

O primeiro administrador não pode ser criado pelo cadastro público.

A aplicação deve fornecer um mecanismo de bootstrap para criação inicial de uma
conta administrativa.

O bootstrap deve:

1. obter nome, e-mail e senha do administrador por variáveis de ambiente;
2. validar a presença dos valores necessários;
3. validar a senha utilizando a política definida nesta seção;
4. verificar se o e-mail já está cadastrado;
5. gerar o hash da senha;
6. criar a conta com `role = admin`;
7. não criar uma conta duplicada se for executado novamente.

Se o e-mail normalizado já pertencer a uma conta `admin`, o bootstrap deve permanecer
idempotente, sem duplicar a conta nem sobrescrever silenciosamente seus dados ou
credenciais. Se pertencer a uma conta `user`, o procedimento deve falhar explicitamente,
sem promover a conta.

A senha administrativa nunca deve ser armazenada no código-fonte ou em arquivo
versionado.

O procedimento de criação do primeiro administrador deve ser documentado no
`README.md`.

---

## 8. Controle de acesso

Todas as rotas protegidas exigem a existência da conta identificada pelo JWT, conforme
a seção 7. Conta inexistente resulta em `401` e interrompe a operação.

Uma transcrição pertence ao usuário que a criou.

Um usuário comum:

- só pode listar suas próprias transcrições;
- só pode consultar suas próprias transcrições;
- só pode excluir suas próprias transcrições.

Caso um usuário tente consultar ou excluir uma transcrição pertencente a outro usuário,
a API deve responder `404 Not Found`, sem revelar a existência do recurso.

Rotas administrativas devem exigir `role = admin`.

As rotas de gerenciamento da própria conta devem atuar somente sobre o usuário
identificado pelo JWT. A alteração da senha e a exclusão da própria conta exigem a
confirmação da senha atual, e nenhuma rota de autogerenciamento pode alterar `role`.

Um administrador não pode alterar a própria `role` nem excluir a própria conta pelas
rotas administrativas. A própria conta pode ser excluída pela rota de
autogerenciamento, desde que não pertença ao único administrador existente.

Nas rotas administrativas, a proibição de operar sobre a própria conta tem precedência
e resulta em `403`, conforme a seção 9.5. Na autoexclusão legítima por
`DELETE /api/users/me`, a tentativa de excluir o único administrador resulta em `409`.
A proteção do último administrador permanece aplicável às demais operações.

As operações não podem deixar o sistema sem nenhum administrador, inclusive quando
ocorrerem simultaneamente. O mecanismo concreto para preservar essa invariável deve
ser escolhido no Plan da etapa correspondente, sem exigir infraestrutura adicional.

---

## 9. Contrato da API

Todas as rotas utilizam o prefixo:

`/api`

As respostas utilizam JSON, exceto nas operações que retornam `204 No Content`.

O envio de arquivos de áudio utiliza `multipart/form-data`.

Rotas protegidas exigem:

`Authorization: Bearer <token>`

A API utiliza, entre outros, os seguintes códigos HTTP:

- `200 OK` — leitura ou alteração realizada com sucesso;
- `201 Created` — recurso criado com sucesso;
- `204 No Content` — operação concluída sem corpo de resposta;
- `400 Bad Request` — corpo inválido, dados ausentes, formato incorreto ou campo não permitido;
- `401 Unauthorized` — autenticação ausente, inválida ou expirada, inclusive quando a
  conta identificada pelo JWT não existe mais, em uma rota protegida,
  ou credenciais inválidas no endpoint de login;
- `403 Forbidden` — usuário autenticado sem permissão para a operação ou recuperação
  de senha indisponível por configuração;
- `404 Not Found` — recurso inexistente ou recurso de outro usuário quando sua existência não deve ser revelada;
- `409 Conflict` — conflito com o estado atual dos dados, como e-mail já cadastrado ou operação que deixaria o sistema sem administrador;
- `413 Payload Too Large` — arquivo acima do limite permitido;
- `429 Too Many Requests` — limite de requisições excedido;
- `502 Bad Gateway` — falha no serviço externo de transcrição.

Quando aplicável, respostas `429 Too Many Requests` devem informar o cabeçalho
`Retry-After`.

Antes de qualquer regra de negócio em uma rota protegida, o backend deve confirmar a
existência da conta associada ao JWT, conforme a seção 7. Conta inexistente resulta em
`401`, sem prosseguir com a operação.

As respostas de erro devem possuir `statusCode` numérico correspondente ao status HTTP
e `message` como uma mensagem textual ou uma lista de mensagens textuais de validação.
O campo textual `error` pode aparecer conforme o formato natural do NestJS, mas o
frontend não deve depender dele. O status HTTP determina o resultado da operação; a
interface utiliza `message` para apresentar o erro, sem depender de stack trace, SQL ou
detalhes internos. Essa regra não altera os corpos das respostas de sucesso.

### 9.1 Configuração pública

#### GET /api/config/public

Retorna somente as capacidades públicas necessárias para configurar a interface.

Esta rota é pública e não exige autenticação.

Resposta de sucesso — `200 OK`:

```json
{
  "passwordResetEnabled": true
}
```

O campo `passwordResetEnabled` deve indicar se a recuperação de senha está habilitada
e adequadamente configurada no ambiente.

A resposta não pode expor credenciais, segredos nem outras configurações sensíveis.

### 9.2 Autenticação

#### POST /api/auth/register

Cria uma nova conta de usuário.

Corpo:

```json
{
  "name": "Ana",
  "email": "ana@teste.dev",
  "password": "senha-escolhida"
}
```

Regras:

- `name` é obrigatório;
- `email` é obrigatório e deve possuir formato válido;
- `email` deve ser único;
- `password` deve obedecer à política de senha definida nesta especificação;
- o campo `role` não pode ser informado pelo cliente;
- todo cadastro público cria o usuário com `role = user`;
- a senha deve ser armazenada somente após geração de hash.

Resposta de sucesso — `201 Created`:

```json
{
  "user": {
    "id": "uuid",
    "name": "Ana",
    "email": "ana@teste.dev",
    "role": "user"
  }
}
```

Erros:

- `400 Bad Request` — dados ausentes, inválidos ou campos não permitidos;
- `409 Conflict` — e-mail já cadastrado;
- `429 Too Many Requests` — limite de tentativas de cadastro excedido.

A resposta nunca deve conter `passwordHash`.

#### POST /api/auth/login

Autentica um usuário utilizando e-mail e senha.

Corpo:

```json
{
  "email": "ana@teste.dev",
  "password": "senha-do-usuario"
}
```

O backend deve:

1. localizar a conta correspondente ao e-mail;
2. comparar a senha informada com `passwordHash` utilizando bcrypt;
3. gerar um JWT quando as credenciais forem válidas;
4. devolver os dados públicos do usuário e o token.

Resposta de sucesso — `200 OK`:

```json
{
  "user": {
    "id": "uuid",
    "name": "Ana",
    "email": "ana@teste.dev",
    "role": "user"
  },
  "accessToken": "jwt"
}
```

Erros:

- `400 Bad Request` — corpo da requisição inválido;
- `401 Unauthorized` — e-mail ou senha inválidos;
- `429 Too Many Requests` — limite de tentativas de login excedido.

A resposta nunca deve conter `passwordHash`.

#### POST /api/auth/forgot-password

Inicia o fluxo de recuperação de senha por e-mail.

Corpo:

```json
{
  "email": "ana@teste.dev"
}
```

Resposta de sucesso — `200 OK`:

```json
{
  "message": "Se houver uma conta associada a este e-mail, serão enviadas instruções para redefinição da senha."
}
```

A resposta deve ser equivalente exista ou não uma conta cadastrada com o e-mail informado.

Quando a recuperação de senha estiver habilitada no ambiente:

1. o backend procura a conta correspondente ao e-mail;
2. se a conta existir, gera um token temporário e criptograficamente aleatório;
3. invalida todos os tokens anteriores ainda válidos desse usuário;
4. armazena somente o hash do novo token;
5. define a expiração para 30 minutos após a criação;
6. envia ao usuário um link para redefinição da senha;
7. o link utiliza o valor configurado em `APP_URL`.

A funcionalidade de recuperação de senha depende da configuração do ambiente.

Quando não estiver disponível:

- a opção “Esqueci minha senha” não deve ser exibida na tela de login;
- o acesso direto a /forgot-password deve informar que a recuperação de senha não está disponível naquele ambiente, sem apresentar formulário funcional.

A disponibilidade dessa funcionalidade deve ser controlada por configuração.

Com `PASSWORD_RESET_ENABLED=false`, este endpoint deve retornar `403 Forbidden` com
mensagem de indisponibilidade, sem executar o fluxo de solicitação e independentemente
de existir uma conta associada ao e-mail.

Se a conta existir, mas ocorrer uma falha operacional no envio pela Brevo, a resposta
pública deve permanecer genérica e indistinguível da resposta utilizada para um e-mail
sem conta associada. A falha deve ser registrada internamente sem incluir token, senha,
chave de API ou outros dados sensíveis.

Erros:

- `403 Forbidden` — recuperação de senha indisponível neste ambiente;
- `429 Too Many Requests` — limite de solicitações de recuperação excedido.

#### POST /api/auth/reset-password

Redefine a senha utilizando um token válido de recuperação.

Com `PASSWORD_RESET_ENABLED=false`, deve retornar `403 Forbidden` com mensagem de
indisponibilidade, sem executar a redefinição, inclusive quando o token tiver sido
emitido anteriormente e ainda não tiver expirado. Isso independe da existência da
conta. A desabilitação impede o uso do token enquanto vigorar, sem determinar por si
só sua invalidação permanente.

Corpo:

```json
{
  "token": "token-recebido",
  "newPassword": "nova-senha"
}
```

Regras:

- o token deve ser válido;
- o token não pode estar expirado;
- o token não pode ter sido utilizado anteriormente;
- a nova senha deve obedecer à política de senha definida nesta especificação;
- a nova senha deve ser armazenada somente após geração de novo hash;
- após a redefinição bem-sucedida, todos os tokens ainda válidos da conta devem ser
  invalidados, incluindo o utilizado, conforme a seção 6.3;
- o consumo do token deve respeitar o uso único inclusive em tentativas simultâneas.

Resposta de sucesso — `204 No Content`.

Erros:

- `400 Bad Request` — token inválido, expirado, já utilizado ou nova senha inválida;
- `403 Forbidden` — recuperação de senha indisponível neste ambiente;
- `429 Too Many Requests` — limite de tentativas de redefinição excedido.

---

### 9.3 Conta do usuário autenticado

Todas as rotas desta seção exigem JWT válido.

#### GET /api/users/me

Retorna os dados públicos da conta autenticada.

Resposta de sucesso — `200 OK`:

```json
{
  "id": "uuid",
  "name": "Ana",
  "email": "ana@teste.dev",
  "role": "user"
}
```

A resposta nunca deve conter `passwordHash`.

#### PATCH /api/users/me

Altera os dados do perfil do usuário autenticado.

Corpo de exemplo:

```json
{
  "name": "Ana Silva",
  "email": "ana.silva@teste.dev"
}
```

Regras:

- os campos `name` e `email` são opcionais;
- somente `name` e `email` podem ser alterados por esta rota;
- o e-mail deve possuir formato válido;
- o e-mail deve permanecer único;
- ao alterar o e-mail, o novo endereço passa a ser utilizado nos próximos logins;
- `role` não pode ser alterada por esta rota;
- a alteração bem-sucedida de e-mail invalida os tokens pendentes de recuperação
  conforme a seção 6.3;
- senha não é alterada por esta rota;
- campos não permitidos devem ser rejeitados.

Resposta de sucesso — `200 OK`:

```json
{
  "id": "uuid",
  "name": "Ana Silva",
  "email": "ana.silva@teste.dev",
  "role": "user"
}
```

Erros:

- `400 Bad Request` — dados inválidos ou campo não permitido;
- `409 Conflict` — e-mail já utilizado por outra conta.

#### PATCH /api/users/me/password

Altera a senha do usuário autenticado.

Corpo:

```json
{
  "currentPassword": "senha-atual",
  "newPassword": "nova-senha"
}
```

Regras:

- a senha atual deve ser confirmada;
- a nova senha deve obedecer à política de senha definida nesta especificação;
- a nova senha deve ser armazenada somente após geração de novo hash;
- a senha atual nunca deve ser armazenada nem retornada.

Após a troca bem-sucedida, os tokens pendentes de recuperação devem ser invalidados
conforme a seção 6.3.

Resposta de sucesso — `204 No Content`.

Erros:

- `400 Bad Request` — corpo inválido, senha atual incorreta ou nova senha inválida.

#### DELETE /api/users/me

Exclui definitivamente a própria conta.

Corpo:

```json
{
  "password": "senha-atual"
}
```

Regras:

- a interface deve exigir confirmação explícita antes da requisição;
- o usuário deve informar sua senha atual;
- a senha deve ser validada antes da exclusão;
- a exclusão é definitiva;
- todas as transcrições pertencentes à conta devem ser excluídas;
- tokens de recuperação de senha pertencentes à conta também devem ser excluídos;
- se a conta pertencer ao único administrador existente, a exclusão deve ser rejeitada.

Resposta de sucesso — `204 No Content`.

Erros:

- `400 Bad Request` — corpo inválido ou senha atual incorreta;
- `409 Conflict` — tentativa de excluir o último administrador.

---

### 9.4 Transcrições

Todas as rotas desta seção exigem JWT válido.

#### POST /api/transcriptions

Cria uma nova transcrição.

Formato:

`multipart/form-data`

Campos:

- `file` — arquivo de áudio;
- `language` — obrigatório; código de idioma ISO 639-1 válido, como `pt`, `en` ou `es`.

O DTO deve validar a obrigatoriedade e a validade do código ISO 639-1, não apenas a
quantidade de letras. Os exemplos não constituem uma lista fechada de idiomas
suportados. Ausência ou valor inválido deve resultar em `400 Bad Request`.

Formatos de áudio aceitos:

- `mp3`;
- `m4a`;
- `wav`;
- `ogg`;
- `webm`;
- `flac`;
- `mp4`;
- `mpeg`.

O tamanho máximo do arquivo é de 25 MB, correspondente ao limite utilizado pela
integração com a Groq.

O backend deve:

1. validar o JWT;
2. identificar o usuário autenticado e confirmar que sua conta ainda existe; caso
   contrário, retornar `401` sem executar regras de negócio ou chamar a Groq;
3. validar a existência do arquivo;
4. validar o formato do arquivo;
5. validar o tamanho do arquivo;
6. validar `language` e enviar seu valor junto com o áudio à API da Groq;
7. receber o texto transcrito;
8. criar a transcrição associada ao usuário autenticado, persistindo `language` e
   devolvendo-o nas respostas previstas;
9. armazenar os dados da transcrição no PostgreSQL;
10. não armazenar permanentemente o arquivo de áudio original.

Resposta de sucesso — `201 Created`:

```json
{
  "id": "uuid",
  "text": "Texto transcrito...",
  "originalFilename": "teste.ogg",
  "language": "pt",
  "createdAt": "2026-10-04T20:00:00Z"
}
```

A resposta não precisa expor `userId`, pois o proprietário é determinado pelo usuário autenticado.

Erros:

- `400 Bad Request` — arquivo ausente, formato não aceito ou dados inválidos;
- `401 Unauthorized` — autenticação ausente, inválida ou expirada, ou conta associada
  ao JWT inexistente;
- `413 Payload Too Large` — arquivo acima do limite permitido;
- `429 Too Many Requests` — limite de solicitações de transcrição excedido;
- `502 Bad Gateway` — falha na comunicação ou processamento pela Groq.

#### GET /api/transcriptions

Lista as transcrições pertencentes ao usuário autenticado.

Nenhuma transcrição pertencente a outro usuário pode ser retornada.

As transcrições devem ser retornadas em ordem decrescente de `createdAt`, da mais
recente para a mais antiga.

Resposta de sucesso — `200 OK`:

```json
[
  {
    "id": "uuid",
    "text": "Texto transcrito...",
    "originalFilename": "teste.ogg",
    "language": "pt",
    "createdAt": "2026-10-04T20:00:00Z"
  }
]
```

Caso o usuário ainda não possua transcrições, a resposta deve ser:

```json
[]
```

#### GET /api/transcriptions/:id

Retorna uma transcrição específica pertencente ao usuário autenticado.

Resposta de sucesso — `200 OK`:

```json
{
  "id": "uuid",
  "text": "Texto transcrito...",
  "originalFilename": "teste.ogg",
  "language": "pt",
  "createdAt": "2026-10-04T20:00:00Z"
}
```

Erros:

- `404 Not Found` — transcrição inexistente ou pertencente a outro usuário.

A API não deve revelar se determinado identificador corresponde a uma transcrição de outro usuário.

#### DELETE /api/transcriptions/:id

Exclui uma transcrição pertencente ao usuário autenticado.

Resposta de sucesso — `204 No Content`.

Erros:

- `404 Not Found` — transcrição inexistente ou pertencente a outro usuário.

---

### 9.5 Administração de usuários

Todas as rotas desta seção exigem JWT válido e `role = admin`.

Um usuário autenticado sem papel administrativo deve receber `403 Forbidden`.

As operações administrativas de alteração e exclusão destinam-se somente ao
gerenciamento de outras contas. Um administrador deve gerenciar a própria conta
exclusivamente pelas rotas `/api/users/me`.

Em `PATCH /api/users/:id` e `DELETE /api/users/:id`, a tentativa de um administrador
operar sobre a própria conta deve ser rejeitada com `403` antes da aplicação da regra
do último administrador. A invariável de não deixar o sistema sem administrador
permanece. A autoexclusão legítima por `DELETE /api/users/me` continua retornando `409`
quando a conta pertencer ao único administrador.

#### GET /api/users

Lista as contas cadastradas na aplicação.

Resposta de sucesso — `200 OK`:

```json
[
  {
    "id": "uuid",
    "name": "Ana",
    "email": "ana@teste.dev",
    "role": "user",
    "createdAt": "2026-10-04T20:00:00Z",
    "updatedAt": "2026-10-04T20:00:00Z"
  }
]
```

Nenhum item da resposta pode conter `passwordHash`.

#### GET /api/users/:id

Retorna os dados públicos de uma conta específica.

Resposta de sucesso — `200 OK`:

```json
{
  "id": "uuid",
  "name": "Ana",
  "email": "ana@teste.dev",
  "role": "user",
  "createdAt": "2026-10-04T20:00:00Z",
  "updatedAt": "2026-10-04T20:00:00Z"
}
```

Erros:

- `403 Forbidden` — usuário autenticado sem papel administrativo;
- `404 Not Found` — usuário inexistente.

A resposta nunca deve conter `passwordHash`.

#### PATCH /api/users/:id

Altera administrativamente uma conta.

Corpo de exemplo:

```json
{
  "name": "Ana Silva",
  "email": "ana.silva@teste.dev",
  "role": "admin"
}
```

Os campos são opcionais.

Campos permitidos:

- `name`;
- `email`;
- `role`.

Regras:

- somente administradores podem utilizar esta rota;
- `email` deve possuir formato válido;
- `email` deve permanecer único;
- `role` somente pode assumir `user` ou `admin`;
- a alteração bem-sucedida de e-mail invalida os tokens pendentes de recuperação da
  conta alterada, conforme a seção 6.3;
- um administrador não pode alterar a própria conta por esta rota;
- uma operação não pode deixar o sistema sem nenhum administrador;
- campos não permitidos devem ser rejeitados.

Resposta de sucesso — `200 OK`:

```json
{
  "id": "uuid",
  "name": "Ana Silva",
  "email": "ana.silva@teste.dev",
  "role": "admin",
  "createdAt": "2026-10-04T20:00:00Z",
  "updatedAt": "2026-10-04T20:00:00Z"
}
```

Erros:

- `400 Bad Request` — dados inválidos ou campos não permitidos;
- `403 Forbidden` — usuário sem papel administrativo ou tentativa de alterar a própria conta;
- `404 Not Found` — conta inexistente;
- `409 Conflict` — e-mail já utilizado ou operação que removeria o último administrador.

#### DELETE /api/users/:id

Exclui definitivamente uma conta.

Regras:

- somente administradores podem utilizar esta rota;
- a exclusão remove também todas as transcrições pertencentes à conta;
- tokens de recuperação de senha pertencentes à conta também devem ser excluídos;
- um administrador não pode excluir a própria conta por esta rota e deve utilizar
  `DELETE /api/users/me` para essa finalidade;
- a operação não pode deixar o sistema sem nenhum administrador.

Resposta de sucesso — `204 No Content`.

Erros:

- `403 Forbidden` — usuário sem papel administrativo ou tentativa de autoexclusão pela rota administrativa;
- `404 Not Found` — conta inexistente;
- `409 Conflict` — tentativa de remover o último administrador.

---

## 10. Telas e rotas do frontend

O frontend deve utilizar as rotas desta seção para organizar as telas públicas, a área
autenticada e a área administrativa.

As proteções de rota no frontend orientam a navegação e impedem a exibição indevida de
conteúdo, mas não substituem a autenticação e a autorização realizadas pelo backend.

### 10.1 Regras gerais de navegação

- a landing page permanece acessível a visitantes e usuários autenticados;
- `/login`, `/register`, `/forgot-password` e `/reset-password` são rotas públicas;
- qualquer rota iniciada por `/app` exige uma sessão autenticada válida;
- um usuário sem sessão válida que tente acessar `/app` ou qualquer subrota deve ser
  direcionado para `/login`;
- `/app/admin` e suas subrotas exigem, além da autenticação, `role = admin`;
- um usuário comum não pode visualizar conteúdo administrativo;
- administradores podem utilizar normalmente todas as telas comuns da área autenticada.

O frontend deve consultar `GET /api/config/public` para identificar as capacidades
públicas disponíveis. O valor de `passwordResetEnabled` deve controlar a apresentação
da ação "Esqueci minha senha" e o estado da rota `/forgot-password`.

A rota `/reset-password` também deve respeitar essa disponibilidade, conforme a seção
9.2.

### 10.2 Rotas públicas

#### /

Exibe a landing page pública.

Para visitantes, deve apresentar ações claras para:

- entrar;
- criar uma conta.

Para usuários autenticados, deve apresentar uma ação clara para acessar `/app`. O
usuário autenticado não deve ser redirecionado automaticamente para a área interna.

#### /login

Exibe o formulário de autenticação por e-mail e senha.

Após uma autenticação bem-sucedida, o usuário deve ser direcionado para `/app`.

Se o usuário já estiver autenticado, deve ser direcionado para `/app`.

Quando `passwordResetEnabled` for `true`, a tela deve apresentar uma ação para
`/forgot-password`. Quando for `false`, essa opção não deve ser promovida.

#### /register

Exibe o formulário de criação de conta com nome, e-mail e senha.

A senha deve obedecer à política definida na seção 7, e o formulário não pode permitir
a definição de `role`.

Após o cadastro, a interface deve apresentar o resultado da operação e permitir que o
usuário prossiga para o login.

Se o usuário já estiver autenticado, deve ser direcionado para `/app`.

#### /forgot-password

Quando `passwordResetEnabled` for `true`, exibe o formulário para solicitar o envio das
instruções por e-mail.

Após a solicitação, a interface deve utilizar uma mensagem equivalente exista ou não
uma conta associada ao e-mail, conforme definido na seção 9.

Quando `passwordResetEnabled` for `false`, a rota deve continuar acessível por acesso
direto e apresentar uma informação clara de indisponibilidade. Nesse estado, não deve
apresentar um formulário funcional nem uma página quebrada.

#### /reset-password

O link de recuperação deve passar o token como query parameter:

`/reset-password?token=<token>`

A tela deve obter `token` da URL e enviá-lo ao endpoint
`POST /api/auth/reset-password` junto com `newPassword`.

A nova senha deve obedecer à política definida na seção 7. Quando a redefinição for
concluída, a interface deve apresentar o sucesso e oferecer acesso ao login.

Tokens inválidos, expirados ou já utilizados devem resultar em um estado de erro claro,
sem apresentar a redefinição como concluída.

Quando `passwordResetEnabled` for `false`, a tela deve informar indisponibilidade e não
apresentar formulário funcional, mesmo que a URL contenha um token anteriormente
válido. As telas de solicitação e redefinição também devem apresentar a indisponibilidade
indicada por `403` da API, sem tratá-lo como motivo para encerrar uma sessão.

### 10.3 Área autenticada

#### /app

É a página principal da área interna e deve priorizar a criação de uma transcrição.

Deve apresentar:

- seleção ou upload do arquivo de áudio;
- escolha obrigatória do idioma, enviada como `language` em código ISO 639-1 válido,
  conforme a seção 9.4;
- ação para iniciar a transcrição;
- feedback durante o envio e o processamento;
- mensagem de erro quando a transcrição não puder ser concluída;
- a transcrição recém-gerada após o sucesso;
- uma seção com as cinco transcrições mais recentes do usuário, ordenadas por
  `createdAt` decrescente;
- uma ação para acessar `/app/history`.

Os formatos aceitos, o limite de tamanho e os erros devem seguir o contrato da seção 9.

O histórico completo não deve ser exibido em `/app`.

#### /app/history

Exibe o histórico completo de transcrições do usuário autenticado.

Deve permitir:

- abrir uma transcrição em `/app/transcriptions/:id`;
- excluir uma transcrição após confirmação explícita.

Quando o usuário ainda não possuir transcrições, deve apresentar um estado vazio claro.

#### /app/transcriptions/:id

Exibe os dados completos da transcrição selecionada pertencente ao usuário autenticado.

Deve permitir a exclusão da transcrição após confirmação explícita.

Quando a transcrição não existir ou não pertencer ao usuário autenticado, a tela deve
apresentar um estado de recurso não encontrado, sem revelar a existência nem qualquer
dado de uma transcrição pertencente a outro usuário.

#### /app/profile

Reúne o gerenciamento da própria conta e deve permitir:

- visualizar nome, e-mail e `role`;
- alterar nome e e-mail;
- alterar a senha mediante confirmação da senha atual;
- excluir definitivamente a própria conta.

A alteração da senha deve utilizar a política definida na seção 7.

A exclusão da conta deve ser apresentada como ação destrutiva, exigir confirmação
explícita e solicitar a senha atual. A interface deve apresentar os conflitos previstos
na seção 9, incluindo a impossibilidade de excluir a conta do último administrador.

### 10.4 Área administrativa

As telas administrativas devem estar disponíveis somente para usuários com
`role = admin`. A navegação e as proteções de rota não devem renderizar dados ou ações
administrativas para usuários comuns.

#### /app/admin

Exibe a lista de usuários cadastrados e permite navegar para
`/app/admin/users/:id` para visualizar uma conta específica e, quando pertencer a
outro usuário, gerenciá-la.

A própria conta do administrador pode permanecer visível nessa lista.

Nenhuma informação de senha pode ser exibida.

#### /app/admin/users/:id

Exibe os dados públicos da conta selecionada.

Quando a conta pertencer a outro usuário, permite, conforme as regras da seção 9:

- alterar nome e e-mail;
- alterar `role` entre `user` e `admin`;
- excluir a conta.

A mudança de `role` e a exclusão devem exigir confirmação explícita. A exclusão deve
ser apresentada como ação destrutiva.

Quando a conta selecionada for a do próprio administrador, a tela não deve oferecer
ações administrativas de edição, mudança de `role` ou exclusão e deve orientá-lo a
utilizar `/app/profile`.

As operações sobre outras contas devem respeitar a proteção do último administrador.
Conflitos e operações não permitidas devem ser apresentados claramente sem contornar
as respostas da API.

### 10.5 Navegação e estados da interface

A navegação da área autenticada deve oferecer acesso claro a:

- início;
- histórico;
- perfil;
- administração, somente quando o usuário possuir `role = admin`;
- logout.

A ação de logout deve encerrar a sessão mantida no navegador e direcionar o usuário
para `/login`.

Todas as telas devem ser responsivas e apresentar, quando aplicável, estados claros de:

- carregamento;
- sucesso;
- erro;
- ausência de dados;
- confirmação para ações destrutivas.

---

## 11. Estado e comunicação do frontend

O frontend deve separar o estado local da sessão dos dados originados do servidor e
centralizar a comunicação HTTP e o tratamento global de autenticação.

### 11.1 Axios e comunicação HTTP

Todas as chamadas HTTP do frontend devem utilizar uma única instância do Axios.

Essa instância deve:

- utilizar caminhos relativos iniciados por `/api`;
- evitar URLs absolutas do backend espalhadas pelas páginas;
- acrescentar `Authorization: Bearer <token>` por meio de um interceptor de requisição
  quando existir uma sessão autenticada;
- tratar, por meio de um interceptor de resposta, respostas `401 Unauthorized`
  recebidas de rotas protegidas.

Uma resposta `401 Unauthorized` de uma rota protegida representa uma sessão ausente,
inválida ou expirada, inclusive quando a conta associada ao JWT não existe mais. Nesse
caso, o frontend deve:

1. remover os dados da sessão mantidos no estado;
2. remover os dados persistidos da sessão;
3. descartar os dados privados mantidos em cache;
4. direcionar o usuário para `/login`.

Uma resposta `401 Unauthorized` do endpoint de login representa credenciais inválidas.
Ela deve ser tratada como erro da tentativa de login e não deve acionar a lógica global
de limpeza de uma sessão existente. Uma tentativa de login malsucedida não pode criar
uma sessão.

### 11.2 Zustand e sessão

Zustand deve armazenar o estado de cliente referente à sessão:

- `user`;
- `accessToken`.

A sessão deve ser persistida em `localStorage` para permanecer disponível após o
recarregamento da página, conforme a arquitetura adotada para esta aula.

Após um login bem-sucedido, o frontend deve armazenar o usuário e o token no estado e
no armazenamento persistido.

O logout deve remover o usuário e o token do estado e do armazenamento persistido,
além de descartar os dados privados mantidos em cache.

A `role` armazenada no frontend deve servir somente para orientar a interface e não
substitui a autorização realizada pelo backend.

O JWT contém o identificador e a `role` do usuário. Ainda assim, nas operações que
exigem `role = admin`, o backend deve considerar a `role` atual da conta e não depender
exclusivamente de uma `role` potencialmente obsoleta presente no JWT ou no estado local
do frontend.

### 11.3 Restauração e atualização da sessão

Ao iniciar a aplicação, quando existirem dados persistidos de sessão, o frontend deve
restaurar o token e os dados do usuário armazenados.

Antes de considerar a área autenticada pronta para uso, o frontend deve sincronizar os
dados atuais da conta com `GET /api/users/me`, evitando que a interface dependa de dados
antigos persistidos no navegador.

Enquanto essa verificação inicial estiver pendente, nenhum conteúdo protegido deve ser
exibido.

Se essa sincronização retornar `401 Unauthorized`, a sessão deve ser encerrada conforme
o tratamento global definido nesta seção.

Quando a sincronização for bem-sucedida, o frontend deve atualizar `user` no estado e
no armazenamento persistido caso `name`, `email` ou `role` tenham mudado.

Falha de rede ou resposta `5xx` nessa verificação não representa sessão inválida. Nesses
casos, o frontend deve preservar a sessão persistida, manter o conteúdo protegido
bloqueado, apresentar erro e permitir nova tentativa. Esta especificação não exige
uma política de retries automáticos.

Após uma alteração bem-sucedida do próprio nome ou e-mail, os dados do usuário mantidos
e exibidos pela interface devem ser atualizados com a resposta da API.

Mudanças de `role` realizadas administrativamente em outra conta devem ser respeitadas
pelo backend independentemente do JWT ou do estado que o navegador desse outro usuário
mantenha em cache.

### 11.4 TanStack Query

TanStack Query deve ser utilizado para o estado originado do servidor, incluindo,
conforme aplicável:

- configuração pública;
- transcrições;
- dados de usuários utilizados na administração;
- detalhes obtidos da API.

Zustand não deve ser utilizado como substituto do cache de dados do servidor.

As atualizações do cache devem seguir estas regras:

- após criar uma transcrição, atualizar ou invalidar os dados relacionados às
  transcrições para que `/app` e `/app/history` reflitam o novo registro;
- após excluir uma transcrição, remover, atualizar ou invalidar os dados
  correspondentes;
- após alterações administrativas em uma conta, atualizar ou invalidar a lista de
  usuários e o detalhe afetado;
- após uma exclusão administrativa, remover ou invalidar os dados da conta excluída;
- após alterações do próprio perfil, sincronizar os dados exibidos com a resposta da
  API;
- tratar `GET /api/config/public` como dado público originado do servidor.

Não devem ser definidos tempos arbitrários de cache quando não forem necessários para
o comportamento funcional.

### 11.5 Proteção de rotas

As proteções de rota devem utilizar o estado da sessão para orientar a navegação.

Regras:

- `/app/*` exige um usuário autenticado;
- `/app/admin/*` exige um usuário autenticado com `role = admin`;
- durante a restauração inicial da sessão, a interface não deve apresentar conteúdo
  protegido antes de determinar o estado de autenticação;
- falha de rede ou `5xx` na verificação inicial mantém o bloqueio e segue o tratamento
  da seção 11.3, sem apagar a sessão;
- as proteções do frontend não substituem Guards nem a autorização do backend.

### 11.6 Encerramento da sessão e exclusão da própria conta

O logout deve limpar a sessão, remover os dados privados mantidos em cache e direcionar
o usuário para `/login`, conforme definido na seção 10.

Após a exclusão bem-sucedida da própria conta, o frontend deve remover a sessão e todos
os dados privados locais, pois a conta deixa de existir.

### 11.7 Tratamento de estados

As operações assíncronas devem permitir que as telas apresentem os estados definidos na
seção 10:

- carregamento;
- sucesso;
- erro;
- ausência de dados.

Os erros da API devem ser tratados de forma consistente. A lógica global de
autenticação não deve ser duplicada em cada página.

A interface deve interpretar o status HTTP e `message` conforme o contrato mínimo de
erros da seção 9, aceitando mensagem única ou lista de mensagens de validação, sem
depender de detalhes internos ou do campo opcional `error`.

---

## 12. Validação e segurança

As regras desta seção complementam os contratos e fluxos definidos anteriormente. A
segurança deve ser aplicada principalmente pelo backend e de forma centralizada sempre
que possível.

### 12.1 Validação de entrada e DTOs

Todo dado recebido pelo backend deve ser validado antes de chegar às regras de negócio.

Cada endpoint deve utilizar DTOs específicos para seu contrato de entrada. DTOs,
entidades de persistência e objetos de resposta possuem responsabilidades diferentes e
não devem ser tratados como a mesma estrutura.

O backend deve utilizar validação global com `class-validator` e `class-transformer`,
com o seguinte comportamento:

- `whitelist` habilitada;
- rejeição de campos não declarados nos DTOs, correspondente a
  `forbidNonWhitelisted` habilitado;
- transformação habilitada;
- conversões permitidas realizadas de forma controlada.

Regras críticas devem ser validadas no backend mesmo quando o frontend já tiver
realizado validação. O frontend pode validar formulários para melhorar a experiência do
usuário, mas nunca é a autoridade final sobre a validade dos dados.

Na criação de transcrição, o DTO deve validar `language` conforme a seção 9.4, sem
introduzir uma enumeração própria de idiomas suportados.

### 12.2 Normalização e validação dos dados textuais

O nome deve ter espaços externos desnecessários removidos antes da validação e
persistência e deve ser rejeitado quando permanecer vazio após essa normalização. Além
da remoção dos espaços externos, o backend não deve alterar arbitrariamente
capitalização, espaçamento interno ou outras características do nome informado pelo
usuário.

O e-mail deve ser normalizado de forma determinística por meio das seguintes etapas:

1. remover espaços externos;
2. converter o endereço para letras minúsculas.

Essa normalização deve ser aplicada antes da validação de formato, busca, comparação de
unicidade e persistência. A mesma regra deve ser utilizada no cadastro, login,
alteração de perfil e recuperação de senha, impedindo que diferenças apenas de
capitalização permitam duas contas com o mesmo endereço.

### 12.3 Senhas

Cadastro, alteração autenticada de senha, redefinição por token e bootstrap do primeiro
administrador devem utilizar exatamente a política de senha definida na seção 7.

Regras de proteção:

- senhas nunca podem ser armazenadas em texto puro;
- `bcryptjs` deve ser utilizado para gerar e comparar hashes de senha;
- o fator de custo do bcrypt deve utilizar `BCRYPT_ROUNDS`, conforme definido na seção
  13;
- o limite de 72 bytes em UTF-8 deve ser validado antes do processamento pelo bcrypt;
- `passwordHash` nunca pode ser retornado pela API;
- senha de cadastro, senha atual e nova senha nunca podem aparecer em respostas ou
  logs;
- DTOs e objetos de saída não devem reutilizar diretamente a entidade `User` quando
  isso puder expor `passwordHash` ou outros campos internos.

Nenhum requisito de composição adicional deve ser aplicado além da política definida
na seção 7.

### 12.4 Autenticação e autorização

A autenticação deve continuar utilizando exclusivamente JWT, conforme definido na
seção 7.

Regras:

- `JWT_SECRET` deve existir somente no backend e nunca pode ser versionado ou enviado
  ao frontend;
- os tokens JWT devem possuir prazo de validade configurável;
- rotas protegidas devem ser validadas por Guards no backend;
- a conta associada ao JWT deve existir antes de qualquer regra de negócio da operação;
  sua inexistência resulta em `401` sem chamada a serviços externos, conforme a seção 7;
- a proteção de rotas no frontend serve apenas para orientar a interface e não
  substitui a autorização do backend;
- permissões administrativas devem considerar a `role` atual da conta, conforme
  definido na seção 11;
- nenhuma autorização pode confiar apenas em `role`, `userId` ou outros dados enviados
  pelo cliente;
- o proprietário de uma transcrição deve ser determinado a partir do usuário
  autenticado;
- tentativas de acessar uma transcrição de outro usuário devem continuar retornando
  `404 Not Found`, sem revelar a existência do recurso.

Esta versão não utiliza refresh token nem outro mecanismo adicional de autenticação.

O backend deve configurar CORS de acordo com o ambiente. Somente origens previstas para
a aplicação devem ser aceitas, evitando a origem curinga (`*`) quando ela não for
necessária. Em desenvolvimento, deve ser permitida a origem utilizada pelo frontend
Vite. A URL concreta de produção deve ser definida posteriormente pela configuração do
ambiente.

### 12.5 Upload de áudio

O arquivo de áudio é obrigatório e deve ser validado pelo backend independentemente das
validações realizadas no frontend.

Somente os formatos definidos no contrato de `POST /api/transcriptions`, na seção 9.4,
são aceitos.

O tamanho máximo permitido nesta versão é de 25 MB. Arquivos acima desse limite devem
resultar em `413 Payload Too Large`. Arquivos ausentes ou com formato não permitido
devem resultar em `400 Bad Request`.

Extensão, tipo informado e metadados disponíveis devem ser avaliados de forma
consistente e não podem ser tratados isoladamente como prova absoluta de que um arquivo
é seguro.

O arquivo deve ser utilizado somente durante o processamento necessário à transcrição
e não pode ser armazenado permanentemente.

O nome original não pode ser utilizado de forma insegura para construir caminhos no
servidor. O campo `originalFilename` deve representar apenas informação de apresentação
e não um caminho confiável do sistema.

### 12.6 Segredos e configuração sensível

`GROQ_API_KEY`, `JWT_SECRET`, credenciais da Brevo, senha inicial do administrador e
quaisquer outros segredos pertencem exclusivamente ao backend.

Segredos:

- não podem ser enviados ao frontend;
- não podem ser definidos diretamente no código-fonte;
- não podem aparecer em logs ou mensagens de erro;
- seus valores reais não podem ser incluídos no arquivo `.env.example`.

Os registros internos de diagnóstico devem seguir a sanitização definida na seção
12.9, inclusive quanto a JWTs e demais credenciais.

O arquivo `.env` real não deve ser versionado. O arquivo `.env.example` deve conter os
nomes das variáveis necessárias, inclusive daquelas que receberão segredos, mas somente
com valores de exemplo não sensíveis e nunca com valores secretos reais.

Caso uma credencial real seja publicada acidentalmente, ela deve ser revogada e
substituída. Apenas removê-la do estado atual do arquivo ou do histórico não torna a
credencial novamente segura.

A lista completa de variáveis de ambiente será definida na seção específica de
configuração.

### 12.7 Recuperação de senha

O fluxo de recuperação permanece conforme definido nas seções 6, 7, 9 e 10.

Regras de segurança:

- a resposta de `POST /api/auth/forgot-password` deve permanecer indistinguível para
  e-mail existente ou inexistente;
- o token deve ser criptograficamente aleatório;
- somente o hash do token pode ser persistido;
- o token original não pode aparecer em logs;
- o token deve expirar 30 minutos após sua criação;
- o token deve ser de uso único inclusive contra tentativas simultâneas, conforme a
  seção 6.3; o mecanismo concreto deve ser escolhido no Plan da etapa correspondente,
  sem exigir infraestrutura adicional;
- uma nova solicitação deve invalidar tokens anteriores ainda válidos do mesmo usuário;
- alterações bem-sucedidas de senha ou e-mail devem invalidar tokens pendentes nos
  casos definidos na seção 6.3;
- `POST /api/auth/reset-password` deve rejeitar tokens inválidos, expirados ou já
  utilizados;
- a recuperação deve permanecer dependente da configuração do ambiente;
- com a funcionalidade desabilitada, os dois endpoints devem respeitar o `403` e o
  bloqueio dos fluxos definidos na seção 9.2;
- `APP_URL` deve ser utilizada somente para construir o link previsto no fluxo;
- credenciais da Brevo nunca podem ser expostas ao frontend.

O comportamento público em caso de falha da Brevo deve seguir a seção 9.2. A falha
operacional deve ser registrada internamente sem registrar token, senha, chave de API
ou outros dados sensíveis, conforme a seção 12.9.

### 12.8 Proteção contra abuso

O backend deve aplicar rate limiting a rotas sensíveis para reduzir tentativas
automatizadas, brute force e abuso do envio de e-mails.

Essa proteção deve abranger pelo menos:

- `POST /api/auth/register`;
- `POST /api/auth/login`;
- `POST /api/auth/forgot-password`;
- `POST /api/auth/reset-password`;
- `POST /api/transcriptions`.

A identificação utilizada por cada limite deve seguir estas regras:

- login: utilizar um único contador por combinação entre origem da requisição e e-mail
  normalizado, não dois limitadores independentes;
- cadastro: considerar a origem da requisição;
- recuperação de senha: utilizar um único contador por combinação entre origem da
  requisição e e-mail normalizado; contas existentes e inexistentes devem consumir o
  limite da mesma maneira;
- redefinição de senha: considerar a origem da requisição;
- transcrição: considerar o `userId` do usuário autenticado, pois a operação utiliza a
  cota de um serviço externo.

Os limites devem ser configuráveis e suficientemente restritivos para cumprir essa
finalidade, sem impedir o uso legítimo. Esta seção não define valores fixos nem exige
uma biblioteca específica; a implementação deve ser compatível com NestJS e com a
arquitetura existente. Os limites e seus valores padrão serão definidos na seção 13 por
configuração de ambiente.

### 12.9 Respostas, erros e exposição de dados

As respostas da API devem expor somente os campos previstos no contrato.

Regras:

- `passwordHash` nunca pode sair do backend;
- entidades do banco não devem ser retornadas diretamente quando isso puder expor
  campos internos;
- erros enviados ao cliente não podem incluir stack traces, segredos, consultas SQL,
  detalhes internos do servidor ou respostas brutas de serviços externos;
- falhas da Groq devem continuar sendo representadas pelo contrato público da API, sem
  revelar chaves ou detalhes sensíveis da integração;
- mensagens de recuperação de senha não podem revelar a existência de contas;
- respostas de autorização não podem revelar recursos pertencentes a outros usuários;
- mensagens de erro devem permanecer úteis para a interface sem expor informações
  internas.

O corpo público dos erros deve seguir o contrato mínimo definido na seção 9.

Logs internos podem conter informação técnica necessária ao diagnóstico, incluindo
stack traces ou SQL quando sanitizados. Não podem registrar senhas, JWTs, tokens de
recuperação, `passwordHash`, chaves, segredos, demais credenciais ou parâmetros
sensíveis, mesmo para diagnóstico. Essa permissão não se aplica às respostas públicas.

### 12.10 Conteúdo não confiável e frontend

Nomes de usuários, nomes de arquivos e textos de transcrições devem ser tratados como
conteúdo não confiável.

O frontend não deve inserir esses valores como HTML arbitrário nem utilizar renderização
de HTML não sanitizado. A aplicação deve preservar o escaping normal do React ao exibir
transcrições, nomes de usuários e nomes de arquivos.

Não deve ser introduzido editor HTML ou sanitizador quando não houver necessidade para
o comportamento definido nesta especificação.

### 12.11 Princípios gerais

- a segurança não pode depender apenas do frontend;
- validação, autenticação, autorização e regras de propriedade são responsabilidades
  do backend;
- o princípio do menor privilégio deve orientar as permissões;
- nenhuma credencial sensível pode ser enviada ao frontend;
- requisitos de segurança devem ser aplicados de forma centralizada sempre que
  possível, evitando lógica duplicada entre controllers e páginas.

---

## 13. Configuração por ambiente

Esta seção define as variáveis de ambiente utilizadas pelo backend e os valores padrão
adotados nesta versão.

### 13.1 Princípios gerais

A configuração de runtime do backend deve ser fornecida por variáveis de ambiente.

O arquivo `backend/.env` deve conter os valores reais utilizados no desenvolvimento e
não pode ser versionado. O arquivo `backend/.env.example` deve ser versionado e
documentar todas as variáveis esperadas.

O arquivo de exemplo pode conter valores padrão não sensíveis ou valores locais
claramente fictícios. Variáveis que recebem segredos devem aparecer pelo nome, mas
nunca podem conter credenciais reais. Quando não houver um exemplo seguro e útil, seu
valor deve permanecer vazio.

Nenhuma configuração secreta deve existir no frontend. A aplicação frontend deve
continuar utilizando caminhos relativos iniciados por `/api` e, nesta versão, não deve
necessitar de arquivo `.env` próprio para acessar o backend ou descobrir capacidades
públicas.

`GET /api/config/public` permanece como a fonte da capacidade pública
`passwordResetEnabled`.

### 13.2 Configuração básica do backend

#### NODE_ENV

Define o ambiente de execução.

Valores aceitos nesta versão:

- `development`;
- `test`;
- `production`.

#### PORT

Define a porta HTTP do NestJS. O valor padrão de desenvolvimento é `3000`.

#### APP_URL

Define a URL pública do frontend e é utilizada principalmente para construir links de
recuperação de senha.

O valor de desenvolvimento é:

`http://localhost:5173`

Essa variável não contém segredo. Ela é obrigatória e deve representar uma URL válida
quando a recuperação de senha estiver habilitada.

#### CORS_ORIGINS

Define as origens aceitas pelo CORS como uma lista separada por vírgulas. Cada item deve
ter espaços externos removidos e representar uma origem válida.

Em desenvolvimento, a lista deve incluir:

`http://localhost:5173`

O valor padrão não deve utilizar origem curinga (`*`). A URL concreta de produção deve
ser fornecida pela configuração do respectivo ambiente.

### 13.3 PostgreSQL

A conexão do TypeORM com o PostgreSQL deve utilizar:

- `DB_HOST` — host do banco;
- `DB_PORT` — porta do banco;
- `DB_NAME` — nome do banco;
- `DB_USER` — usuário do banco;
- `DB_PASSWORD` — senha do banco.

Valores padrão não sensíveis de desenvolvimento:

- `DB_HOST=127.0.0.1`;
- `DB_PORT=5432`;
- `DB_NAME=ditado`;
- `DB_USER=ditado`.

`DB_PASSWORD` deve existir no ambiente real. O arquivo de exemplo pode utilizar uma
credencial local claramente fictícia, desde que o Docker Compose utilize o mesmo valor,
mas nunca deve conter uma senha real.

A configuração deve permanecer compatível com o PostgreSQL executado pelo Docker
Compose e com a publicação local em `127.0.0.1:5432` definida na seção 4. Esta seção não
introduz configuração de banco de produção fora do escopo atual.

### 13.4 JWT e bcrypt

#### JWT_SECRET

É obrigatório, pertence somente ao backend e não possui valor padrão. Deve ser gerado
a partir de pelo menos 32 bytes criptograficamente aleatórios, não pode ser uma string
trivial e nunca deve conter um valor real no arquivo de exemplo.

O startup deve verificar presença, valor não vazio e comprimento mínimo de 32 bytes em
UTF-8 do valor configurado. Essa verificação local não mede nem comprova a entropia ou
a origem aleatória do segredo; a geração segura é uma obrigação de configuração. Não
deve ser criado gerador de segredo dentro da aplicação.

#### JWT_EXPIRES_IN

Define o prazo de validade do access token e deve ser configurável.

Valor padrão desta versão:

`JWT_EXPIRES_IN=1h`

Esta versão não utiliza refresh token.

#### BCRYPT_ROUNDS

Define o fator de custo utilizado pelo bcrypt. Deve ser um número inteiro configurável,
entre `10` e `15`, inclusive, com valor padrão `12`. Valores fora dessa faixa devem ser
rejeitados na inicialização.

Valor padrão desta versão:

`BCRYPT_ROUNDS=12`

### 13.5 Groq

#### GROQ_API_KEY

É obrigatória, secreta, pertence somente ao backend e não possui valor padrão.

#### GROQ_TRANSCRIPTION_MODEL

Define o identificador do modelo utilizado na transcrição e deve permanecer
configurável.

Valor de exemplo e padrão desta versão:

`GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo`

O identificador não deve ser fixado diretamente na regra de negócio.

Configuração ausente ou localmente inválida da Groq não pode permitir que a
funcionalidade de transcrição opere silenciosamente sem os valores necessários. A
validação de inicialização deve rejeitar `GROQ_API_KEY` ou identificador de modelo
ausente, vazio ou com formato inválido, sem expor a chave em mensagens de erro.

A inicialização não deve realizar chamadas à Groq apenas para validar credenciais ou a
disponibilidade do modelo. Chave rejeitada pelo provedor, modelo inexistente ou
indisponível e indisponibilidade temporária do serviço devem ser tratados como falhas
operacionais quando a transcrição for utilizada, conforme o contrato da seção 9.

Nenhuma variável da Groq pode ser exposta ao frontend.

### 13.6 Recuperação de senha e Brevo

#### PASSWORD_RESET_ENABLED

Controla a disponibilidade da recuperação de senha. Deve ser interpretada como
booleano e possui o seguinte valor padrão:

`PASSWORD_RESET_ENABLED=false`

#### BREVO_API_KEY

É secreta e obrigatória somente quando `PASSWORD_RESET_ENABLED=true`.

#### EMAIL_FROM

Define o endereço remetente utilizado nos e-mails e é obrigatório somente quando
`PASSWORD_RESET_ENABLED=true`.

#### EMAIL_FROM_NAME

Define o nome exibido do remetente.

Valor padrão não sensível:

`EMAIL_FROM_NAME=Ditado`

`APP_URL` também deve estar presente e representar uma URL válida quando a recuperação
estiver habilitada.

Quando `PASSWORD_RESET_ENABLED=false`, a aplicação deve funcionar normalmente sem
configuração da Brevo. Quando `PASSWORD_RESET_ENABLED=true`, `BREVO_API_KEY`,
`EMAIL_FROM` e `APP_URL` válidos são obrigatórios. Se qualquer um estiver ausente ou
inválido, o backend deve falhar na inicialização com uma mensagem objetiva que não
exponha segredos.

`GET /api/config/public` deve retornar `passwordResetEnabled=true` somente quando a
funcionalidade estiver habilitada e a aplicação tiver inicializado com a configuração
válida.

A inicialização não deve realizar chamadas à Brevo apenas para validar a credencial.
Uma chave rejeitada pelo provedor ou a indisponibilidade temporária do serviço deve ser
tratada como falha operacional quando houver tentativa de envio, preservando a resposta
genérica definida nas seções 9 e 12.

### 13.7 Bootstrap do primeiro administrador

O mecanismo de bootstrap definido na seção 7 deve utilizar exclusivamente:

- `ADMIN_NAME`;
- `ADMIN_EMAIL`;
- `ADMIN_PASSWORD`.

Essas variáveis são necessárias quando o procedimento de bootstrap for executado.
`ADMIN_EMAIL` deve utilizar a normalização definida na seção 12 e `ADMIN_PASSWORD` deve
obedecer à política da seção 7.

`ADMIN_PASSWORD` é segredo e não pode possuir valor real no arquivo de exemplo. A
ausência das variáveis de bootstrap não deve impedir a inicialização normal da aplicação
quando o procedimento não estiver sendo executado.

O procedimento concreto de execução deve ser documentado no `README.md`. Não deve ser
criado um segundo mecanismo de criação do primeiro administrador.

Se `ADMIN_EMAIL` normalizado já existir, o procedimento deve seguir a seção 7: conta
`admin` não é duplicada nem tem dados ou credenciais sobrescritos silenciosamente;
conta `user` causa falha explícita, sem promoção.

### 13.8 Rate limiting

Os limites desta seção são valores padrão configuráveis e podem ser alterados por
ambiente sem modificação do código.

#### Login

- janela: 15 minutos;
- máximo: 10 tentativas por combinação entre origem da requisição e e-mail normalizado;
- aplicação: um único contador para essa combinação, não limitadores independentes
  por origem e por e-mail.

Variáveis:

- `RATE_LIMIT_LOGIN_WINDOW_SECONDS=900`;
- `RATE_LIMIT_LOGIN_MAX=10`.

#### Cadastro

- janela: 1 hora;
- máximo: 5 tentativas por origem da requisição.

Variáveis:

- `RATE_LIMIT_REGISTER_WINDOW_SECONDS=3600`;
- `RATE_LIMIT_REGISTER_MAX=5`.

#### Recuperação de senha

- janela: 1 hora;
- máximo: 5 solicitações por combinação entre origem da requisição e e-mail normalizado;
- aplicação: um único contador para essa combinação; contas existentes e inexistentes
  consomem o limite da mesma maneira.

Variáveis:

- `RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS=3600`;
- `RATE_LIMIT_FORGOT_PASSWORD_MAX=5`.

#### Redefinição de senha

- janela: 15 minutos;
- máximo: 10 tentativas por origem da requisição.

Variáveis:

- `RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS=900`;
- `RATE_LIMIT_RESET_PASSWORD_MAX=10`.

#### Transcrição

- janela: 1 hora;
- máximo: 20 solicitações por `userId` do usuário autenticado.

Variáveis:

- `RATE_LIMIT_TRANSCRIPTION_WINDOW_SECONDS=3600`;
- `RATE_LIMIT_TRANSCRIPTION_MAX=20`.

A identificação da origem da requisição não deve confiar em cabeçalhos de IP fornecidos
pelo cliente sem considerar corretamente a infraestrutura e os proxies utilizados pela
aplicação.

Esta especificação não exige uma biblioteca específica de rate limiting. A solução
escolhida deve ser compatível com NestJS e com a arquitetura existente.

### 13.9 Validação da configuração na inicialização

O backend deve validar durante a inicialização a presença, o tipo, o formato e os
valores não vazios das variáveis de ambiente aplicáveis.

Regras:

- configuração obrigatória ausente ou inválida deve causar falha rápida com mensagem
  objetiva;
- mensagens de erro de configuração não podem imprimir valores secretos;
- números, booleanos, portas e durações devem ser convertidos e validados
  explicitamente;
- `NODE_ENV` deve aceitar somente os valores definidos nesta seção;
- `JWT_SECRET` vazio ou ausente deve impedir a inicialização;
- `JWT_SECRET` deve atender ao comprimento mínimo verificável definido na seção 13.4,
  sem pretensão de medir ou comprovar sua entropia;
- `BCRYPT_ROUNDS` deve ser um número inteiro entre `10` e `15`, inclusive;
- a funcionalidade de transcrição não pode iniciar sem `GROQ_API_KEY` e
  `GROQ_TRANSCRIPTION_MODEL` válidos;
- dependências condicionais, como a configuração da Brevo, devem ser exigidas somente
  quando a funcionalidade correspondente estiver habilitada;
- janelas e máximos de rate limiting devem ser números inteiros positivos.

A validação de inicialização não deve realizar chamadas externas à Groq ou à Brevo
apenas para validar credenciais. Chaves rejeitadas pelo provedor, modelo de transcrição
inexistente ou indisponível e indisponibilidade temporária de serviços externos são
falhas operacionais e devem ser tratadas quando a integração for utilizada, conforme o
contrato público da API.

### 13.10 `.env.example`

O futuro arquivo `backend/.env.example` deve documentar, no mínimo, as variáveis abaixo.
Os valores vazios representam segredos ou dados que devem ser definidos pelo ambiente.
Os demais valores são padrões não sensíveis ou exemplos locais fictícios.

Configuração básica:

```dotenv
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

PostgreSQL:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=ditado
DB_USER=ditado
DB_PASSWORD=ditado_dev
```

`DB_PASSWORD=ditado_dev` é uma credencial local fictícia. O Docker Compose de
desenvolvimento deve utilizar o mesmo valor.

JWT e bcrypt:

```dotenv
JWT_SECRET=
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=12
```

Groq:

```dotenv
GROQ_API_KEY=
GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo
```

Recuperação de senha e Brevo:

```dotenv
PASSWORD_RESET_ENABLED=false
BREVO_API_KEY=
EMAIL_FROM=no-reply@localhost.test
EMAIL_FROM_NAME=Ditado
```

Bootstrap do primeiro administrador:

```dotenv
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@localhost.test
ADMIN_PASSWORD=
```

Rate limiting:

```dotenv
RATE_LIMIT_LOGIN_WINDOW_SECONDS=900
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_REGISTER_WINDOW_SECONDS=3600
RATE_LIMIT_REGISTER_MAX=5
RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS=3600
RATE_LIMIT_FORGOT_PASSWORD_MAX=5
RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS=900
RATE_LIMIT_RESET_PASSWORD_MAX=10
RATE_LIMIT_TRANSCRIPTION_WINDOW_SECONDS=3600
RATE_LIMIT_TRANSCRIPTION_MAX=20
```

Nenhum valor secreto real pode ser incluído no arquivo de exemplo.

---

## 14. Estrutura do projeto e execução local

Esta seção define a estrutura esperada do repositório e o funcionamento do ambiente
local. Ela não representa a criação antecipada de arquivos ou abstrações sem uso.

### 14.1 Estrutura geral do repositório

Estrutura mínima esperada:

```text
ditado/
├── AGENTS.md
├── README.md
├── docker-compose.yml
├── start.sh
├── stop.sh
├── .gitignore
├── docs/
│   └── ESPECIFICACAO.md
├── backend/
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   ├── package-lock.json
│   └── src/
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── vite.config.ts
    └── src/
```

Responsabilidades dos itens de primeiro nível:

- `AGENTS.md` — regras e convenções para agentes que trabalhem no repositório;
- `README.md` — instruções concretas de instalação e execução;
- `docker-compose.yml` — definição do PostgreSQL utilizado no desenvolvimento;
- `start.sh` — inicialização conveniente do ambiente após o setup;
- `stop.sh` — encerramento seguro dos processos iniciados para o projeto;
- `.gitignore` — exclusão de segredos, dependências e artefatos locais do versionamento;
- `docs/` — documentação do produto e da arquitetura;
- `backend/` — API NestJS, regras de negócio, integrações e persistência;
- `frontend/` — aplicação React executada pelo Vite.

Arquivos e pastas adicionais só devem ser criados quando houver necessidade funcional
ou arquitetural concreta.

### 14.2 Estrutura do backend

O backend deve seguir a organização modular do NestJS.

Estrutura conceitual:

```text
backend/src/
├── main.ts
├── app.module.ts
├── config/
├── common/
│   ├── decorators/
│   └── enums/
├── health/
├── auth/
│   ├── dto/
│   ├── entities/
│   ├── guards/
│   ├── strategies/
│   ├── email/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/
│   ├── dto/
│   ├── entities/
│   │   └── user.entity.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
└── transcriptions/
    ├── dto/
    ├── entities/
    │   └── transcription.entity.ts
    ├── transcriptions.controller.ts
    ├── transcriptions.service.ts
    └── transcriptions.module.ts
```

Responsabilidades:

- `main.ts` concentra o bootstrap da aplicação, o prefixo `/api`, o CORS e a validação
  global;
- `app.module.ts` concentra a composição dos módulos, a configuração e a conexão
  principal com o banco;
- `config/` concentra configuração e validação de ambiente, sem fixar nomes internos
  de arquivos;
- `common/decorators/` contém decorators realmente compartilhados;
- `common/enums/` contém enums compartilhados;
- `health/` preserva a previsão arquitetural da Aula 07 para saúde da aplicação, sem
  criar ou especificar novo endpoint.

No domínio `auth/`:

- `dto/` contém contratos de entrada e validação de cadastro, login e recuperação;
- `entities/` inclui `PasswordResetToken`;
- `guards/` trata autenticação JWT e autorização por role;
- `strategies/` contém a estratégia JWT;
- `email/` contém a abstração e a implementação necessárias ao envio pela Brevo;
- controller, service e module seguem a divisão de responsabilidades definida abaixo;
- recuperação de senha permanece neste domínio, sem módulo separado.

No domínio `users/`:

- `dto/` contém entradas de perfil, senha, exclusão própria e administração;
- `entities/user.entity.ts` representa `User`;
- `users.controller.ts` trata HTTP e delega, sem regra de negócio ou acesso a Repository;
- `users.service.ts` concentra regras de negócio e acesso à persistência;
- `users.module.ts` declara os componentes do domínio e exporta `UsersService` quando
  necessário a outros módulos.

No domínio `transcriptions/`:

- `dto/` contém a entrada da criação da transcrição;
- `entities/transcription.entity.ts` representa `Transcription`;
- `transcriptions.controller.ts` trata HTTP e multipart e delega ao serviço;
- `transcriptions.service.ts` concentra regras, ownership e persistência;
- `transcriptions.module.ts` declara os componentes do domínio;
- a comunicação com a Groq fica encapsulada por provider ou service interno ao domínio,
  sem nome de arquivo obrigatório nesta seção.

Controllers não contêm regras de negócio, não acessam Repository do TypeORM diretamente
e não chamam Groq ou Brevo diretamente. Services concentram regras e acesso à
persistência; DTOs representam e validam entrada; entities representam persistência;
modules declaram componentes e exportações. Elementos só devem ficar em `common/`
quando forem realmente compartilhados.

A política de senha, o bootstrap administrativo e a configuração pública devem ter
localização coerente com essas responsabilidades, sem fixar nomes de arquivos internos.
Além dos arquivos principais mostrados, esta seção não determina nomes de DTOs,
providers ou services internos. Não devem ser criados arquivos ou abstrações vazias
apenas para reproduzir a árvore; novas pastas internas exigem necessidade concreta.

### 14.3 Estrutura do frontend

Estrutura conceitual:

```text
frontend/src/
├── main.tsx
├── App.tsx
├── pages/
├── components/
│   ├── ui/
│   └── layout/
├── services/
│   └── api.ts
├── store/
│   └── authStore.ts
├── types/
└── demais pastas justificadas por uso concreto
```

Responsabilidades:

- `pages/` contém componentes associados às rotas;
- `components/ui/` contém componentes reutilizáveis de interface;
- `components/layout/` contém estruturas compartilhadas, como o layout da área interna;
- `services/api.ts` contém a única instância do Axios definida na seção 11;
- `store/authStore.ts` concentra o estado de sessão mantido pelo Zustand;
- `types/` contém tipos TypeScript associados aos contratos da aplicação.

A lógica de comunicação HTTP não deve ser espalhada diretamente pelas páginas.
Componentes compartilhados não devem duplicar regras de negócio do backend. Pastas para
hooks, utilitários ou outras abstrações só devem ser introduzidas quando houver uso que
as justifique.

### 14.4 Docker Compose e PostgreSQL

Nesta etapa, o Docker Compose deve executar somente o PostgreSQL. Backend e frontend
devem continuar sendo executados diretamente no ambiente local.

Configuração esperada:

- imagem `postgres:17-alpine`;
- banco `ditado`;
- usuário `ditado`;
- senha local fictícia `ditado_dev`;
- publicação `127.0.0.1:5432:5432`;
- volume nomeado `postgres_data` para persistência;
- healthcheck com `pg_isready`, disponível na própria imagem.

Esses valores devem permanecer consistentes com `backend/.env.example`, conforme a
seção 13.

`docker compose down` não deve remover o volume por padrão. A exclusão de
`postgres_data` deve ocorrer apenas em uma operação explícita de reset do ambiente,
documentada separadamente no `README.md`.

### 14.5 Portas e comunicação local

Serviços no ambiente de desenvolvimento:

- frontend Vite: `http://localhost:5173`;
- backend NestJS: `http://localhost:3000`;
- PostgreSQL no host: `127.0.0.1:5432`.

O frontend deve continuar utilizando somente caminhos relativos iniciados por `/api`.
Durante o desenvolvimento, `vite.config.ts` deve encaminhar `/api` para
`http://localhost:3000`.

Páginas, componentes e serviços do frontend não devem conter URLs absolutas do backend.

### 14.6 Dependências e instalação

Backend e frontend devem possuir seus próprios:

- `package.json`;
- `package-lock.json`;
- `node_modules/`.

Os arquivos `package-lock.json` devem ser versionados. Quando o lockfile existir, a
instalação reproduzível deve utilizar `npm ci`. Pastas `node_modules/` nunca devem ser
versionadas.

Os scripts de inicialização não devem instalar nem atualizar dependências
silenciosamente. A instalação deve permanecer uma etapa explícita do setup.

O ambiente deve utilizar Node.js 22.12 ou superior. Node.js 20 não é suportado para
este projeto. Antes da implementação final, a versão do Node.js utilizada pelo projeto
deve ser registrada de forma reproduzível no repositório, sem
depender apenas da versão instalada na máquina do desenvolvedor.

O npm não precisa possuir uma versão independente fixada, desde que seja compatível
com a versão adotada do Node.js.

### 14.7 start.sh

O arquivo `start.sh`, localizado na raiz, é um script Bash e deve iniciar o ambiente de
desenvolvimento depois que o setup inicial estiver concluído. Ele pode ser utilizado
em Linux, WSL e ambientes equivalentes com Bash. Não se assume sua execução direta em
PowerShell.

Comportamento esperado:

1. verificar pré-condições mínimas, incluindo ferramentas necessárias, existência de
   `backend/.env`, dependências instaladas e disponibilidade das portas;
2. criar `.runtime/` quando necessário e verificar registros de processos anteriores;
3. iniciar o PostgreSQL com `docker compose up -d`;
4. aguardar o healthcheck do PostgreSQL antes de prosseguir;
5. iniciar o backend em modo de desenvolvimento;
6. iniciar o frontend em modo de desenvolvimento;
7. manter backend e frontend como processos separados;
8. direcionar suas saídas para arquivos de log locais em `.runtime/`;
9. registrar seus PIDs para uso pelo `stop.sh`;
10. informar claramente qualquer falha de inicialização.

O script não deve:

- instalar ou atualizar dependências;
- criar ou inventar segredos;
- sobrescrever `backend/.env`;
- iniciar processos duplicados quando já existirem instâncias válidas registradas.

Registros de PID obsoletos devem ser tratados de forma segura. Se a inicialização ficar
parcialmente concluída, o script deve informar quais componentes foram iniciados e
evitar deixar novos processos sem controle.

### 14.8 stop.sh

O arquivo `stop.sh` é um script Bash e pode ser utilizado em Linux, WSL e ambientes
equivalentes com Bash. Não se assume sua execução direta em PowerShell.

O arquivo `stop.sh` deve:

- encerrar somente os processos de backend e frontend registrados pelo ambiente do
  projeto;
- validar os PIDs e a identidade dos processos antes de encerrá-los;
- lidar de forma segura com PID ausente ou processo já encerrado;
- remover arquivos de PID obsoletos;
- executar `docker compose down`;
- preservar o volume do PostgreSQL por padrão.

O script não deve utilizar comandos amplos, como `killall node` ou equivalentes, que
possam encerrar processos não relacionados ao projeto.

O `README.md` deve fornecer os comandos manuais equivalentes para ambientes em que os
scripts Bash `start.sh` e `stop.sh` não forem utilizados.

### 14.9 Logs e arquivos de PID

Artefatos locais de runtime devem utilizar uma única pasta não versionada na raiz:

```text
.runtime/
├── backend.pid
├── frontend.pid
├── backend.log
└── frontend.log
```

`.runtime/` é adequada por isolar arquivos transitórios de controle e diagnóstico sem
misturá-los com o código ou com dados persistentes. A pasta pode ser recriada
automaticamente e não contém dados da aplicação que precisem ser preservados.

### 14.10 Arquivos versionados e não versionados

Devem ser versionados:

- código-fonte;
- `package.json`;
- `package-lock.json`;
- `backend/.env.example`;
- `docker-compose.yml`;
- `AGENTS.md`;
- `README.md`;
- `docs/`;
- `start.sh`;
- `stop.sh`;
- `.gitignore`.

Não devem ser versionados:

- `backend/.env`;
- `node_modules/`;
- `dist/`;
- `.runtime/`;
- logs;
- arquivos PID;
- dados ou volumes do PostgreSQL;
- arquivos temporários de upload;
- arquivos de áudio de teste;
- credenciais ou segredos reais.

O `.gitignore` deve refletir essas regras.

### 14.11 Procedimento manual de execução

O fluxo conceitual de uma instalação nova deve ser:

1. clonar ou obter o repositório;
2. criar `backend/.env` a partir de `backend/.env.example`;
3. preencher os segredos obrigatórios;
4. executar `npm ci` em `backend/`;
5. executar `npm ci` em `frontend/`;
6. iniciar o PostgreSQL;
7. executar o bootstrap do primeiro administrador quando necessário;
8. iniciar o backend;
9. iniciar o frontend;
10. acessar `http://localhost:5173`.

O `README.md` final deve fornecer os comandos exatos desse fluxo.

Depois que o setup inicial estiver concluído, `start.sh` deve simplificar as
inicializações seguintes e `stop.sh` deve encerrar o ambiente.

### 14.12 Verificações básicas do ambiente

O ambiente local pode ser considerado corretamente iniciado quando for possível
observar que:

- o PostgreSQL está disponível;
- o backend inicia sem erros de configuração;
- o frontend inicia;
- o frontend responde em `http://localhost:5173`;
- o proxy `/api` alcança o backend;
- o backend consegue acessar o PostgreSQL;
- nenhuma credencial é necessária no frontend.

Essas verificações não autorizam a criação de novos endpoints.

### 14.13 Relação com README e AGENTS.md

- `docs/ESPECIFICACAO.md` define como o produto e sua arquitetura devem funcionar;
- `README.md` deve fornecer instruções concretas para uma pessoa instalar e executar o
  projeto do zero;
- `AGENTS.md` deve definir regras e convenções para agentes que trabalhem no
  repositório;
- o conteúdo integral da especificação não deve ser duplicado nesses documentos;
- comandos operacionais necessários para pessoas devem aparecer no `README.md`;
- o `README.md` final deve conter a declaração exigida pela atividade sobre o uso de
  IA, identificando as ferramentas e os modelos utilizados e as etapas em que foram
  utilizados;
- restrições arquiteturais relevantes para agentes devem aparecer no `AGENTS.md`.

---

## 15. Etapas de implementação e critérios de aceite

Esta seção organiza a construção da aplicação em entregas incrementais, limitadas e
verificáveis. Ela não substitui os requisitos das seções anteriores nem autoriza a
alteração dos contratos, tecnologias ou funcionalidades já definidos.

### 15.1 Método obrigatório de trabalho

Todas as etapas e subetapas devem seguir este ciclo:

1. **Pedido**
   - o usuário solicita somente a etapa ou subetapa atual ao agente em modo Plan;
2. **Plano**
   - o agente identifica os arquivos, as alterações, as dependências e as verificações
     pertencentes exclusivamente à unidade atual;
   - o usuário lê e corrige o plano antes de autorizar a execução;
3. **Execução**
   - somente depois da aprovação do plano, o agente trabalha em modo Build;
4. **Verificação**
   - o agente pode executar testes e verificações próprios, mas isso não substitui a
     verificação humana;
   - o usuário executa os comandos de aceite no próprio terminal e, quando aplicável,
     reproduz os comportamentos no navegador;
   - se qualquer critério falhar, a unidade retorna à execução e correção;
   - nenhum commit de conclusão deve ser realizado enquanto houver critério de aceite
     falhando;
5. **Registro**
   - somente após a verificação humana bem-sucedida é realizado o commit da unidade;
   - a mensagem do commit deve identificar claramente a etapa ou subetapa concluída;
   - a convenção concreta das mensagens e as boas práticas de Git serão definidas no
     `AGENTS.md`, sem impor Conventional Commits como requisito desta especificação;
   - somente depois desse registro pode ser iniciada a unidade seguinte.

A especificação inteira não deve ser entregue ao agente como um único pedido de
implementação. Cada pedido deve possuir o escopo limitado à unidade atual. Trabalho de
unidades futuras não deve ser antecipado sem dependência técnica real, explícita e
justificada no plano aprovado.

Uma etapa ou subetapa somente é considerada concluída depois que todos os seus
critérios de aceite tiverem sido verificados. Afirmações do agente como "todos os
testes passaram" não substituem a saída observada pelo usuário no terminal, as
respostas observadas na API nem o comportamento verificado pelo usuário no navegador.

### 15.2 Estrutura obrigatória das etapas

Cada etapa e subetapa desta seção define:

- **Objetivo** — resultado específico que deve ser alcançado;
- **Dependências e pré-condições** — unidades aceitas e condições necessárias;
- **Escopo** — trabalho autorizado na unidade;
- **Fora do escopo** — trabalho que deve permanecer para unidades posteriores;
- **Entregáveis e resultados esperados** — estado concreto esperado ao final;
- **Critérios de aceite** — evidências objetivas que devem ser observadas;
- **Verificação humana esperada** — o que o usuário deve conferir diretamente;
- **Condição para avançar** — condição obrigatória para iniciar a unidade seguinte;
- **Commit conceitual** — identificação esperada para o registro da unidade aceita,
  não uma sintaxe obrigatória de mensagem; a convenção concreta cabe ao `AGENTS.md`.

Os critérios devem preferir resultados observáveis, como término bem-sucedido de um
comando existente, status e corpo de uma resposta HTTP, estado do banco, bloqueio de
uma rota ou reprodução de um fluxo no navegador. Expressões vagas como "funciona
corretamente", "interface pronta" ou "segurança implementada" não constituem
critérios de aceite.

Quando um comando exato depender de scripts ou scripts de pacote que ainda serão
criados na própria etapa, o critério deve descrever o resultado esperado e utilizar,
na verificação, o comando efetivamente documentado pela implementação aprovada. Não se
deve inventar antecipadamente um comando ou framework de teste inexistente.

### 15.3 Sequência de implementação

A sequência abaixo respeita as dependências entre persistência, backend, frontend,
integrações e operação. As subetapas `2A`, `2B`, `7A`, `7B`, `8A` e `8B` constituem
unidades independentes: cada uma deve ser planejada, executada, verificada, aceita e
registrada antes da seguinte.

#### Etapa 0 — Preparação do repositório e fundação

**Objetivo**

Preparar uma base reproduzível para backend, frontend e PostgreSQL, sem implementar
funcionalidades de negócio.

**Dependências e pré-condições**

- especificação das seções 1 a 14 aprovada;
- ambiente capaz de utilizar Node.js 22.12 ou superior, npm, Docker e Docker Compose.

**Escopo**

Dentro desta etapa, antes da geração do primeiro código do backend ou do frontend,
devem existir e ser conferidos:

- `docs/ESPECIFICACAO.md`;
- `AGENTS.md`;
- `backend/.env.example`;
- a estrutura inicial de pastas.

Somente depois desses quatro artefatos estarem definidos e conferidos devem ser
criados os projetos base NestJS e React com Vite. Essa ordem interna não constitui uma
etapa nem um commit adicional.

- estrutura inicial de diretórios do backend e do frontend;
- projetos base NestJS e React com Vite e TypeScript;
- dependências das tecnologias já definidas na seção 4;
- `package.json` e `package-lock.json` separados e mecanismo reproduzível para a versão
  adotada do Node.js;
- `backend/.env.example`, carregamento e validação tipada da configuração;
- validação das dependências condicionais da recuperação de senha;
- configuração global inicial do NestJS, prefixo `/api`, validação, CORS e tratamento
  seguro de erros de infraestrutura disponíveis nesta etapa;
- configuração do Vite e do proxy `/api`;
- `docker-compose.yml` com o PostgreSQL definido na seção 14;
- `.gitignore` e conteúdo inicial estritamente necessário de `README.md` e
  `AGENTS.md`;
- estrutura arquitetural necessária às etapas posteriores, sem módulos sem uso.

O tratamento de erros sem detalhes internos limita-se, nesta etapa, ao bootstrap, à
configuração, à validação global e a outras regras de infraestrutura já disponíveis.
As respostas HTTP de erro dessa infraestrutura seguem o formato mínimo da seção 9.
Não devem ser antecipados tratamentos específicos de endpoints futuros.

**Fora do escopo da etapa**

- entidades e regras de persistência do produto;
- cadastro, login ou qualquer outro endpoint funcional;
- páginas funcionais do produto;
- chamadas à Groq ou à Brevo;
- `start.sh`, `stop.sh` e documentação operacional final.

**Entregáveis e resultados esperados**

- projetos base instaláveis de forma reproduzível;
- PostgreSQL local isolado no Docker Compose;
- backend e frontend capazes de iniciar;
- configuração local documentada sem segredos reais;
- fundação global de validação e segurança compatível com as etapas seguintes.

**Critérios de aceite**

- Node.js 22.12 ou superior é exigido pelo projeto, Node.js 20 não é apresentado como
  suportado e a versão adotada pode ser reproduzida no repositório;
- `npm ci` conclui com sucesso separadamente no backend e no frontend a partir dos
  respectivos lockfiles;
- o PostgreSQL inicia com `postgres:17-alpine`, fica saudável, publica somente em
  `127.0.0.1:5432` e utiliza o volume nomeado previsto;
- com configuração base válida, backend e frontend iniciam nas portas definidas;
- configuração obrigatória base ausente, vazia, com tipo inválido ou formato inválido
  impede o início do backend sem imprimir valores secretos;
- o startup verifica presença, valor não vazio e comprimento mínimo de `JWT_SECRET`
  conforme a seção 13.4, sem afirmar que mede entropia, e rejeita `BCRYPT_ROUNDS` não
  inteiro ou fora da faixa de `10` a `15`, mantendo o padrão `12`;
- `PASSWORD_RESET_ENABLED=false` não exige configuração da Brevo, enquanto `true`
  exige `BREVO_API_KEY`, `EMAIL_FROM` e `APP_URL` localmente válidos, sem realizar
  chamada externa no startup;
- uma requisição iniciada por `/api` no frontend atravessa o proxy e recebe uma
  resposta originada pelo backend, ainda que a rota funcional não exista;
- o CORS aceita a origem de desenvolvimento prevista e não utiliza `*` como padrão;
- `backend/.env`, dependências, artefatos e segredos não aparecem entre os arquivos
  destinados ao versionamento;
- nenhuma rota de negócio ou integração externa foi implementada.

**Verificação humana esperada**

O usuário deve repetir a instalação por lockfile, iniciar o banco, o backend e o
frontend, observar portas e healthcheck, conferir o proxy e provocar pelo menos uma
falha de configuração. Também deve inspecionar os arquivos destinados ao versionamento
para confirmar a ausência de `.env` e segredos.

**Condição para avançar**

Todos os processos base devem iniciar de forma reproduzível, todas as falhas de
configuração verificadas devem ser seguras e não pode existir funcionalidade de negócio
antecipada.

**Commit conceitual**

`etapa 0: preparar fundação reproduzível do projeto`

#### Etapa 1 — Persistência, modelo de dados e bootstrap administrativo

**Objetivo**

Implementar o modelo persistente e o mecanismo idempotente de criação do primeiro
administrador.

**Dependências e pré-condições**

- Etapa 0 aceita e registrada;
- PostgreSQL local disponível;
- variáveis do banco e, quando o bootstrap for executado, variáveis administrativas
  configuradas.

**Escopo**

- configuração do TypeORM com PostgreSQL e `synchronize: true` somente em
  desenvolvimento;
- entidades `User`, `Transcription` e `PasswordResetToken` com campos, enums,
  restrições, timestamps e relacionamentos definidos na seção 6;
- unicidade do e-mail normalizado;
- cascatas de exclusão de transcrições e tokens a partir de `User`;
- normalização de nome e e-mail aplicável à persistência;
- bootstrap idempotente do primeiro administrador;
- política de senha e bcrypt no bootstrap, utilizando `BCRYPT_ROUNDS`.

**Fora do escopo da etapa**

- endpoints HTTP de autenticação, perfil, transcrição, recuperação ou administração;
- telas do frontend;
- chamadas à Groq ou à Brevo;
- regras de uso dos tokens de recuperação além de sua estrutura persistente.

**Entregáveis e resultados esperados**

- esquema de desenvolvimento criado pelo TypeORM;
- relacionamentos e restrições persistentes;
- procedimento único e documentável de bootstrap administrativo.

**Critérios de aceite**

- o banco contém as estruturas correspondentes às três entidades e seus campos
  obrigatórios;
- `role` aceita os valores previstos e o e-mail possui restrição efetiva de unicidade;
- e-mails equivalentes após remoção de espaços externos e conversão para minúsculas
  não podem originar duas contas;
- a exclusão controlada de um usuário de teste remove suas transcrições e seus tokens
  relacionados;
- o bootstrap rejeita senha fora da política antes da geração do hash;
- uma execução válida cria uma conta `admin` com e-mail normalizado e senha armazenada
  somente como hash bcrypt;
- a repetição do mesmo procedimento não cria uma segunda conta nem duplica o
  administrador e não sobrescreve silenciosamente seus dados ou credenciais;
- se o e-mail normalizado do bootstrap pertencer a uma conta `user`, o procedimento
  falha explicitamente, sem promover a conta;
- as variáveis de bootstrap ausentes não impedem a inicialização normal quando o
  procedimento não está sendo executado.

**Verificação humana esperada**

O usuário deve inspecionar o esquema e as restrições no PostgreSQL, executar o
bootstrap com dados controlados, confirmar que não existe senha em texto puro e
reexecutá-lo para comprovar a idempotência. As cascatas devem ser verificadas com dados
de teste descartáveis.

**Condição para avançar**

O modelo, as restrições, as cascatas e o bootstrap devem produzir exatamente os
resultados observados acima, sem endpoint funcional antecipado.

**Commit conceitual**

`etapa 1: implementar persistência e bootstrap administrativo`

#### Subetapa 2A — Autenticação e identidade atual no backend

**Objetivo**

Disponibilizar cadastro, login, JWT, identidade autenticada e configuração pública por
meio da API, sem ainda permitir alterações na própria conta.

**Dependências e pré-condições**

- Etapa 1 aceita e registrada;
- ao menos um administrador criado pelo bootstrap para verificações protegidas;
- configuração válida de JWT, bcrypt e rate limiting.

**Escopo**

- `POST /api/auth/register`;
- `POST /api/auth/login`;
- autenticação Passport/JWT e Guard para rotas protegidas;
- verificação da existência da conta identificada pelo JWT antes de regras de negócio;
- `GET /api/users/me`;
- `GET /api/config/public`;
- política de senha, hash bcrypt e normalização determinística do e-mail;
- DTOs com rejeição de campos não permitidos e respostas públicas sem
  `passwordHash`;
- rate limiting de cadastro e login, incluindo `429` e `Retry-After`;
- validação da role atual da conta como base reutilizável para autorizações futuras.

**Fora do escopo da subetapa**

- alteração ou exclusão da própria conta;
- recuperação de senha;
- transcrições;
- rotas administrativas;
- qualquer frontend funcional.

**Entregáveis e resultados esperados**

- contas comuns podem ser criadas e autenticadas;
- JWT identifica uma conta existente e permite consultar seus dados públicos;
- a interface futura pode consultar somente a capacidade pública de recuperação.

**Critérios de aceite**

- cadastro válido retorna `201`, cria `role = user` e não retorna `passwordHash`;
- senha fora da política, corpo inválido ou campo `role` enviado pelo cliente retorna
  `400`;
- e-mail já existente, inclusive em variação equivalente após normalização, retorna
  `409`;
- login válido retorna `200`, usuário público e access token; credenciais inválidas
  retornam `401` sem expor qual campo falhou;
- `GET /api/users/me` com JWT válido retorna a conta correspondente e, sem token, com
  token inválido ou expirado, ou com conta associada inexistente, retorna `401`;
- JWT ainda válido de uma conta removida de forma controlada no banco retorna `401`
  sem executar regras de negócio, sem depender de endpoint de exclusão futuro;
- respostas de erro seguem o formato mínimo da seção 9;
- nenhuma resposta das rotas desta subetapa contém `passwordHash`, senha ou segredo;
- os limites de cadastro e login utilizam os identificadores definidos na seção 13 e,
  quando excedidos, retornam `429` com `Retry-After` aplicável;
- `GET /api/config/public` é público, retorna somente `passwordResetEnabled` e reflete
  a configuração válida do ambiente.

**Verificação humana esperada**

O usuário deve reproduzir por cliente HTTP os casos de cadastro, duplicidade, campo
indevido, login válido e inválido, JWT válido e inválido, configuração pública e
excesso controlado dos limites. Deve conferir os registros persistidos e os corpos das
respostas para garantir que nenhum dado sensível foi exposto.

**Condição para avançar**

Todos os contratos desta subetapa devem estar verificáveis sem depender das rotas de
autogerenciamento ou do frontend.

**Commit conceitual**

`subetapa 2A: implementar autenticação e identidade no backend`

#### Subetapa 2B — Gerenciamento da própria conta no backend

**Objetivo**

Permitir que a conta autenticada altere seus dados e senha ou seja excluída, preservando
unicidade, confirmação de credenciais e proteção do último administrador.

**Dependências e pré-condições**

- Subetapa 2A aceita e registrada;
- contas de teste autenticáveis, incluindo cenários controlados com um e mais de um
  administrador.

**Escopo**

- `PATCH /api/users/me`;
- `PATCH /api/users/me/password`;
- `DELETE /api/users/me`;
- normalização de nome e e-mail;
- confirmação da senha atual quando exigida;
- política única de senha e novo hash;
- invalidação de tokens pendentes após alteração bem-sucedida de senha ou e-mail,
  conforme a seção 6.3;
- rejeição de campos não permitidos, inclusive `role`;
- exclusão em cascata e proteção do último administrador.

**Fora do escopo da subetapa**

- telas de perfil;
- recuperação de senha por token;
- gerenciamento administrativo de outras contas;
- transcrições e integração com serviços externos.

**Entregáveis e resultados esperados**

- API completa de autogerenciamento prevista na seção 9;
- regras críticas aplicadas exclusivamente à conta identificada pelo JWT.

**Critérios de aceite**

- alteração válida de nome ou e-mail retorna `200`, persiste valores normalizados e
  faz o novo e-mail ser utilizado no próximo login;
- e-mail de outra conta retorna `409`, e campos como `role` ou senha na rota de perfil
  retornam `400`;
- troca de senha válida retorna `204`, invalida o uso da senha anterior no login e
  permite login com a nova senha;
- alteração bem-sucedida de senha ou e-mail invalida os tokens pendentes da conta;
  a verificação utiliza registros controlados no banco, sem depender dos endpoints
  de recuperação da Subetapa 7A;
- senha atual incorreta, nova senha fora da política ou corpo inválido retorna `400`
  sem alterar o hash existente;
- exclusão com senha correta retorna `204` e remove a conta, suas transcrições e seus
  tokens; senha incorreta retorna `400` e preserva os dados;
- após a exclusão, o JWT anteriormente emitido recebe `401` nas rotas protegidas;
- tentativa de excluir a conta do único administrador retorna `409`, enquanto um
  administrador que não seja o último pode excluir a própria conta;
- a exclusão preserva a invariável da seção 8 inclusive em operações simultâneas;
- nenhuma rota permite escolher outro `userId`, alterar `role` ou expor
  `passwordHash`.

**Verificação humana esperada**

O usuário deve realizar as requisições autenticadas com contas controladas, repetir o
login após mudanças de e-mail e senha, inspecionar a persistência e verificar ambos os
cenários de exclusão administrativa própria: único administrador e administrador não
único.

**Condição para avançar**

As três rotas devem estar aceitas de forma independente do frontend e sem depender de
funcionalidades administrativas futuras.

**Commit conceitual**

`subetapa 2B: implementar autogerenciamento da conta no backend`

#### Etapa 3 — Transcrição, Groq, histórico e propriedade no backend

**Objetivo**

Implementar o ciclo de transcrição e o histórico pessoal no backend, com isolamento
entre usuários e uso seguro da Groq.

**Dependências e pré-condições**

- Subetapa 2B aceita e registrada;
- credencial da Groq e modelo configurados;
- duas contas comuns autenticáveis e arquivos locais de teste não versionados.

**Escopo**

- `POST /api/transcriptions` com `multipart/form-data`;
- `GET /api/transcriptions`;
- `GET /api/transcriptions/:id`;
- `DELETE /api/transcriptions/:id`;
- validação de arquivo, formatos, metadados disponíveis e limite de 25 MB;
- recebimento obrigatório e validação de `language` como código ISO 639-1 conforme o
  contrato, uso desse valor na integração de transcrição, persistência na
  `Transcription` e retorno nas respostas que já possuem esse campo;
- integração exclusiva backend → Groq;
- persistência somente do resultado e dos metadados previstos;
- ordenação por `createdAt` decrescente;
- propriedade derivada do usuário autenticado e `404` indistinguível;
- rate limiting por `userId`, com `429` e `Retry-After`;
- representação segura das falhas operacionais da Groq por `502`.

**Fora do escopo da etapa**

- interface de upload e histórico;
- armazenamento permanente dos arquivos de áudio;
- recuperação de senha e administração.

**Entregáveis e resultados esperados**

- API completa de transcrições;
- registros associados à conta correta e arquivos descartados após o processamento.

**Critérios de aceite**

- áudio válido em formato permitido retorna `201`, persiste a transcrição com os campos
  previstos e não expõe `userId` desnecessariamente;
- uma requisição válida recebe `language` conforme o contrato, utiliza o valor no fluxo
  da integração com a Groq, persiste-o na transcrição e o devolve corretamente na
  criação, na listagem e no detalhe, sem introduzir enumeração própria de idiomas ou
  regras de validação além das definidas na seção 9.4;
- `language` ausente ou código ISO 639-1 inválido retorna `400` sem chamada à Groq;
- JWT de conta excluída retorna `401` antes de qualquer regra de negócio ou chamada à
  Groq;
- arquivo ausente ou formato inválido retorna `400`, e arquivo acima de 25 MB retorna
  `413` sem ser enviado à Groq;
- falha operacional da Groq retorna `502` sem resposta bruta, chave ou detalhe interno
  do provedor;
- o arquivo original não permanece armazenado após sucesso ou falha;
- a listagem retorna somente transcrições da conta autenticada, em ordem decrescente de
  `createdAt`, e retorna `[]` quando não houver registros;
- usuário A recebe `404` ao consultar ou excluir uma transcrição do usuário B, com o
  mesmo comportamento público de um identificador inexistente;
- exclusão do próprio registro retorna `204` e o remove do histórico;
- ao exceder o limite por `userId`, a criação retorna `429` e informa `Retry-After`;
- nome de arquivo é tratado apenas como dado de apresentação e não como caminho.

**Verificação humana esperada**

O usuário deve realizar requisições com áudio real e arquivos controlados para cada
classe de validação, consultar o banco e o local de processamento temporário, usar duas
contas para comprovar o isolamento e provocar de forma controlada uma falha da Groq e
o rate limiting.

**Condição para avançar**

Todo o contrato de transcrições deve estar aceito por API antes da criação de suas
telas.

**Commit conceitual**

`etapa 3: implementar transcrições e histórico no backend`

#### Etapa 4 — Frontend público, sessão e infraestrutura de estado

**Objetivo**

Construir a navegação pública e a infraestrutura de sessão e dados do frontend,
incluindo uma área autenticada protegida ainda sem suas funcionalidades completas.

**Dependências e pré-condições**

- Etapa 3 aceita e registrada;
- endpoints da Subetapa 2A disponíveis pelo proxy `/api`;
- frontend base da Etapa 0 iniciando no navegador.

**Escopo**

- React Router e rotas `/`, `/login` e `/register`;
- landing page com ações adequadas ao estado de autenticação;
- formulários públicos de login e cadastro;
- instância única do Axios e interceptors;
- Zustand com `user`, `accessToken` e persistência em `localStorage`;
- TanStack Query para configuração pública e dados do servidor;
- logout e descarte de cache privado;
- proteção básica de `/app` e estrutura de layout/navegação autenticada;
- restauração obrigatória da sessão e sincronização por `GET /api/users/me` antes de
  exibir conteúdo protegido;
- distinção entre `401` do login e `401` de requisição protegida;
- consumo de `GET /api/config/public` como dado público, deixando as telas de
  recuperação para a Subetapa 7B;
- estados de carregamento, sucesso e erro pertencentes aos fluxos desta etapa.

**Fora do escopo da etapa**

- upload, histórico e detalhe de transcrições;
- tela de perfil;
- `/forgot-password` e `/reset-password` funcionais;
- páginas e navegação administrativas.

**Entregáveis e resultados esperados**

- frontend público navegável;
- sessão persistida, restaurada, revalidada e encerrada conforme a seção 11;
- área protegida pronta para receber as funcionalidades seguintes.

**Critérios de aceite**

- visitante acessa a landing page, login e cadastro, enquanto usuário autenticado vê
  na landing page uma ação para `/app` sem redirecionamento automático;
- usuário autenticado que acessa `/login` ou `/register` é direcionado para `/app`;
- cadastro válido apresenta o resultado e permite seguir para o login; falhas da API
  são exibidas sem criar sessão;
- login válido armazena usuário e token e abre `/app`; `401` do login exibe erro de
  credenciais e não aciona limpeza global indevida;
- recarregar com dados persistidos restaura a sessão, consulta `GET /api/users/me` e
  não mostra conteúdo protegido enquanto a consulta estiver pendente;
- a sincronização atualiza `name`, `email` e `role` persistidos quando mudarem;
- falha de rede ou `5xx` na sincronização inicial preserva a sessão persistida e mantém
  o conteúdo protegido bloqueado, apresentando erro e permitindo nova tentativa;
- acesso a `/app` sem sessão leva a `/login`, e `401` de uma rota protegida limpa
  sessão e cache privado antes do redirecionamento;
- logout limpa estado, persistência e cache privado e direciona para `/login`;
- todas as requisições usam a instância central e caminhos relativos `/api`;
- erros da API são apresentados a partir do status HTTP e de `message`, aceitando
  mensagem única ou lista de validação sem depender de detalhes internos;
- a configuração pública é mantida no cache de servidor e nenhum segredo é armazenado
  no frontend.

**Verificação humana esperada**

O usuário deve reproduzir no navegador os fluxos público, cadastro, login, reload,
sincronização, logout e acesso protegido. Deve observar armazenamento e rede do
navegador para confirmar os caminhos relativos e provocar separadamente os dois tipos
de resposta `401`.

**Condição para avançar**

Sessão, comunicação e proteção de `/app` devem estar aceitas sem depender das telas
funcionais das etapas posteriores.

**Commit conceitual**

`etapa 4: implementar frontend público e infraestrutura de sessão`

#### Etapa 5 — Área autenticada de transcrição e histórico

**Objetivo**

Disponibilizar no frontend o fluxo completo de transcrição e consulta do histórico
pessoal já implementado no backend.

**Dependências e pré-condições**

- Etapa 4 aceita e registrada;
- API da Etapa 3 disponível;
- conta autenticada e integração Groq operacional para o teste de sucesso.

**Escopo**

- `/app` com seleção de arquivo, idioma, envio, processamento e resultado;
- cinco transcrições mais recentes, ordenadas por `createdAt` decrescente;
- `/app/history` com histórico completo;
- `/app/transcriptions/:id` com detalhe;
- exclusão com confirmação nas telas aplicáveis;
- estados de carregamento, erro, sucesso e ausência de dados;
- atualização ou invalidação coerente do cache após criação e exclusão;
- responsividade e exibição segura de texto e nomes de arquivos.

**Fora do escopo da etapa**

- perfil e autogerenciamento no frontend;
- recuperação de senha;
- administração;
- funcionalidades de edição, download ou armazenamento de áudio não previstas.

**Entregáveis e resultados esperados**

- tarefa principal do produto disponível em `/app`;
- histórico e detalhe coerentes com a API e isolados por sessão.

**Critérios de aceite**

- um áudio válido pode ser enviado no navegador e o texto recém-gerado é exibido após
  o processamento;
- o formulário exige o idioma e envia `language` como código ISO 639-1 válido, conforme
  a seção 9.4, apresentando o erro correspondente quando ausente ou inválido;
- arquivo ausente, formato inválido, tamanho excedido e falha da Groq produzem estados
  de erro distintos e compatíveis com os status da API;
- `/app` mostra no máximo os cinco registros mais recentes e não mostra o histórico
  completo;
- `/app/history` mostra todos os registros da conta ou um estado vazio quando não há
  dados;
- o detalhe abre o registro selecionado e apresenta estado de não encontrado para
  `404`, sem revelar dados de outra conta;
- exclusão só envia a requisição depois da confirmação, remove o registro da interface
  e atualiza `/app`, histórico e detalhe sem manter cache privado obsoleto;
- textos, nomes de arquivos e demais conteúdos retornados são exibidos pelo escaping
  normal do React, sem inserção como HTML arbitrário;
- as três telas permanecem utilizáveis em larguras de tela distintas.

**Verificação humana esperada**

O usuário deve executar no navegador um fluxo real de criação, navegação, abertura e
exclusão, conferir a rede e a ordenação, testar o estado vazio e reproduzir os erros de
entrada e de recurso não encontrado.

**Condição para avançar**

O fluxo completo de transcrição e histórico deve estar aceito no navegador e
corresponder às respostas já aceitas na Etapa 3.

**Commit conceitual**

`etapa 5: implementar área de transcrição e histórico`

#### Etapa 6 — Perfil e gerenciamento da própria conta no frontend

**Objetivo**

Expor em `/app/profile` as operações de autogerenciamento implementadas na Subetapa
2B.

**Dependências e pré-condições**

- Etapa 5 aceita e registrada;
- API da Subetapa 2B disponível;
- cenários controlados para usuário comum, único administrador e administrador não
  único.

**Escopo**

- visualização de nome, e-mail e `role`;
- edição do próprio nome e e-mail;
- alteração da senha mediante senha atual;
- exclusão destrutiva da própria conta, com confirmação explícita e senha atual;
- atualização do usuário no Zustand e no `localStorage` após alteração de perfil;
- limpeza completa de sessão e cache após exclusão;
- apresentação dos erros e do conflito do último administrador;
- estados e responsividade da tela.

**Fora do escopo da etapa**

- recuperação de senha sem sessão;
- gerenciamento administrativo de outras contas;
- alteração da própria `role`.

**Entregáveis e resultados esperados**

- tela única de perfil coerente com as rotas `/api/users/me`;
- estado local sincronizado com o resultado do backend.

**Critérios de aceite**

- a tela exibe somente os dados públicos atuais da conta;
- alteração válida de nome ou e-mail atualiza a tela, o estado persistido e o e-mail
  utilizado no próximo login;
- duplicidade de e-mail e campos inválidos apresentam o erro correspondente sem
  substituir os dados válidos existentes;
- troca válida de senha exige a senha atual, respeita a política e permite o login
  posterior somente com a nova senha;
- senha atual incorreta não altera a senha nem encerra indevidamente a sessão;
- a exclusão é visualmente destrutiva, requer confirmação e senha e só então envia a
  requisição;
- exclusão bem-sucedida remove sessão e cache e leva à área pública; tentativa do
  último administrador apresenta o `409` e mantém conta e sessão;
- a tela não oferece alteração de `role` e permanece utilizável em larguras distintas.

**Verificação humana esperada**

O usuário deve reproduzir no navegador todos os formulários com sucesso e falha,
recarregar após uma alteração para confirmar a persistência e verificar separadamente
a exclusão de usuário comum, a proteção do último administrador e a limpeza local.

**Condição para avançar**

Todas as operações de perfil devem estar aceitas no frontend sem utilizar rotas
administrativas.

**Commit conceitual**

`etapa 6: implementar gerenciamento do próprio perfil`

#### Subetapa 7A — Recuperação de senha no backend e envio por e-mail

**Objetivo**

Implementar e verificar isoladamente a recuperação de senha por token e Brevo no
backend, incluindo os estados habilitado e desabilitado.

**Dependências e pré-condições**

- Etapa 6 aceita e registrada;
- entidade `PasswordResetToken` da Etapa 1 disponível;
- autenticação da Subetapa 2A disponível;
- ambiente de teste controlado com remetente e credenciais da Brevo para o cenário
  habilitado.

**Escopo**

- `POST /api/auth/forgot-password`;
- `POST /api/auth/reset-password`;
- abstração do serviço transacional e integração backend → Brevo;
- geração criptograficamente aleatória, hash, expiração de 30 minutos, uso único e
  invalidação de tokens anteriores;
- invalidações após mudanças sensíveis e consumo único inclusive simultâneo, conforme
  a seção 6.3;
- link baseado em `APP_URL` no formato `/reset-password?token=<token>`;
- política de senha na redefinição;
- resposta indistinguível e registro seguro de falha operacional do provedor;
- rate limiting de solicitação e redefinição, com `429` e `Retry-After`;
- coerência de `GET /api/config/public` com a disponibilidade real da funcionalidade.

**Fora do escopo da subetapa**

- telas `/forgot-password` e `/reset-password`;
- qualquer envio de e-mail pelo frontend;
- novos provedores, endpoints ou mecanismos de autenticação.

**Entregáveis e resultados esperados**

- fluxo de recuperação integralmente utilizável pela API e pelo e-mail recebido;
- aplicação operando normalmente sem serviço de e-mail quando a funcionalidade estiver
  desabilitada.

**Critérios de aceite**

- com `PASSWORD_RESET_ENABLED=false`, o backend inicia sem configuração da Brevo,
  informa `passwordResetEnabled=false` e não tenta enviar e-mail; os dois endpoints
  retornam `403` por indisponibilidade sem executar seus fluxos, inclusive para token
  anteriormente emitido, independentemente de existir a conta;
- com a funcionalidade habilitada, configuração local obrigatória ausente ou inválida
  impede o startup, mas o startup não consulta externamente a Brevo para validar a
  chave;
- solicitações para e-mail existente e inexistente retornam o mesmo status e a mesma
  mensagem pública genérica;
- para conta existente, somente o hash do token é persistido, a expiração corresponde
  a 30 minutos e o link recebido usa o query parameter `token`;
- nova solicitação invalida tokens anteriores ainda válidos da mesma conta;
- com a recuperação habilitada, token válido e nova senha válida retornam `204`,
  alteram o hash da senha e invalidam todos os tokens ainda válidos da conta, incluindo
  o utilizado;
- com a recuperação habilitada, token inválido, expirado, já utilizado ou invalidado e
  senha fora da política retornam `400` sem alterar a senha;
- tentativas simultâneas de usar o mesmo token permitem no máximo uma redefinição
  bem-sucedida, sem prescrever infraestrutura adicional;
- tokens pendentes não permitem redefinição após alteração autenticada de senha ou
  e-mail bem-sucedida, conforme as regras já implementadas na Subetapa 2B;
- falha operacional da Brevo mantém a resposta pública genérica e produz registro
  interno sem token, senha, chave ou outro segredo;
- o forgot-password usa um único contador por combinação de origem e e-mail
  normalizado, consumido igualmente por contas existentes e inexistentes; o
  reset-password mantém o limite por origem; o excesso retorna `429` com `Retry-After`.

**Verificação humana esperada**

O usuário deve alternar de forma controlada a configuração, observar o startup e a
configuração pública, comparar as respostas para conta existente e inexistente,
receber um link em caixa de teste e verificar no banco hash, prazo, invalidações e uso
único. Também deve provocar uma falha operacional do provedor sem expor dados
sensíveis.

**Condição para avançar**

Os dois endpoints e o envio devem estar aceitos sem depender de qualquer tela de
recuperação.

**Commit conceitual**

`subetapa 7A: implementar recuperação de senha no backend`

#### Subetapa 7B — Recuperação de senha no frontend

**Objetivo**

Concluir no navegador o fluxo de recuperação já aceito na Subetapa 7A.

**Dependências e pré-condições**

- Subetapa 7A aceita e registrada;
- infraestrutura de sessão e configuração pública da Etapa 4 disponível;
- caixa de e-mail controlada para o cenário habilitado.

**Escopo**

- apresentação condicional de "Esqueci minha senha" no login;
- rota `/forgot-password` com estados habilitado e indisponível;
- rota `/reset-password?token=<token>` com os mesmos estados de disponibilidade;
- obtenção do token da URL e envio com `newPassword`;
- mensagem genérica após solicitação;
- estados claros para token inválido, expirado, utilizado ou ausente;
- sucesso com acesso ao login;
- validação da política de senha, estados assíncronos e responsividade.

**Fora do escopo da subetapa**

- mudanças no contrato ou no ciclo de tokens do backend;
- envio de e-mail diretamente pelo frontend;
- autenticação automática após redefinição.

**Entregáveis e resultados esperados**

- fluxo público de recuperação completo e orientado pela capacidade retornada pela
  API.

**Critérios de aceite**

- quando `passwordResetEnabled=false`, o login não promove a recuperação e o acesso
  direto a `/forgot-password` ou `/reset-password` mostra indisponibilidade sem
  formulário funcional, inclusive quando a URL contém token anteriormente válido;
- quando `true`, o login oferece a ação, a solicitação apresenta a mesma confirmação
  genérica para qualquer e-mail e não revela existência de conta;
- o link recebido abre `/reset-password?token=<token>`, e a tela envia exatamente esse
  token com a nova senha ao endpoint previsto;
- com a recuperação habilitada, token válido e senha válida apresentam sucesso e
  oferecem navegação para o login;
- token ausente, inválido, expirado ou já utilizado produz estado de erro claro e não
  apresenta a operação como concluída;
- erros de rate limiting e indisponibilidade são apresentados sem expor informação
  sensível; `403` de recuperação desabilitada não encerra uma sessão existente;
- as telas permanecem utilizáveis em larguras distintas.

**Verificação humana esperada**

O usuário deve reproduzir no navegador os estados desabilitado e habilitado, solicitar
recuperação para e-mails existente e inexistente, abrir o link real recebido e testar
sucesso, reutilização e token inválido ou expirado.

**Condição para avançar**

As duas rotas públicas devem estar aceitas no navegador, sem depender de qualquer
funcionalidade administrativa.

**Commit conceitual**

`subetapa 7B: implementar recuperação de senha no frontend`

#### Subetapa 8A — Administração no backend

**Objetivo**

Implementar a API de gerenciamento administrativo exclusivamente para outras contas,
com autorização baseada na role atual persistida.

**Dependências e pré-condições**

- Subetapa 7B aceita e registrada;
- APIs de identidade e autogerenciamento aceitas;
- cenários controlados com usuário comum, dois administradores e contas-alvo.

**Escopo**

- `GET /api/users`;
- `GET /api/users/:id`;
- `PATCH /api/users/:id`;
- `DELETE /api/users/:id`;
- Guard e autorização administrativa usando a role atual da conta;
- edição de nome, e-mail e `role` somente de outras contas;
- proibição administrativa de autoedição e autoexclusão;
- proteção do último administrador;
- normalização, unicidade, rejeição de campos e cascatas;
- invalidação dos tokens pendentes após alteração administrativa bem-sucedida de e-mail;
- respostas públicas sem `passwordHash`.

**Fora do escopo da subetapa**

- páginas `/app/admin`;
- gerenciamento da própria conta pelas rotas administrativas;
- novas permissões, papéis ou operações administrativas.

**Entregáveis e resultados esperados**

- contrato administrativo completo e verificável por API;
- mudança de role com efeito imediato na autorização do backend.

**Critérios de aceite**

- usuário comum recebe `403` em todas as rotas administrativas;
- administrador lista contas e consulta uma conta por id, incluindo a própria na
  leitura, sem receber `passwordHash`;
- conta inexistente retorna `404`;
- administrador altera nome, e-mail ou role de outra conta e recebe `200`; dados
  inválidos retornam `400` e e-mail duplicado retorna `409`;
- alteração administrativa bem-sucedida de e-mail invalida os tokens pendentes da
  conta alterada, que não podem mais redefinir sua senha;
- tentativa de `PATCH` ou `DELETE` administrativo sobre a própria conta retorna `403`
  antes da aplicação da regra do último administrador;
- a proteção do último administrador respeita a precedência da seção 9.5; a
  autoexclusão legítima por `DELETE /api/users/me` mantém o `409` quando ele for o único;
- operações administrativas preservam a invariável da seção 8 inclusive quando
  simultâneas;
- exclusão válida de outra conta retorna `204` e remove suas transcrições e tokens;
- depois de ser rebaixado, um usuário perde acesso administrativo em nova requisição
  mesmo que apresente JWT emitido quando ainda era admin;
- nenhuma autorização confia apenas em `role` ou `userId` enviados pelo cliente.

**Verificação humana esperada**

O usuário deve executar a matriz de requisições com tokens de usuário e administrador,
testar auto-operações, proteção do último administrador e cascatas e reutilizar o JWT
antigo de uma conta rebaixada para comprovar a consulta da role atual.

**Condição para avançar**

Todas as rotas administrativas devem estar aceitas por API antes de qualquer tela
administrativa ser criada.

**Commit conceitual**

`subetapa 8A: implementar administração no backend`

#### Subetapa 8B — Administração no frontend

**Objetivo**

Disponibilizar as telas administrativas para gerenciar outras contas, preservando o
perfil como único local de autogerenciamento.

**Dependências e pré-condições**

- Subetapa 8A aceita e registrada;
- infraestrutura de sessão da Etapa 4 e perfil da Etapa 6 disponíveis;
- contas controladas com roles distintas.

**Escopo**

- navegação administrativa visível somente para `role = admin`;
- `/app/admin` com listagem de usuários;
- `/app/admin/users/:id` com leitura e operações permitidas;
- edição e mudança de role de outras contas;
- exclusão de outras contas;
- confirmações de mudança de privilégio e ação destrutiva;
- orientação para `/app/profile` ao abrir a própria conta;
- atualização e invalidação do cache administrativo;
- estados de carregamento, erro, vazio, sucesso e responsividade.

**Fora do escopo da subetapa**

- autorização baseada apenas no frontend;
- edição, mudança de role ou exclusão administrativa da própria conta;
- novas funções administrativas não previstas.

**Entregáveis e resultados esperados**

- área administrativa coerente com a API e sem exposição de conteúdo a usuários
  comuns.

**Critérios de aceite**

- usuário comum não vê navegação administrativa e não visualiza conteúdo ao tentar
  abrir `/app/admin` ou suas subrotas;
- administrador vê a lista, inclusive a própria conta, e pode abrir detalhes;
- ao abrir a própria conta, não existem ações de edição, role ou exclusão, e a tela
  orienta o uso de `/app/profile`;
- ao abrir outra conta, alterações válidas atualizam lista e detalhe; mudança de role e
  exclusão somente ocorrem após confirmação explícita;
- conflitos do último administrador e demais erros da API são apresentados sem
  contornar a decisão do backend;
- após exclusão, os dados da conta deixam de aparecer no cache e na lista;
- uma `role = admin` obsoleta mantida no frontend nunca autoriza uma operação no
  backend: a operação administrativa é negada com `403` e o frontend respeita e
  apresenta essa negativa, sem exigir sincronização automática como consequência de
  qualquer `403`;
- na próxima sincronização da sessão por `GET /api/users/me` ou no próximo reload, a
  role atual substitui a role persistida e a navegação administrativa desaparece
  quando a conta não for mais administradora;
- as telas exibem estados aplicáveis e permanecem utilizáveis em larguras distintas.

**Verificação humana esperada**

O usuário deve navegar com uma conta comum e uma administrativa, inspecionar a própria
conta do administrador, editar e excluir outra conta, testar confirmações e conflitos e
observar a atualização do cache após cada operação.

**Condição para avançar**

Backend e frontend administrativos devem estar aceitos separadamente, e nenhuma ação
administrativa sobre a própria conta pode estar disponível.

**Commit conceitual**

`subetapa 8B: implementar administração no frontend`

#### Etapa 9 — Consolidação dos controles transversais de segurança e abuso

**Objetivo**

Revisar, testar em conjunto e corrigir regressões nos controles transversais já
introduzidos com as funcionalidades anteriores.

**Dependências e pré-condições**

- Subetapa 8B aceita e registrada;
- todos os endpoints e fluxos funcionais disponíveis;
- dados e contas controlados para testes de autorização, abuso e conteúdo não
  confiável.

**Escopo**

- regressão de rate limiting, identificadores, `429` e `Retry-After`;
- regressão de CORS por ambiente;
- revisão de DTOs, normalização e rejeição de campos não permitidos;
- revisão de autenticação, autorização, propriedade e role atual;
- revisão de respostas, logs, configuração e tratamento de falhas quanto a segredos,
  stack traces e detalhes internos;
- revisão do escaping de nomes, arquivos e transcrições;
- consistência da política de senha, bcrypt, uploads e tokens de recuperação;
- correção de falhas encontradas nos controles que deveriam ter sido implementados nas
  unidades correspondentes.

Esta etapa não é a primeira implementação de validação, autorização, propriedade,
rate limiting, CORS, escaping ou proteção de segredos. A ausência planejada de qualquer
um desses controles em uma etapa anterior constitui falha de aceite daquela etapa, não
trabalho a ser deliberadamente adiado para esta.

**Fora do escopo da etapa**

- novos endpoints, telas ou funcionalidades;
- alteração dos limites, contratos ou tecnologias definidos;
- substituição da autenticação JWT ou inclusão de refresh token.

**Entregáveis e resultados esperados**

- matriz de regressão dos controles das seções 12 e 13;
- correções delimitadas de inconsistências encontradas, sem mudança de produto.

**Critérios de aceite**

- cada uma das cinco rotas limitadas produz `429` e `Retry-After` após o limite
  configurado, usando um único contador por combinação de origem e e-mail normalizado
  no login e forgot-password, por origem no cadastro e reset-password e por `userId`
  na transcrição, conforme o contrato;
- o forgot-password aplica a mesma limitação e resposta pública exista ou não a conta;
- origem CORS permitida recebe os cabeçalhos esperados e origem não prevista não é
  autorizada, sem curinga desnecessário;
- campos não declarados nos DTOs são rejeitados e normalizações produzem resultados
  iguais em cadastro, login, perfil e recuperação;
- JWT ausente, inválido, expirado ou associado a conta inexistente retorna `401` antes
  de regras de negócio; falta de permissão administrativa retorna `403`; propriedade
  de transcrição alheia permanece indistinguível por `404`;
- role administrativa obsoleta no JWT não concede acesso depois do rebaixamento;
- respostas públicas de erro não contêm stack trace, SQL, detalhes internos de
  infraestrutura ou resposta bruta de provedor;
- respostas de erro e logs não contêm senhas, JWTs, tokens de recuperação, chaves,
  `passwordHash`, segredos ou demais credenciais; logs podem conter diagnóstico técnico
  sanitizado conforme a seção 12.9, sem parâmetros sensíveis;
- conteúdo contendo marcação é exibido como texto pelo frontend e não executado como
  HTML;
- upload inválido, limite de 25 MB, política de senha, faixa de `10` a `15` do bcrypt
  com padrão `12` e ciclo de tokens continuam coerentes após a integração completa.

**Verificação humana esperada**

O usuário deve executar a matriz de requisições e origens controladas, observar
status, cabeçalhos, corpos e logs e reproduzir no navegador conteúdo não confiável. A
evidência deve demonstrar regressão dos controles já existentes, não apenas inspeção
visual do código.

**Condição para avançar**

Nenhum controle transversal previsto pode estar ausente ou regressivo, e qualquer
correção deve preservar os contratos já aceitos.

**Commit conceitual**

`etapa 9: consolidar controles transversais de segurança`

#### Etapa 10 — Operação local, documentação e revisão integrada

**Objetivo**

Tornar a aplicação completa reproduzível e operável localmente a partir da
documentação, sem alterar suas funcionalidades.

**Dependências e pré-condições**

- Etapa 9 aceita e registrada;
- aplicação funcional completa;
- ambiente controlado no qual seja possível repetir uma instalação nova ou
  equivalente.

**Escopo**

- `start.sh` e `stop.sh` em Bash;
- `.runtime/`, logs e arquivos PID;
- tratamento de processos existentes, PIDs obsoletos e inicialização parcial;
- preservação do volume no encerramento comum;
- `README.md` final com setup, bootstrap, operação, reset explícito do banco e comandos
  manuais equivalentes para ambientes sem Bash;
- declaração exigida sobre ferramentas e modelos de IA e etapas de uso;
- `AGENTS.md` final alinhado às restrições arquiteturais;
- `.env.example`, `.gitignore` e `docker-compose.yml` finais;
- revisão da versão reproduzível do Node.js, dos lockfiles e dos arquivos versionados.

**Fora do escopo da etapa**

- novas funcionalidades ou endpoints;
- deploy, HTTPS, VPS, Traefik ou migrações de produção;
- instalação silenciosa de dependências pelos scripts;
- execução direta presumida dos scripts Bash em PowerShell.

**Entregáveis e resultados esperados**

- procedimento completo de execução do zero;
- inicialização e encerramento seguros do ambiente local;
- documentação operacional suficiente para uma pessoa reproduzir o projeto.

**Critérios de aceite**

- uma instalação limpa ou procedimento controlado equivalente conclui `npm ci` nos
  dois projetos, prepara `.env`, inicia PostgreSQL, executa o bootstrap e inicia
  backend e frontend seguindo o README;
- `start.sh` aguarda o banco saudável, inicia um único backend e frontend, registra os
  PIDs corretos e direciona os logs para `.runtime/`;
- nova execução não duplica processos válidos, e PID obsoleto ou falha parcial é
  tratado e informado sem deixar novo processo sem controle;
- `stop.sh` valida a identidade dos processos, encerra somente os registrados, remove
  PIDs obsoletos e executa `docker compose down` sem remover o volume;
- os dados persistem após o ciclo normal de parada e reinício, e o reset do volume
  exige ação explícita documentada;
- os comandos manuais documentados permitem operar backend, frontend e banco quando os
  scripts Bash não forem usados;
- o README contém os comandos efetivos, o bootstrap e a obrigação de declaração de IA
  preenchida com ferramentas, modelos e etapas reais;
- `.env.example` contém todos os nomes previstos sem segredo real, e arquivos locais,
  dependências, áudio de teste, logs, PIDs e volume permanecem ignorados;
- README, AGENTS.md e especificação não se contradizem nem duplicam integralmente seus
  conteúdos.

**Verificação humana esperada**

O usuário deve seguir o README em ambiente limpo ou controladamente reinicializado,
executar os scripts Bash quando disponíveis, repetir start e stop nos casos normais e
de PID obsoleto, confirmar a persistência e percorrer os comandos manuais equivalentes.
Também deve inspecionar os arquivos destinados ao versionamento e a declaração de IA.

**Condição para avançar**

Outra pessoa deve conseguir instalar, iniciar, usar e encerrar a aplicação somente com
as instruções versionadas, sem receber segredo nem depender de estado oculto da máquina
do desenvolvedor.

**Commit conceitual**

`etapa 10: finalizar operação local e documentação`

#### Etapa 11 — Verificação final e preparação da entrega

**Objetivo**

Executar a regressão completa e preparar o material de entrega sem adicionar
funcionalidade.

**Dependências e pré-condições**

- Etapa 10 aceita e registrada;
- todos os commits anteriores presentes;
- ambiente e contas controlados para regressão;
- credenciais de teste das integrações disponíveis quando necessárias.

**Escopo**

- regressão funcional completa de backend e frontend;
- build dos dois projetos pelos comandos existentes e documentados;
- repetição do procedimento do README;
- revisão de arquivos versionados, ignorados e documentação;
- preparação do `.zip` e inspeção explícita de seu conteúdo.

**Fora do escopo da etapa**

- novas funcionalidades, refatorações opcionais ou mudanças de contrato;
- deploy ou infraestrutura de produção;
- correções não relacionadas a falhas observadas na regressão.

**Entregáveis e resultados esperados**

- evidências finais dos fluxos e builds;
- documentação coerente com a implementação entregue;
- pacote final sem artefatos locais ou segredos.

**Critérios de aceite**

- cadastro, login, restauração e encerramento de sessão são reproduzidos com sucesso e
  falha nos casos relevantes;
- perfil, troca de senha, exclusão própria e proteção do último administrador mantêm os
  contratos aceitos;
- transcrição real, cinco recentes, histórico, detalhe, exclusão e isolamento entre
  duas contas são reproduzidos;
- recuperação de senha é verificada habilitada e desabilitada, incluindo token,
  resposta indistinguível e falha operacional segura;
- administração permite operações sobre outras contas e bloqueia usuário comum,
  auto-operação administrativa, último administrador e role obsoleta;
- rate limiting, CORS, rejeição de campos, escaping e ausência de detalhes sensíveis
  passam novamente pela matriz da Etapa 9;
- todas as rotas públicas, autenticadas e administrativas apresentam seus estados
  relevantes no navegador e permanecem responsivas;
- os builds de backend e frontend terminam com sucesso usando os scripts existentes;
- a execução do zero conforme o README termina com a aplicação acessível e operável;
- especificação, README e AGENTS.md correspondem ao comportamento observado;
- o material de entrega não contém `.env`, `node_modules`, `.runtime`, logs, arquivos
  PID, áudio de teste, volume de banco, credenciais ou segredos;
- a declaração de IA está presente e corresponde às ferramentas, aos modelos e às
  etapas efetivamente utilizados;
- o conteúdo do `.zip` é listado e inspecionado antes da entrega e contém somente o
  material previsto.

**Verificação humana esperada**

O usuário deve acompanhar as saídas dos builds e da execução limpa, percorrer a matriz
funcional no navegador e por API, revisar os arquivos finais e inspecionar a listagem
do pacote. Falha em qualquer item exige correção e nova regressão afetada antes do
registro final.

**Condição para avançar**

A entrega somente pode ser realizada quando todos os critérios estiverem observados e
o conteúdo final tiver sido inspecionado. Esta é a última etapa e não autoriza uma nova
etapa funcional.

**Commit conceitual**

`etapa 11: validar e preparar entrega final`

### 15.4 Regras para os critérios de aceite

- cada unidade deve cobrir os caminhos de sucesso e os erros que representam suas
  regras importantes, sem repetir dezenas de variações equivalentes;
- os status HTTP devem ser exatamente os definidos na seção 9;
- verificações automatizáveis devem ser separadas das verificações manuais de interface;
- comportamento verificável por terminal, API ou banco não deve ser aceito somente por
  inspeção visual;
- verificações no navegador devem observar também rede, sessão e estados relevantes,
  não apenas aparência;
- arquivos, contas, caixas de e-mail e credenciais utilizados em teste devem ser
  controlados e nunca versionados;
- nenhuma unidade pode depender, para ser aceita, de tela, endpoint, script ou
  integração programada somente para uma unidade posterior;
- um critério que dependa de uma unidade anterior pressupõe que ela já esteja aceita e
  não substitui a regressão necessária do comportamento integrado;
- o agente pode fornecer evidências auxiliares, mas o aceite exige que o usuário
  observe os resultados esperados no próprio ambiente.

### 15.5 Disciplina entre etapas

- uma unidade não deve modificar deliberadamente funcionalidades reservadas a unidades
  futuras;
- refatorações de código anterior são permitidas quando forem necessárias à unidade
  atual, justificadas no plano e acompanhadas de regressão do comportamento afetado;
- qualquer mudança de contrato deve ser atualizada nesta especificação antes ou junto
  da implementação correspondente;
- se uma etapa revelar erro, contradição ou lacuna na especificação, a especificação
  deve ser corrigida e aprovada antes de continuar construindo sobre a decisão;
- uma falha encontrada em funcionalidade já aceita deve ser corrigida de forma
  delimitada e ter seus critérios afetados verificados novamente;
- cada commit deve representar uma única etapa ou subetapa aceita, ou uma correção
  posterior claramente delimitada;
- subetapas não devem compartilhar um único commit de conclusão;
- várias unidades ainda não verificadas não devem ser acumuladas em um único commit;
- somente a conclusão humana e registrada da unidade atual autoriza o início da
  seguinte.
