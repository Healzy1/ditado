# Ditado

Aplicacao web full stack para transcrever arquivos de audio. O backend NestJS persiste dados no PostgreSQL e chama a Groq; o frontend React/Vite consome a API por `/api`.

## Funcionalidades

- cadastro, login e sessao JWT;
- perfil, troca de senha e exclusao da propria conta;
- recuperacao de senha por e-mail, quando habilitada;
- envio de audio, transcricao pela Groq e historico pessoal;
- administracao de outras contas por usuarios `admin`.

## Pre-requisitos

- Bash em Linux, WSL ou ambiente equivalente para `start.sh` e `stop.sh`;
- Node.js `22.22.1`, registrado em `.nvmrc` (o projeto exige no minimo `22.12.0`);
- npm compativel com a versao ativa do Node;
- Docker com Docker Compose e acesso ao daemon;
- credencial da Groq para executar transcricoes.

```bash
nvm use
node --version
npm --version
docker compose version
```

Os scripts Bash nao presumem execucao direta em PowerShell. Em ambientes sem Bash, use os comandos manuais abaixo.

## Instalacao e configuracao

Backend e frontend possuem lockfiles independentes. A instalacao reproduzivel usa `npm ci`:

```bash
npm --prefix backend ci
npm --prefix frontend ci
cp backend/.env.example backend/.env
```

Edite somente `backend/.env`. Ele nao e versionado. Configure pelo menos:

- `JWT_SECRET`: segredo aleatorio com ao menos 32 bytes;
- `GROQ_API_KEY`: credencial real da Groq;
- os valores de banco ja compativeis com o Docker Compose local.

Para gerar um valor de JWT no terminal, sem grava-lo em arquivos versionados:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

`backend/.env.example` documenta todas as variaveis. `PASSWORD_RESET_ENABLED=false` permite iniciar sem Brevo. Ao habilitar a recuperacao, tambem configure `BREVO_API_KEY`, `EMAIL_FROM` e um `APP_URL` valido; o startup valida a configuracao local, sem testar credenciais externas.

## PostgreSQL e primeiro administrador

O Docker Compose executa somente PostgreSQL 17, publicado em `127.0.0.1:5432` e persistido no volume `postgres_data`.

```bash
docker compose up -d
docker compose ps
docker compose exec -T postgres pg_isready -U ditado -d ditado
```

Depois que o banco estiver saudavel, crie o primeiro administrador. O cadastro publico cria apenas usuarios comuns.

```bash
export ADMIN_NAME="Administrador"
export ADMIN_EMAIL="admin@localhost.test"
read -r -s -p "ADMIN_PASSWORD: " ADMIN_PASSWORD
printf '\n'
export ADMIN_PASSWORD
npm --prefix backend run bootstrap:admin
```

O bootstrap normaliza nome e e-mail, valida a senha e e idempotente quando o mesmo e-mail ja pertence a um administrador. Nunca versione `ADMIN_PASSWORD` ou outros valores reais de `ADMIN_*`.

## Operacao por scripts

Depois da instalacao e configuracao iniciais, inicie o ambiente a partir da raiz:

```bash
bash start.sh
```

`start.sh` verifica ferramentas, Node, `backend/.env`, dependencias e portas; inicia o PostgreSQL, aguarda o healthcheck e inicia backend e frontend separadamente. Os PIDs e logs ficam em `.runtime/`:

```text
.runtime/backend.pid
.runtime/frontend.pid
.runtime/backend.log
.runtime/frontend.log
```

Uma nova execucao reutiliza somente processos validos registrados pelo projeto. Se `3000` ou `5173` estiverem ocupadas por processos externos, o script falha sem encerra-los.

Para encerrar somente processos registrados pelo projeto e parar o PostgreSQL sem remover dados:

```bash
bash stop.sh
```

`stop.sh` valida PID, diretorio, comando e grupo de processo antes de encerrar backend ou frontend. Registros obsoletos sao removidos sem sinalizar processos desconhecidos. Os logs permanecem em `.runtime/` para diagnostico e sao substituidos na proxima inicializacao.

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Proxy Vite: `http://localhost:5173/api/...` encaminha para o backend.

## Operacao manual

Em terminais separados, os comandos equivalentes sao:

```bash
docker compose up -d
docker compose exec -T postgres pg_isready -U ditado -d ditado
npm --prefix backend run start:dev
npm --prefix frontend run dev
```

Para encerrar manualmente, interrompa os dois processos Node nos respectivos terminais e execute:

```bash
docker compose down
```

O encerramento normal preserva o volume. Para apagar intencionalmente todos os dados locais do PostgreSQL, execute somente quando desejar resetar o ambiente:

```bash
docker compose down -v
```

## Verificacoes

```bash
npm --prefix backend run lint
npm --prefix backend run test
npm --prefix backend run test:e2e
npm --prefix backend run build
npm --prefix frontend run lint
npm --prefix frontend run build
```

O frontend nao possui script de testes automatizados. Com o ambiente iniciado, confirme a configuracao publica pelo backend e pelo proxy:

```bash
curl --fail http://localhost:3000/api/config/public
curl --fail http://localhost:5173/api/config/public
```

## Estrutura essencial

- `backend/`: API NestJS, regras de negocio, PostgreSQL, Groq e Brevo;
- `frontend/`: aplicacao React/Vite;
- `docker-compose.yml`: apenas PostgreSQL local;
- `start.sh` e `stop.sh`: operacao local em Bash;
- `docs/ESPECIFICACAO.md`: requisitos e contratos do produto;
- `AGENTS.md`: regras de trabalho para agentes.

## Uso de Inteligencia Artificial

- ChatGPT - GPT-5.6 Sol: utilizado no apoio a elaboracao e refinamento da especificacao, planejamento das etapas, revisao de planos e builds e validacao do projeto.
- OpenCode: utilizado como ambiente/agente de desenvolvimento para inspecao do repositorio, implementacao, execucao de testes e verificacoes operacionais.
- GPT-5.6 Terra - Medium: utilizado diretamente no OpenCode como modelo principal durante o desenvolvimento.
- Muse Spark 1.3 High: utilizado pontualmente no OpenCode durante a Etapa 1; a implementacao correspondente foi posteriormente refeita com o modelo principal.
