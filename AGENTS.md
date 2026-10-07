# AGENTS.md — Ditado

Este arquivo define como agentes devem trabalhar neste repositório. Ele não substitui a especificação do produto.

## 1. Fontes de verdade e precedência

- `docs/ESPECIFICACAO.md` é a fonte de verdade para requisitos, contratos, comportamento, segurança e critérios de aceite.
- Este `AGENTS.md` define o modo de trabalho dos agentes: planejamento, execução, verificação, alterações de arquivos e Git.
- `docs/Aula-07-Aplicacao-Web-Full-Stack.pdf` é referência da disciplina e da arquitetura quando pertinente; não prevalece sobre decisões explícitas da especificação.
- A solicitação aprovada para a tarefa corrente delimita o trabalho. Ela não autoriza contrariar silenciosamente a especificação.
- Se houver contradição, ambiguidade relevante ou necessidade de ampliar o escopo, interromper a mudança e pedir decisão ao responsável. Não escolher silenciosamente uma interpretação.
- Consultar diretamente a seção aplicável da especificação em vez de reproduzir neste arquivo contratos extensos, listas de endpoints ou critérios completos.

## 2. Stack e ambiente do projeto

- Monorepo com `backend/`, `frontend/`, documentação e arquivos operacionais na raiz.
- Backend: NestJS, TypeScript, `@nestjs/config`, TypeORM, PostgreSQL, JWT/Passport, `bcryptjs`, `class-validator`, `class-transformer` e Multer.
- Frontend: React, Vite, TypeScript, React Router DOM, Axios, TanStack Query, Zustand, React Hook Form, Zod, Tailwind CSS v4 com `@tailwindcss/vite` e Lucide React.
- PostgreSQL 17 Alpine é executado por Docker. Backend e frontend são executados localmente, conforme a especificação.
- O ambiente deve usar Node.js 22.12 ou superior. Node.js 20 não é suportado.
- A versão adotada do Node deve ser registrada de forma reproduzível no repositório quando o scaffold for criado.
- Usar npm compatível com a versão adotada do Node. Versionar `package-lock.json` e usar `npm ci` quando houver lockfile.
- Não adicionar pipeline de CI ou infraestrutura de produção.

## 3. Organização arquitetural

- Respeitar a estrutura de módulos e responsabilidades da Seção 14.2 da especificação.
- No backend, manter os domínios `auth`, `users` e `transcriptions`; manter elementos compartilhados em `common` apenas quando forem realmente compartilhados.
- Recuperação de senha pertence a `auth`; não criar módulo `password-reset` separado.
- O envio por Brevo fica encapsulado em `auth/email/`.
- A comunicação com a Groq fica encapsulada internamente no domínio de transcrições.
- Controllers tratam a fronteira HTTP, recebem dados submetidos à validação definida por DTOs/pipes e delegam o processamento. Não contêm regra de negócio, não acessam `Repository` e não chamam Groq ou Brevo diretamente.
- Services concentram regras de negócio e o acesso à persistência.
- DTOs representam e validam entradas; Entities representam persistência.
- Guards tratam autenticação e autorização.
- `UsersModule` exporta `UsersService` quando outro módulo realmente precisar dele.
- Não criar pastas, providers ou abstrações vazias apenas para reproduzir uma árvore. Novos elementos internos exigem necessidade concreta dentro do escopo aprovado.

## 4. Fluxo obrigatório de trabalho

Para cada etapa ou subetapa da Seção 15:

1. Ler a especificação aplicável e inspecionar o estado atual do repositório.
2. Apresentar um plano curto, com escopo, arquivos previstos e forma de verificação, quando a tarefa ainda não tiver um plano aprovado.
3. Aguardar aprovação quando ela tiver sido solicitada ou quando a decisão alterar escopo, contrato ou arquitetura.
4. Implementar somente a unidade aprovada.
5. Executar as verificações automatizadas que existirem e forem pertinentes à unidade.
6. Executar diretamente todas as verificações operacionais determinísticas que puderem ser realizadas de forma segura e reproduzível no ambiente disponível.
7. Se alguma verificação divergir do comportamento esperado, interromper o fluxo, registrar a evidência e reportar o problema. Não corrigir silenciosamente uma divergência que exija mudança de escopo, contrato ou arquitetura.
8. Relatar arquivos alterados, verificações executadas, resultados observados e eventuais pendências.
9. Reservar execução manual pelo responsável principalmente para aspectos visuais, subjetivos, interações externas indisponíveis ao agente ou outras verificações que realmente dependam de julgamento humano.
10. Somente após aceitação do responsável, preparar a unidade para o commit conceitual correspondente. Nunca fazer commit automaticamente.

- Uma etapa ou subetapa deve poder ser verificada e aceita antes da seguinte.
- Não antecipar funcionalidades de etapas futuras para satisfazer um critério atual.
- A Etapa 9 é revisão e regressão; não deve ser usada para implementar pela primeira vez segurança ou comportamento que pertence a uma etapa anterior.
- Na Etapa 0, respeitar a ordem interna definida na especificação: os quatro artefatos prévios devem existir e ser conferidos antes da geração do primeiro código de backend ou frontend.

## 5. Controle de escopo

- Implementar apenas funcionalidades, endpoints, telas, dados e integrações previstos na especificação e na tarefa aprovada.
- Não aproveitar uma tarefa para fazer refatorações, renomeações, reorganizações ou melhorias estilísticas não solicitadas.
- Não alterar contrato público, códigos HTTP, regras de acesso, modelo de dados ou configuração sem aprovação explícita.
- Preferir a solução mínima que satisfaça os critérios da etapa e preserve a arquitetura aprovada.
- Não introduzir Redis, filas, refresh tokens, microsserviços, CI, implantação em produção ou infraestrutura não prevista.
- Não transformar uma escolha interna legítima de implementação em novo requisito do produto.

## 6. Alteração de arquivos

- Antes de editar, identificar os arquivos relevantes e verificar alterações já existentes.
- Preservar trabalho do usuário e mudanças não relacionadas. Não sobrescrever, reverter ou formatar arquivos fora do escopo.
- Criar ou modificar somente arquivos necessários à unidade aprovada.
- Não editar o PDF da aula.
- Alterações em `docs/ESPECIFICACAO.md` exigem solicitação explícita; não sincronizar a especificação por iniciativa própria.
- Ao concluir, listar os arquivos efetivamente alterados e declarar qualquer desvio em relação ao plano.

## 7. Segurança e segredos

- Aplicar as regras de segurança junto com a funcionalidade correspondente, não apenas na revisão final.
- O JWT de sessão pode ser entregue ao frontend conforme o fluxo de autenticação definido na especificação, mas nunca deve ser registrado em logs.
- `JWT_SECRET`, `GROQ_API_KEY`, `BREVO_API_KEY` e outros segredos do backend nunca podem ser enviados ao frontend.
- Nunca versionar ou registrar senhas, hashes de senha, JWTs, tokens de recuperação, chaves, credenciais ou parâmetros sensíveis.
- Arquivos `.env.example` devem conter os nomes necessários e apenas valores locais claramente fictícios e não sensíveis quando permitidos pela especificação; nunca conter segredos reais.
- Respostas públicas não devem expor stack trace, SQL, detalhes internos ou erros crus.
- Logs internos podem conter diagnóstico técnico sanitizado, mas nunca senhas, hashes de senha, JWTs, tokens de recuperação, chaves, credenciais ou parâmetros sensíveis.
- O frontend pode realizar validações para melhorar a experiência do usuário. O backend continua sendo a autoridade para validação de segurança, autenticação, autorização, regras de negócio e persistência. Validação no frontend nunca substitui validação no backend.
- Não enfraquecer autenticação, autorização, ownership, proteção contra enumeração, uso único de tokens, política de senha, rate limiting ou proteção do último administrador.

## 8. Dependências e configuração

- Adicionar dependência somente quando necessária à unidade aprovada e compatível com a stack definida.
- Antes de adicionar, verificar se a capacidade já existe nas dependências atuais ou na plataforma adotada.
- Não trocar biblioteca, framework, banco ou provedor sem aprovação explícita.
- Manter dependências do backend e do frontend nos respectivos projetos.
- Atualizar o lockfile correspondente ao alterar dependências.
- Configuração dependente de ambiente deve seguir as Seções 12 e 13. Não inserir valores concretos de produção nem criar variáveis sem necessidade aprovada.
- Não validar credenciais externas por chamadas à Groq ou Brevo durante o startup; seguir exatamente a validação de configuração definida na especificação.

## 9. Regras permanentes do backend

- Manter o prefixo global `/api`, CORS por ambiente e validação global conforme a especificação.
- Usar configuração centralizada e validada; não acessar valores de ambiente de forma dispersa quando houver mecanismo central do projeto.
- Em requisições protegidas, validar a sessão e a existência atual da conta antes de executar regra de negócio ou chamar serviço externo.
- O JWT identifica a sessão, mas decisões administrativas usam a role atual da conta conforme a especificação.
- Aplicar ownership e respostas que não revelem recursos de outros usuários.
- Manter regras transacionais ou atômicas quando necessárias para garantir invariantes já definidas, sem prescrever infraestrutura adicional.
- Preservar o formato mínimo de erros e os códigos HTTP definidos no contrato. Não expor stack trace, SQL, caminhos internos ou mensagens de provedores.
- `synchronize: true` é restrito ao desenvolvimento conforme a especificação; não converter essa escolha em estratégia de produção.
- Consultar a Seção 9 antes de alterar endpoints e as Seções 12 e 13 antes de alterar segurança ou configuração.

## 10. Regras permanentes do frontend

- Consumir o backend por caminhos relativos sob `/api`; não fixar URL absoluta do backend no código da aplicação.
- Centralizar chamadas HTTP na instância Axios prevista pela arquitetura.
- Usar Zustand para sessão e estado global apropriado; usar TanStack Query para estado remoto. Não duplicar a mesma autoridade de estado sem necessidade.
- Restaurar e sincronizar a sessão conforme a Seção 11 antes de exibir conteúdo protegido.
- Distinguir o `401` do login, que representa credenciais inválidas, do `401` em requisição protegida, que aciona limpeza da sessão e redirecionamento.
- Falha de rede ou resposta `5xx` durante a restauração não deve ser tratada como prova de sessão inválida.
- A role armazenada no frontend orienta a interface, mas nunca autoriza uma operação no backend.
- Usar as proteções de rota e regras de navegação definidas nas Seções 10 e 11.
- Confiar no escaping padrão do React para conteúdo textual e não introduzir renderização insegura de HTML.
- Não enviar credenciais de provedores externos nem segredos para o navegador.

## 11. Testes e verificação

- Cada mudança deve ser verificada na proporção do risco e pelos critérios observáveis da etapa correspondente.
- Executar testes, lint, typecheck e build somente pelos scripts que realmente existirem no projeto.
- Não declarar sucesso de comando que não foi executado.
- Se uma verificação não puder ser executada, informar o motivo e fornecer a verificação manual pertinente, sem inventar resultado.
- Testes devem cobrir primeiro o comportamento alterado e suas regras de segurança relevantes, sem depender de funcionalidades de etapas futuras.
- Não tornar testes frágeis por acoplamento a detalhes internos quando o contrato observável for suficiente.
- Após os testes automatizados, o agente deve executar por conta própria todas as verificações operacionais determinísticas que puder realizar no ambiente disponível, incluindo, quando aplicável, chamadas HTTP, consultas ao banco, scripts, inspeções de estado e verificações de Git.
- Não delegar ao responsável a execução manual de comandos que o agente consiga executar de forma segura, reproduzível e sem exigir julgamento humano.
- Para cada critério de aceite verificado operacionalmente, registrar `PASSOU` ou `FALHOU`, o comando ou método utilizado e o resultado essencial observado.
- Verificações que alterem temporariamente estado local devem usar dados descartáveis claramente identificados, preservar dados não relacionados e realizar a limpeza segura ao final quando aplicável.
- Se uma verificação operacional produzir resultado divergente, não mascarar a falha, alterar o teste para fazê-lo passar ou corrigir silenciosamente a implementação. Registrar a evidência e seguir as regras de escopo e aprovação deste arquivo.
- A verificação manual pelo responsável deve ser priorizada quando houver avaliação visual ou subjetiva, interação externa indisponível ao agente, limitação real do ambiente ou necessidade explícita de aceite humano.

- Após a implementação completa, a Etapa 9 deve confirmar regressão, integração e aderência à especificação.

## 12. Git e commits

- Não fazer commit sem solicitação explícita, mesmo que a unidade esteja concluída.
- Cada commit deve representar uma mudança coerente ou uma unidade concluída e aceita.
- Usar Conventional Commits de forma simples, com tipos como `feat:`, `fix:`, `docs:`, `test:`, `refactor:` e `chore:`.
- `scope` não é obrigatório. Não impor regras sofisticadas de mensagem.
- A descrição deve identificar claramente a mudança ou a unidade concluída.
- Não misturar alterações não relacionadas no mesmo commit.
- Não reescrever histórico, descartar mudanças do usuário ou executar operações Git destrutivas sem autorização explícita.

## 13. Comandos do projeto

- Consultar o estado atual do repositório, os `package.json` e o `README.md` existentes antes de executar comandos.
- Não inventar nomes de scripts ou comandos.
- Quando houver lockfile, usar `npm ci` para instalação reproduzível.
- No escopo desta aplicação da Aula 07, Docker deve ser usado apenas para o PostgreSQL, conforme a especificação.
- Comandos de desenvolvimento, teste, lint, build, inicialização, encerramento e bootstrap devem corresponder aos artefatos realmente existentes no projeto.

## 14. Nunca fazer

- Não implementar requisito ausente da especificação por conveniência ou antecipação.
- Não modificar a especificação para justificar uma implementação divergente.
- Não duplicar no `AGENTS.md` contratos completos, payloads, tabelas de status HTTP, modelos ou critérios de aceite já mantidos na especificação.
- Não colocar regra de negócio ou acesso direto a `Repository` em controller.
- Não chamar Groq ou Brevo diretamente de controller nem do frontend.
- Não confiar apenas em validação, role ou estado mantido pelo frontend.
- Não registrar segredos ou dados sensíveis nem retornar segredos do backend; somente podem ser retornados dados sensíveis explicitamente previstos pelos contratos da especificação, como o JWT de sessão no login.
- Não adicionar dependências, scripts, comandos, módulos ou infraestrutura especulativos.
- Não executar automaticamente commit, push, publicação ou implantação.
- Não avançar para outra etapa deixando a unidade atual sem verificação e aceite previstos.
