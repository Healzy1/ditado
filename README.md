# Ditado

Aplicação web full stack para transcrever arquivos de áudio. O backend NestJS persiste dados no PostgreSQL e chama a Groq; o frontend React/Vite consome a API por `/api`.

## Funcionalidades

- cadastro, login e sessão JWT;
- perfil, troca de senha e exclusão da própria conta;
- recuperação de senha por e-mail, quando habilitada;
- envio de áudio, transcrição pela Groq e histórico pessoal;
- administração de outras contas por usuários `admin`.

## Pré-requisitos

- Bash em Linux, WSL ou ambiente equivalente para `start.sh` e `stop.sh`;
- Node.js `22.22.1`, registrado em `.nvmrc` (o projeto exige no mínimo `22.12.0`);
- npm compatível com a versão ativa do Node;
- Docker com Docker Compose e acesso ao daemon;
- credencial da Groq para executar transcrições.

```bash
nvm use
node --version
npm --version
docker compose version
```

Os scripts Bash não presumem execução direta em PowerShell. Em ambientes sem Bash, use os comandos manuais abaixo.

## Instalação e configuração

Backend e frontend possuem lockfiles independentes. A instalação reproduzível usa `npm ci`:

```bash
npm --prefix backend ci
npm --prefix frontend ci
cp backend/.env.example backend/.env
```

Edite somente `backend/.env`. Ele não é versionado. Configure pelo menos:

- `JWT_SECRET`: segredo aleatório com ao menos 32 bytes;
- `GROQ_API_KEY`: credencial real da Groq;
- os valores de banco já compatíveis com o Docker Compose local.

Para gerar um valor de JWT no terminal, sem gravá-lo em arquivos versionados:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

`backend/.env.example` documenta todas as variáveis. Nesta entrega, `PASSWORD_RESET_ENABLED=false`. O Brevo permanece uma configuração opcional para uso futuro. Ao habilitar a recuperação, também configure `BREVO_API_KEY`, `EMAIL_FROM` e um `APP_URL` válido; o startup valida a configuração local, sem testar credenciais externas.

## PostgreSQL e primeiro administrador

O Docker Compose executa somente PostgreSQL 17, publicado em `127.0.0.1:5432` e persistido no volume `postgres_data`.

```bash
docker compose up -d
docker compose ps
docker compose exec -T postgres pg_isready -U ditado -d ditado
```

Depois que o banco estiver saudável, crie o primeiro administrador. O cadastro público cria apenas usuários comuns.

```bash
export ADMIN_NAME="Administrador"
export ADMIN_EMAIL="admin@localhost.test"
read -r -s -p "ADMIN_PASSWORD: " ADMIN_PASSWORD
printf '\n'
export ADMIN_PASSWORD
npm --prefix backend run bootstrap:admin
```

O bootstrap normaliza nome e e-mail, valida a senha e é idempotente quando o mesmo e-mail já pertence a um administrador. Nunca versione `ADMIN_PASSWORD` ou outros valores reais de `ADMIN_*`.

## Operação por scripts

Depois da instalação e configuração iniciais, inicie o ambiente a partir da raiz:

```bash
bash start.sh
```

`start.sh` verifica ferramentas, Node, `backend/.env`, dependências e portas; inicia o PostgreSQL, aguarda o healthcheck e inicia backend e frontend separadamente. Os PIDs e logs ficam em `.runtime/`:

```text
.runtime/backend.pid
.runtime/frontend.pid
.runtime/backend.log
.runtime/frontend.log
```

Uma nova execução reutiliza somente processos válidos registrados pelo projeto. Se `3000` ou `5173` estiverem ocupadas por processos externos, o script falha sem encerrá-los.

Para encerrar somente processos registrados pelo projeto e parar o PostgreSQL sem remover dados:

```bash
bash stop.sh
```

`stop.sh` valida PID, diretório, comando e grupo de processo antes de encerrar backend ou frontend. Registros obsoletos são removidos sem sinalizar processos desconhecidos. Os logs permanecem em `.runtime/` para diagnóstico e são substituídos na próxima inicialização.

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Proxy Vite: `http://localhost:5173/api/...` encaminha para o backend.

## Operação manual

Em terminais separados, os comandos equivalentes são:

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

## Verificações

```bash
npm --prefix backend run lint
npm --prefix backend run test
npm --prefix backend run test:e2e
npm --prefix backend run build
npm --prefix frontend run lint
npm --prefix frontend run build
```

O frontend não possui script de testes automatizados. Com o ambiente iniciado, confirme a configuração pública pelo backend e pelo proxy:

```bash
curl --fail http://localhost:3000/api/config/public
curl --fail http://localhost:5173/api/config/public
```

## Estrutura essencial

- `backend/`: API NestJS, regras de negócio, PostgreSQL, Groq e Brevo;
- `frontend/`: aplicação React/Vite;
- `docker-compose.yml`: apenas PostgreSQL local;
- `start.sh` e `stop.sh`: operação local em Bash;
- `docs/ESPECIFICACAO.md`: requisitos e contratos do produto;
- `AGENTS.md`: regras de trabalho para agentes.

## Uso de Inteligência Artificial

- ChatGPT - GPT-5.6 Sol: utilizado no apoio à elaboração e ao refinamento da especificação, planejamento das etapas, revisão de planos e builds e validação do projeto.
- OpenCode: utilizado como ambiente/agente de desenvolvimento para inspeção do repositório, implementação, execução de testes e verificações operacionais.
- GPT-5.6 Terra - Medium: utilizado diretamente no OpenCode como modelo principal durante o desenvolvimento.
- Muse Spark 1.3 High: utilizado pontualmente no OpenCode durante a Etapa 1; a implementação correspondente foi posteriormente refeita com o modelo principal.
