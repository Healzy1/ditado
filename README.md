# Ditado

Fundacao local do projeto full-stack Ditado, com API NestJS, frontend React/Vite e PostgreSQL 17.

## Pre-requisitos

- Node.js 22.12.0 ou superior. A versao adotada esta em `.nvmrc`.
- npm compativel com a versao ativa do Node.js.
- Docker com Docker Compose e acesso ao daemon.

Confira a versao ativa diretamente:

```bash
node --version
docker info
docker compose version
```

O uso de NVM e opcional. Quando estiver instalado, `nvm use` seleciona a versao registrada.

## Instalacao

Backend e frontend possuem manifests e lockfiles independentes:

```bash
cd backend
npm ci
cd ../frontend
npm ci
```

## Configuracao local

Crie a configuracao real do backend sem versiona-la:

```bash
cp backend/.env.example backend/.env
```

Preencha em `backend/.env` pelo menos `JWT_SECRET` e `GROQ_API_KEY`. O segredo JWT deve conter ao menos 32 bytes gerados de forma criptograficamente segura. A aplicacao nao gera segredos automaticamente e nao valida credenciais externas durante o startup.

Com `PASSWORD_RESET_ENABLED=false`, as variaveis da Brevo podem permanecer vazias. Quando a opcao for `true`, `BREVO_API_KEY`, `EMAIL_FROM` e `APP_URL` validas tornam-se obrigatorias.

## PostgreSQL

Inicie somente o banco no Docker:

```bash
docker compose up -d
docker compose ps
docker compose exec -T postgres pg_isready -U ditado -d ditado
```

O PostgreSQL fica publicado apenas em `127.0.0.1:5432` e persiste dados no volume nomeado `postgres_data`.

Para encerrar sem excluir os dados:

```bash
docker compose down
```

## Desenvolvimento

Inicie o backend em um terminal:

```bash
cd backend
npm run start:dev
```

Inicie o frontend em outro terminal:

```bash
cd frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Proxy de desenvolvimento: requisicoes relativas para `/api` sao encaminhadas ao backend.

Ainda nao existem rotas funcionais. Uma requisicao a `/api/foundation-probe` deve chegar ao backend e retornar `404` no formato seguro do NestJS.

## Verificacoes

Backend:

```bash
cd backend
npm run lint
npm run test
npm run test:e2e
npm run build
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

O frontend ainda nao possui framework ou script de testes. A documentacao operacional completa, o bootstrap administrativo e os scripts `start.sh` e `stop.sh` pertencem a etapas posteriores.
