# Sistema de Gestão de Peladas — Futebol Amador

Aplicação web para organização e gerenciamento de peladas de futebol amador. O sistema permite que organizadores centralizem informações que normalmente ficam dispersas em mensagens, planilhas ou anotações, como jogadores, confirmações de presença, times, placar, cronômetro, eventos da partida, estatísticas e pagamentos.

> Este projeto corresponde ao módulo **Pelada** do Sistema de Gestão de Futebol Amador. Ele possui um front-end independente e uma API própria.

## Sumário

* [Visão geral](#visão-geral)
* [Problema e contexto](#problema-e-contexto)
* [Objetivos](#objetivos)
* [Funcionalidades](#funcionalidades)
* [Arquitetura](#arquitetura)
* [Tecnologias utilizadas](#tecnologias-utilizadas)
* [Estrutura do projeto](#estrutura-do-projeto)
* [Pré-requisitos](#pré-requisitos)
* [Instalação e execução local](#instalação-e-execução-local)
* [Variáveis de ambiente](#variáveis-de-ambiente)
* [Principais rotas da API](#principais-rotas-da-api)
* [Scripts disponíveis](#scripts-disponíveis)
* [Solução de problemas](#solução-de-problemas)
* [Segurança e boas práticas](#segurança-e-boas-práticas)

## Visão geral

A aplicação foi desenvolvida para apoiar a gestão de peladas recorrentes. Por meio de uma interface web, o organizador pode cadastrar jogadores, criar peladas, controlar inscrições, confirmar presenças, formar times, acompanhar a partida ao vivo e registrar informações que alimentam estatísticas e controles financeiros.

O módulo é dividido em duas partes:

* **Front-end:** interface React utilizada pelo organizador;
* **Back-end:** API Node.js/Express responsável por autenticação, regras de negócio, comunicação em tempo real e persistência no PostgreSQL.

O front-end consome a API por meio da variável `VITE_API_URL` e se conecta ao Socket.IO por meio de `VITE_SOCKET_URL`.

## Problema e contexto

A organização de uma pelada envolve diversas tarefas operacionais: confirmar participantes, controlar a ordem de chegada, organizar times equilibrados, acompanhar o placar, registrar gols e assistências, calcular pagamentos e manter o histórico dos jogadores.

Quando essas informações ficam distribuídas entre mensagens, planilhas e anotações, aumentam as chances de inconsistências, atrasos e perda de dados. O Sistema de Gestão de Peladas centraliza esses processos em uma única aplicação, proporcionando mais organização e rastreabilidade.

## Objetivos

* Centralizar o cadastro e a gestão de jogadores;
* Permitir cadastro e autenticação de organizadores;
* Criar e acompanhar peladas com data, horário, local, duração e configurações de jogo;
* Controlar inscrições, ordem de chegada e confirmação de presença;
* Formar times de forma aleatória ou balanceada por nível de habilidade;
* Apoiar o rodízio de equipes durante a pelada;
* Acompanhar cronômetro e placar ao vivo;
* Registrar gols, assistências e outros eventos da partida;
* Gerar estatísticas individuais dos jogadores;
* Controlar pagamentos e rateio de despesas da pelada.

## Funcionalidades

### Autenticação e organizadores

* Cadastro de organizadores;
* Login com e-mail e senha;
* Geração e validação de token JWT;
* Proteção de rotas da API;
* Recuperação de senha por rota própria.

### Jogadores

* Cadastro de jogadores;
* Listagem de jogadores vinculados ao organizador autenticado;
* Edição de dados;
* Desativação de jogador;
* Definição de nível de habilidade por estrelas.

### Peladas e inscrições

* Criação, listagem, detalhamento e atualização de peladas;
* Inclusão e remoção de jogadores inscritos;
* Reordenação da lista de participantes;
* Confirmação de presença;
* Controle de jogadores excedentes quando houver mais participantes que vagas simultâneas.

### Sorteio, times e rodízio

* Sorteio aleatório de times;
* Sorteio balanceado de acordo com o nível dos jogadores;
* Ajuste manual de jogadores entre equipes;
* Confirmação e restauração da formação de times;
* Consulta da ordem dos times;
* Substituição de jogadores;
* Rodízio de equipes e encerramento de partida com entrada do próximo time.

### Jogo ao vivo e eventos

* Início, pausa e reinício do cronômetro;
* Atualização de placar;
* Registro e listagem de eventos da partida;
* Registro de gols, assistências e cartões;
* Comunicação em tempo real com Socket.IO.

### Estatísticas e pagamentos

* Finalização de pelada e processamento de estatísticas;
* Consulta de estatísticas por jogador;
* Consulta e atualização de pagamentos;
* Cálculo do rateio;
* Configuração da visibilidade de pagamentos.

## Arquitetura

```text
┌─────────────────────────────────────┐
│            Front-end                │
│   React + TypeScript + Vite         │
│      http://localhost:5173          │
└──────────────────┬──────────────────┘
                   │ HTTP + Socket.IO
                   ▼
┌─────────────────────────────────────┐
│             Back-end                │
│ Node.js + Express + Socket.IO       │
│      http://localhost:3001          │
└──────────────────┬──────────────────┘
                   │ Prisma ORM
                   ▼
┌─────────────────────────────────────┐
│            PostgreSQL               │
│             futebol_db              │
└─────────────────────────────────────┘
```

## Tecnologias utilizadas

### Back-end

* Node.js;
* Express;
* Prisma ORM;
* PostgreSQL;
* JSON Web Token (JWT);
* bcrypt;
* Socket.IO;
* CORS;
* dotenv;
* nodemon.

### Front-end

* React;
* TypeScript;
* Vite;
* React Router;
* Axios;
* Tailwind CSS;
* Lucide React;
* React Hot Toast;
* Zustand;
* Socket.IO Client;
* DnD Kit;
* Hello Pangea DnD;
* Motion.

## Estrutura do projeto

```text
Pelada/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
│
└── README.md
```

## Pré-requisitos

Antes de iniciar, instale:

* Node.js 18 ou superior;
* npm;
* PostgreSQL;
* Git, caso o repositório ainda não esteja em sua máquina.

Verifique as instalações:

```bash
node --version
npm --version
psql --version
git --version
```

## Instalação e execução local

A execução local requer dois terminais: um para o back-end e outro para o front-end.

### 1. Acesse a pasta do módulo

A partir da raiz do repositório:

```bash
cd Pelada
```

### 2. Crie o banco de dados

No PostgreSQL, crie o banco de dados utilizado pelo projeto:

```sql
CREATE DATABASE futebol_db;
```

### 3. Configure e execute o back-end

Em um terminal:

```bash
cd backend
npm install
```

Crie o arquivo `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/futebol_db?schema=public"
JWT_SECRET="substitua-por-uma-chave-longa-e-aleatoria"
FRONTEND_URL="http://localhost:5173"
PORT=3001
```

Ajuste o usuário, a senha, o host, a porta e o nome do banco de acordo com o seu PostgreSQL.

Gere o Prisma Client e aplique as migrações:

```bash
npx prisma generate
npx prisma migrate dev
```

Inicie a API:

```bash
npm run dev
```

A API ficará disponível em:

```text
http://localhost:3001
```

Para verificar se a API está respondendo, acesse:

```text
http://localhost:3001/api/test
```

### 4. Configure e execute o front-end

Em outro terminal, a partir da pasta `Pelada`:

```bash
cd frontend
npm install
```

Crie ou ajuste o arquivo `frontend/.env`:

```env
VITE_API_URL="http://localhost:3001/api"
VITE_SOCKET_URL="http://localhost:3001"
```

Inicie o front-end na porta usada pelo módulo de Seleção:

```bash
npm run dev -- --port 5173
```

O front-end ficará disponível em:

```text
http://localhost:5173
```

> O `vite.config.ts` atual não fixa uma porta para o front-end. Por esse motivo, o parâmetro `--port 5173` deve ser usado para manter o endereço alinhado com a aplicação **Seleção**.

### 5. Acesse o sistema

Com os dois processos em execução, abra:

```text
http://localhost:5173
```

Quando a aplicação de Seleção estiver em execução, o acesso também poderá ser realizado pelo botão **Pelada**, configurado para redirecionar ao endereço definido em `VITE_PELADA_URL`.

## Variáveis de ambiente

### Back-end — `backend/.env`

| Variável       | Descrição                                     |
| -------------- | --------------------------------------------- |
| `DATABASE_URL` | String de conexão do Prisma com o PostgreSQL  |
| `JWT_SECRET`   | Chave usada para assinar e validar tokens JWT |
| `FRONTEND_URL` | Origem permitida pelo CORS e pelo Socket.IO   |
| `PORT`         | Porta de execução da API; o padrão é `3001`   |

Exemplo:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/futebol_db?schema=public"
JWT_SECRET="uma-chave-longa-e-aleatoria"
FRONTEND_URL="http://localhost:5173"
PORT=3001
```

### Front-end — `frontend/.env`

| Variável          | Descrição                            |
| ----------------- | ------------------------------------ |
| `VITE_API_URL`    | URL base da API consumida pelo Axios |
| `VITE_SOCKET_URL` | URL do servidor Socket.IO            |

Exemplo:

```env
VITE_API_URL="http://localhost:3001/api"
VITE_SOCKET_URL="http://localhost:3001"
```

Após alterar qualquer arquivo `.env`, reinicie o processo correspondente.

## Principais rotas da API

A API possui a rota de teste:

| Método | Rota        | Descrição                          |
| ------ | ----------- | ---------------------------------- |
| `GET`  | `/api/test` | Verifica se a API está em execução |

As rotas protegidas exigem o token JWT no cabeçalho:

```text
Authorization: Bearer SEU_TOKEN
```

### Autenticação

| Método | Rota                        | Descrição                     |
| ------ | --------------------------- | ----------------------------- |
| `POST` | `/api/auth/register`        | Cadastra um organizador       |
| `POST` | `/api/auth/login`           | Realiza login                 |
| `POST` | `/api/auth/forgot-password` | Solicita recuperação de senha |
| `GET`  | `/api/perfil`               | Valida o acesso autenticado   |

### Jogadores

| Método   | Rota                 | Descrição                                                 |
| -------- | -------------------- | --------------------------------------------------------- |
| `POST`   | `/api/jogadores`     | Cria um jogador                                           |
| `GET`    | `/api/jogadores`     | Lista jogadores do organizador                            |
| `PUT`    | `/api/jogadores/:id` | Atualiza um jogador                                       |
| `DELETE` | `/api/jogadores/:id` | Desativa ou exclui um jogador conforme a regra de negócio |

### Peladas e participantes

| Método   | Rota                                            | Descrição                    |
| -------- | ----------------------------------------------- | ---------------------------- |
| `POST`   | `/api/peladas`                                  | Cria uma pelada              |
| `GET`    | `/api/peladas`                                  | Lista peladas do organizador |
| `GET`    | `/api/peladas/:id`                              | Detalha uma pelada           |
| `PUT`    | `/api/peladas/:id`                              | Atualiza uma pelada          |
| `POST`   | `/api/peladas/:id/jogadores`                    | Adiciona jogador à pelada    |
| `DELETE` | `/api/peladas/:id/jogadores/:jogadorId`         | Remove jogador da pelada     |
| `PUT`    | `/api/peladas/:id/jogadores/reordenar`          | Reordena jogadores           |
| `PUT`    | `/api/peladas/:id/jogadores/confirmar-presenca` | Confirma presença            |

### Sorteio, times e rodízio

| Método | Rota                                        | Descrição                             |
| ------ | ------------------------------------------- | ------------------------------------- |
| `POST` | `/api/peladas/:id/sortear`                  | Sorteia os times                      |
| `GET`  | `/api/peladas/:id/times`                    | Lista os times da pelada              |
| `POST` | `/api/peladas/:id/times/ajustar`            | Ajusta jogadores entre times          |
| `POST` | `/api/peladas/:id/times/restaurar`          | Restaura a formação anterior de times |
| `POST` | `/api/peladas/:id/times/confirmar`          | Confirma a formação dos times         |
| `GET`  | `/api/peladas/:id/timesordem`               | Lista a ordem dos times               |
| `POST` | `/api/peladas/:id/substituir`               | Substitui jogador em um time          |
| `POST` | `/api/peladas/:id/rodar-times`              | Executa o rodízio de equipes          |
| `POST` | `/api/peladas/:id/partida/encerrar-e-rodar` | Encerra a partida e executa o rodízio |

### Jogo ao vivo e eventos

| Método | Rota                                 | Descrição                  |
| ------ | ------------------------------------ | -------------------------- |
| `POST` | `/api/jogo/:id/cronometro/iniciar`   | Inicia o cronômetro        |
| `POST` | `/api/jogo/:id/cronometro/pausar`    | Pausa o cronômetro         |
| `POST` | `/api/jogo/:id/cronometro/reiniciar` | Reinicia o cronômetro      |
| `POST` | `/api/jogo/:id/placar`               | Atualiza o placar          |
| `POST` | `/api/peladas/:id/eventos`           | Registra um evento         |
| `GET`  | `/api/peladas/:id/eventos`           | Lista os eventos da pelada |

### Estatísticas e pagamentos

| Método | Rota                                      | Descrição                                      |
| ------ | ----------------------------------------- | ---------------------------------------------- |
| `POST` | `/api/peladas/:id/finalizar`              | Finaliza a pelada e processa estatísticas      |
| `GET`  | `/api/jogadores/:id/estatisticas`         | Consulta estatísticas do jogador               |
| `GET`  | `/api/peladas/:id/pagamentos`             | Lista pagamentos da pelada                     |
| `PUT`  | `/api/peladas/:id/pagamentos/:jogador_id` | Atualiza a situação de pagamento de um jogador |
| `GET`  | `/api/peladas/:id/rateio`                 | Calcula o rateio da pelada                     |
| `PUT`  | `/api/peladas/:id/config-pagamento`       | Atualiza a configuração de pagamentos          |

## Scripts disponíveis

### Back-end

| Comando                  | Descrição                                        |
| ------------------------ | ------------------------------------------------ |
| `npm run dev`            | Inicia o servidor com nodemon                    |
| `npm start`              | Inicia o servidor com Node.js                    |
| `npx prisma generate`    | Gera o Prisma Client                             |
| `npx prisma migrate dev` | Cria e aplica migrações de desenvolvimento       |
| `npx prisma studio`      | Abre uma interface visual para consulta do banco |

### Front-end

| Comando                      | Descrição                                         |
| ---------------------------- | ------------------------------------------------- |
| `npm run dev`                | Inicia o Vite em desenvolvimento                  |
| `npm run dev -- --port 5173` | Inicia o Vite na porta usada pela tela de Seleção |
| `npm run build`              | Gera a versão de produção                         |
| `npm run preview`            | Visualiza localmente a versão gerada              |
| `npm run lint`               | Executa verificação de tipos com TypeScript       |

## Solução de problemas

### Erro ao conectar ao PostgreSQL

Verifique se o PostgreSQL está em execução, se o banco `futebol_db` foi criado e se a variável `DATABASE_URL` está correta.

Depois, execute:

```bash
npx prisma generate
npx prisma migrate dev
```

### Erro relacionado ao Prisma Client

Na pasta `backend`, execute:

```bash
npx prisma generate
```

Em seguida, reinicie a API.

### Erro de CORS ou falha de conexão com a API

Confira se os valores abaixo usam os endereços corretos:

```env
# backend/.env
FRONTEND_URL="http://localhost:5173"

# frontend/.env
VITE_API_URL="http://localhost:3001/api"
VITE_SOCKET_URL="http://localhost:3001"
```

Também confirme que o front-end está em execução na porta `5173` e a API na porta `3001`.

### O front-end iniciou em outra porta

Pare o processo do Vite e execute:

```bash
npm run dev -- --port 5173
```

Se a porta `5173` estiver ocupada, encerre o processo que a utiliza ou ajuste a variável `VITE_PELADA_URL` da aplicação Seleção para o novo endereço.

### Erro: `lucide-react ... could not be resolved`

Na pasta `frontend`, execute:

```bash
npm install
```

Depois, inicie o projeto novamente.

### O Socket.IO não conecta

Confirme que a API está em execução e que `VITE_SOCKET_URL` aponta para a origem da API, sem o sufixo `/api`:

```env
VITE_SOCKET_URL="http://localhost:3001"
```

## Segurança e boas práticas

* Não envie arquivos `.env` para repositórios públicos;
* Não publique senhas, `DATABASE_URL` reais, tokens ou valores de `JWT_SECRET`;
* Use uma chave JWT longa e aleatória;
* Mantenha `FRONTEND_URL` restrito à origem autorizada;
* Crie um arquivo `.env.example` com nomes de variáveis e valores fictícios para facilitar a configuração por outras pessoas.
