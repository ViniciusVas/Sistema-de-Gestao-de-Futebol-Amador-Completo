# Sistema de Gestao de Futebol Amador

Sistema web para organizacao e gerenciamento de peladas de futebol amador. A solucao foi desenvolvida para ajudar organizadores a centralizar o cadastro de jogadores, controlar presencas, montar times, acompanhar partidas em andamento e registrar informacoes importantes da pelada.

## Visao Geral

Organizar uma pelada costuma envolver varios controles manuais: lista de jogadores, confirmacao de presenca, divisao equilibrada dos times, pagamentos, placar, cronometro e estatisticas. Quando essas informacoes ficam espalhadas em conversas, planilhas ou anotacoes, o organizador perde tempo e aumenta a chance de erro.

Este projeto resolve esse problema com uma aplicacao web dividida em duas partes:

- **Frontend**: interface React usada pelo organizador para acessar o sistema.
- **Backend**: API Node.js/Express responsavel por autenticacao, regras de negocio e persistencia dos dados.

O frontend se comunica com o backend por meio de requisicoes HTTP para a API configurada em `VITE_API_URL`.

## Objetivos

- Facilitar o gerenciamento de jogadores de futebol amador.
- Permitir o cadastro e login de organizadores.
- Controlar jogadores vinculados a cada organizador.
- Criar e acompanhar peladas com data, local, duracao e configuracoes de jogo.
- Adicionar jogadores a uma pelada e controlar ordem de chegada.
- Confirmar presenca e pagamento dos jogadores.
- Sortear times de forma aleatoria ou balanceada.
- Registrar eventos da partida, como gols, assistencias e cartoes.
- Acompanhar placar e jogo ao vivo.
- Gerar estatisticas individuais dos jogadores.
- Oferecer uma base evolutiva para campeonatos e rankings.

## Tecnologias Utilizadas

### Backend

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- JWT para autenticacao
- Bcrypt para criptografia de senhas
- Socket.IO para recursos em tempo real
- Dotenv para variaveis de ambiente

### Frontend

- React
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS
- Lucide React
- React Hot Toast
- Zustand
- Socket.IO Client
- DnD Kit / Hello Pangea DnD para interacoes de arrastar e soltar

## Estrutura do Projeto

```txt
Residencia/
|-- backend/
|   |-- prisma/
|   |   `-- schema.prisma
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middlewares/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- utils/
|   |   |-- app.js
|   |   `-- server.js
|   |-- package.json
|   `-- .env
|
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- store/
|   |   |-- types/
|   |   |-- App.tsx
|   |   `-- main.tsx
|   |-- index.html
|   |-- package.json
|   |-- tsconfig.json
|   |-- vite.config.ts
|   `-- .env
|
`-- README.md
```

## Funcionalidades Implementadas

### Autenticacao

- Cadastro de organizador.
- Login com email e senha.
- Geracao de token JWT.
- Protecao de rotas no backend.
- Controle de sessao no frontend.

### Jogadores

- Criar jogador.
- Listar jogadores do organizador autenticado.
- Editar dados do jogador.
- Desativar jogador por soft delete.
- Definir nivel de habilidade por estrelas.

### Peladas

- Criar pelada com data, local e configuracoes.
- Listar peladas do organizador.
- Detalhar uma pelada.
- Adicionar jogadores inscritos.
- Remover jogadores da pelada.
- Reordenar jogadores por ordem de chegada.
- Confirmar presenca.
- Controlar confirmacao de pagamento.

### Sorteio e Times

- Sortear times de forma aleatoria.
- Sortear times buscando equilibrio por nivel dos jogadores.
- Criar fila de times quando houver mais jogadores que vagas simultaneas.
- Ajustar jogadores entre times.
- Confirmar formacao dos times.

### Jogo ao Vivo

- Acompanhar placar.
- Controlar cronometro.
- Registrar eventos da partida.
- Registrar gols, assistencias e cartoes.
- Usar Socket.IO para comunicacao em tempo real.

### Estatisticas e Pagamentos

- Registrar pagamentos dos jogadores.
- Consultar informacoes financeiras da pelada.
- Gerar estatisticas por jogador.

## Requisitos

Antes de executar o projeto, instale:

- Node.js 18 ou superior
- npm
- PostgreSQL

Tambem e necessario ter um banco PostgreSQL criado para o projeto.

## Configuracao do Backend

Acesse a pasta do backend:

```bash
cd backend
```

Instale as dependencias:

```bash
npm install
```

Crie um arquivo `.env` dentro da pasta `backend`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/futebol"
JWT_SECRET="sua_chave_secreta"
FRONTEND_URL="http://localhost:5173"
PORT=3001
```

Substitua `usuario`, `senha` e `futebol` pelos dados reais do seu PostgreSQL.

Execute as migrations e gere o client do Prisma:

```bash
npx prisma migrate dev
npx prisma generate
```

Inicie o backend:

```bash
npm run dev
```

Por padrao, a API ficara disponivel em:

```txt
http://localhost:3001/api
```

## Configuracao do Frontend

Acesse a pasta do frontend:

```bash
cd frontend
```

Instale as dependencias:

```bash
npm install
```

Crie ou ajuste o arquivo `.env` dentro da pasta `frontend`:

```env
VITE_API_URL="http://localhost:3001/api"
VITE_SOCKET_URL="http://localhost:3001"
```

Inicie o frontend:

```bash
npm run dev
```

Por padrao, o Vite exibira a URL local da aplicacao, geralmente:

```txt
http://localhost:5173
```

## Como Executar o Sistema

Use dois terminais:

### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

Depois acesse o endereco exibido pelo Vite no navegador.

## Principais Rotas da API

Todas as rotas protegidas devem receber o token JWT no header:

```txt
Authorization: Bearer SEU_TOKEN
```

### Autenticacao

| Metodo | Rota | Descricao |
| --- | --- | --- |
| POST | `/api/auth/register` | Cadastra um organizador |
| POST | `/api/auth/login` | Realiza login e retorna token |
| GET | `/api/perfil` | Valida acesso autenticado |

### Jogadores

| Metodo | Rota | Descricao |
| --- | --- | --- |
| POST | `/api/jogadores` | Cria jogador |
| GET | `/api/jogadores` | Lista jogadores |
| PUT | `/api/jogadores/:id` | Edita jogador |
| DELETE | `/api/jogadores/:id` | Desativa jogador |

### Peladas

| Metodo | Rota | Descricao |
| --- | --- | --- |
| POST | `/api/peladas` | Cria pelada |
| GET | `/api/peladas` | Lista peladas |
| GET | `/api/peladas/:id` | Detalha pelada |
| PUT | `/api/peladas/:id` | Atualiza pelada |
| POST | `/api/peladas/:id/jogadores` | Adiciona jogador a pelada |
| DELETE | `/api/peladas/:id/jogadores/:jogadorId` | Remove jogador da pelada |
| PUT | `/api/peladas/:id/jogadores/reordenar` | Reordena jogadores |
| PUT | `/api/peladas/:id/jogadores/confirmar-presenca` | Confirma presenca |

### Sorteio, Times e Jogo

| Metodo | Rota | Descricao |
| --- | --- | --- |
| POST | `/api/peladas/:id/sortear` | Sorteia times |
| GET | `/api/peladas/:id/times` | Lista times da pelada |
| PUT | `/api/times/ajustar` | Ajusta jogador entre times |
| PUT | `/api/peladas/:id/confirmar-times` | Confirma times |
| GET/POST/PUT | `/api/jogo/...` | Rotas de jogo ao vivo |

## Scripts Disponiveis

### Backend

```bash
npm run dev
npm start
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Observacoes Importantes

- O backend oficial do projeto fica na pasta `backend`.
- O frontend deve consumir a API por `VITE_API_URL`.
- Arquivos antigos de backend de teste dentro da pasta `frontend` nao fazem parte da arquitetura atual.
- O arquivo `.env` nao deve ser enviado para repositorios publicos.
- Nunca publique valores reais de `DATABASE_URL`, `JWT_SECRET` ou outros segredos.
