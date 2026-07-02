# Sistema de Gestão de Futebol Amador

Sistema web modular criado para apoiar a organização de atividades de futebol amador. A solução reúne três aplicações integradas: uma tela inicial para escolha do modo de uso, um módulo de gerenciamento de peladas e um módulo de gerenciamento de campeonatos.

## Sumário

- [Visão geral](#visão-geral)
- [Problema e contextualização](#problema-e-contextualização)
- [Objetivos](#objetivos)
- [Módulos e funcionalidades](#módulos-e-funcionalidades)
- [Arquitetura da solução](#arquitetura-da-solução)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Principais decisões técnicas](#principais-decisões-técnicas)
- [Estrutura esperada do repositório](#estrutura-esperada-do-repositório)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução local](#instalação-e-execução-local)
- [Configuração por variáveis de ambiente](#configuração-por-variáveis-de-ambiente)
- [Comandos úteis](#comandos-úteis)
- [Solução de problemas](#solução-de-problemas)
- [Integrantes da equipe](#integrantes-da-equipe)

## Visão geral

O **Sistema de Gestão de Futebol Amador** centraliza atividades recorrentes de organizadores, jogadores e equipes em contextos de peladas e campeonatos. A proposta é reduzir controles manuais, dispersão de informações e dificuldades na organização de partidas, mantendo os fluxos de cada modalidade em módulos próprios.

A aplicação é composta por:

- **Seleção:** tela inicial que permite ao usuário escolher entre os módulos Pelada e Campeonato;
- **Pelada:** módulo destinado ao cadastro de jogadores, organização de partidas, confirmação de presença, formação de times, rodízio, placar, eventos da partida, estatísticas e pagamentos;
- **Campeonato:** módulo destinado à administração de campeonatos, equipes, jogadores, confrontos, classificação, resultados, gols e cartões.

A tela de Seleção atua como ponto de entrada do sistema. Ao escolher um modo, o navegador é redirecionado para a URL configurada para o respectivo módulo.

## Problema e contextualização

A organização de futebol amador costuma depender de grupos de mensagens, planilhas, anotações e controle manual. Esse cenário pode gerar dificuldades como:

- incerteza sobre jogadores confirmados;
- demora para formar times equilibrados;
- ausência de histórico de partidas e desempenho dos participantes;
- falhas no controle de placares, pagamentos e rodízio de equipes;
- dificuldade para montar e acompanhar tabelas de campeonatos;
- informações espalhadas entre diferentes ferramentas e responsáveis.

Além disso, peladas e campeonatos possuem necessidades distintas. Uma pelada exige rapidez na confirmação de participantes, sorteio ou balanceamento de times e acompanhamento ao vivo da partida. Um campeonato exige cadastro de equipes, criação de confrontos, registro de resultados e acompanhamento da classificação.

A solução foi estruturada de forma modular para atender a esses dois cenários sem misturar regras de negócio diferentes na mesma interface.

## Objetivos

- Centralizar processos de organização de futebol amador em uma solução digital;
- Simplificar a gestão de peladas, desde o cadastro de jogadores até pagamentos e estatísticas;
- Apoiar a organização de campeonatos com controle de equipes, partidas, classificação e resultados;
- Disponibilizar uma entrada única para os diferentes módulos do sistema;
- Reduzir controles manuais e melhorar a rastreabilidade das informações;
- Permitir evolução independente dos módulos, sem impedir sua integração por meio da tela de Seleção;
- Manter uma base técnica adequada para desenvolvimento local, testes e futuras implantações.

## Módulos e funcionalidades

### 1. Seleção

A aplicação de Seleção é a porta de entrada do ecossistema. Ela apresenta dois cards de acesso:

- **Pelada:** encaminha para o módulo de organização de peladas;
- **Campeonato:** encaminha para o módulo de gestão de campeonatos.

As URLs são configuráveis por variáveis de ambiente, evitando que os endereços dos módulos fiquem fixos no código-fonte.

### 2. Pelada

O módulo de Pelada concentra recursos voltados à gestão de partidas informais e recorrentes. Entre as principais funcionalidades estão:

- cadastro e manutenção de jogadores;
- autenticação de organizadores;
- criação e gerenciamento de peladas;
- confirmação de presença e controle da ordem de chegada;
- sorteio de times aleatório ou balanceado por nível de estrelas;
- confirmação e ajustes de times;
- rodízio de equipes durante as partidas;
- cronômetro e placar em tempo real;
- registro de gols e assistências;
- registro de estatísticas individuais;
- controle de pagamentos por participante.

### 3. Campeonato

O módulo de Campeonato é direcionado à gestão de competições. Suas funcionalidades abrangem:

- cadastro de organizadores, jogadores e equipes;
- criação e administração de campeonatos;
- vinculação de equipes e jogadores ao campeonato;
- gestão de partidas, rodadas e fases;
- registro de placares e resultados;
- acompanhamento de classificação;
- registro de gols, assistências e cartões;
- uso do painel administrativo do Django para gestão e consulta de dados.

## Arquitetura da solução

A solução adota uma arquitetura modular, formada por aplicações executadas separadamente durante o desenvolvimento local.

```text
┌───────────────────────────┐
│         Seleção           │
│     React + Vite          │
│     http://localhost:5175 │
└─────────────┬─────────────┘
              │
     ┌────────┴────────┐
     │                 │
     ▼                 ▼
┌───────────────┐  ┌─────────────────────────┐
│    Pelada     │  │       Campeonato        │
│ React + API   │  │ Front-end: :3000        │
│ Front: :5173  │  │ Back-end Django: :8000  │
│ API:   :3001  │  │                         │
└───────────────┘  └─────────────────────────┘
```

No módulo Pelada, a interface React se comunica com uma API própria. A API concentra as regras de negócio, autenticação e persistência dos dados. No módulo Campeonato, o front-end é acessado na porta `3000` e se comunica com o back-end Django, executado na porta `8000`. O Django e seu ORM são utilizados para modelagem, migrações, administração e disponibilização das regras de negócio relacionadas às competições.

## Tecnologias utilizadas

| Área | Tecnologias |
| --- | --- |
| Tela de Seleção | React, TypeScript, Vite, Tailwind CSS e Lucide React |
| Front-end de Pelada | React, TypeScript, Vite, React Router, Axios, Tailwind CSS e Lucide React |
| Back-end de Pelada | Node.js, Express, Prisma ORM, Socket.IO, JWT e bcrypt |
| Banco de dados de Pelada | PostgreSQL |
| Front-end de Campeonato | Aplicação web do módulo, acessada localmente pela porta `3000` |
| Back-end de Campeonato | Python, Django e Django ORM, executado localmente pela porta `8000` |
| Qualidade e ferramentas | ESLint, Git, GitHub, npm e Prisma Migrate |

## Principais decisões técnicas

### Arquitetura modular por contexto de uso

Pelada e Campeonato atendem a fluxos diferentes. Por isso, foram mantidos como módulos independentes, com uma aplicação de Seleção para centralizar a navegação. Essa decisão reduz o acoplamento entre regras de negócio distintas e permite que cada módulo evolua sem comprometer o outro.

### Comunicação entre módulos por URLs configuráveis

A tela de Seleção utiliza variáveis de ambiente para armazenar as URLs dos módulos. Dessa forma, os endereços locais ou publicados podem ser alterados sem modificações no componente de interface.

As variáveis utilizadas são:

```env
VITE_PELADA_URL=http://localhost:5173
VITE_CAMPEONATO_URL=http://localhost:3000
```

### Separação entre front-end, API e banco de dados no módulo Pelada

O módulo Pelada separa interface, regras de negócio e persistência:

- o front-end concentra a experiência do usuário;
- a API Node.js/Express recebe requisições e aplica as regras de negócio;
- o Prisma faz a comunicação tipada com o PostgreSQL;
- o banco de dados armazena organizadores, jogadores, peladas, times, eventos e pagamentos.

Essa divisão facilita manutenção, testes e evolução do sistema.

### Autenticação com JWT

A autenticação do módulo Pelada é baseada em JSON Web Token (JWT). Após o login, as requisições autenticadas usam o token de acesso para identificar o organizador e proteger as rotas que manipulam informações da conta.

As senhas não devem ser armazenadas em texto puro. O uso de `bcrypt` permite armazenar hashes de senha e validar credenciais de forma mais segura.

### Atualizações em tempo real com Socket.IO

Recursos sensíveis ao tempo, como cronômetro e placar de uma partida, utilizam Socket.IO. Essa escolha permite que informações atualizadas sejam transmitidas aos clientes conectados sem a necessidade de recarregar a página periodicamente.

### Regras de negócio no servidor

Processos como sorteio balanceado de times, controle de presença, rodízio, registro de eventos e cálculo de estatísticas são tratados na API. Manter essas regras no servidor reduz inconsistências e evita que o comportamento dependa apenas da interface do usuário.

### Banco relacional e migrações

O PostgreSQL foi adotado no módulo Pelada por oferecer integridade relacional e boa adequação aos vínculos entre organizadores, jogadores, partidas, times e eventos.

O Prisma Migrate é utilizado para versionar a estrutura do banco de dados. No módulo Campeonato, o Django ORM e suas migrações desempenham função equivalente.

### Uso de variáveis de ambiente

Configurações que podem variar entre máquinas ou ambientes, como portas, URLs, conexão com banco de dados e segredo JWT, são mantidas fora do código-fonte por meio de arquivos `.env`.

Essa decisão evita exposição indevida de informações sensíveis e facilita a adaptação para desenvolvimento, homologação e produção.

## Estrutura esperada do repositório

A nomenclatura pode variar conforme a versão local do projeto, mas a organização geral é composta pelos módulos abaixo:

```text
Sistema-de-Gestao-de-Futebol-Amador-Completo/
├── Seleção/                     # Tela inicial de escolha do módulo
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── Pelada/                      # Módulo de gestão de peladas
│   ├── backend/                 # Node.js + Express + Prisma + PostgreSQL
│   └── frontend/                # React + Vite
│
├── Campeonato/                  # Módulo de gestão de campeonatos
│   ├── manage.py                # Ponto de entrada do Django
│   ├── core/                    # Aplicação e modelos de domínio
│   └── requirements.txt
│
└── README.md                    # Documentação geral do sistema
```

> Em versões anteriores do projeto, a pasta do módulo Pelada pode aparecer com outro nome. Nesse caso, utilize a pasta que contém os diretórios `backend` e `frontend`.

## Pré-requisitos

Instale os itens abaixo antes de executar os módulos:

- [Git](https://git-scm.com/);
- [Node.js](https://nodejs.org/) em versão LTS;
- npm, instalado junto com o Node.js;
- [PostgreSQL](https://www.postgresql.org/);
- [Python](https://www.python.org/) 3.10 ou superior;
- pip, instalado junto com o Python.

Verifique as instalações:

```bash
git --version
node --version
npm --version
psql --version
python --version
pip --version
```

## Instalação e execução local

A execução local utiliza processos separados. Abra terminais diferentes para cada módulo.

### 1. Clone o repositório

```bash
git clone https://github.com/ViniciusVas/Sistema-de-Gestao-de-Futebol-Amador-Completo.git
cd Sistema-de-Gestao-de-Futebol-Amador-Completo
```

### 2. Crie o banco de dados PostgreSQL do módulo Pelada

No PostgreSQL, crie um banco de dados chamado `futebol_db`:

```sql
CREATE DATABASE futebol_db;
```

Anote o usuário, senha, host e porta usados na sua instalação local, pois essas informações serão utilizadas no arquivo `.env` do back-end.

### 3. Configure e execute o back-end de Pelada

Acesse a pasta do back-end:

```bash
cd Pelada/backend
```

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env` com uma configuração semelhante à seguinte:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/futebol_db?schema=public"
JWT_SECRET="substitua-por-uma-chave-longa-e-aleatoria"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

Gere o Prisma Client e aplique as migrações:

```bash
npx prisma generate
npx prisma migrate dev
```

Inicie a API:

```bash
npm run dev
```

A API deverá ficar disponível, em geral, em:

```text
http://localhost:3001
```

### 4. Configure e execute o front-end de Pelada

Em outro terminal, acesse a pasta do front-end:

```bash
cd Pelada/frontend
```

Instale as dependências:

```bash
npm install
```

Inicie a aplicação na porta esperada pela tela de Seleção:

```bash
npm run dev -- --port 5173
```

O módulo Pelada deverá ficar disponível em:

```text
http://localhost:5173
```

> Caso o projeto já tenha uma porta configurada no `vite.config.ts`, use a porta definida no arquivo ou atualize `VITE_PELADA_URL` na aplicação Seleção para o mesmo endereço.

### 5. Configure e execute o back-end do Campeonato

Abra outro terminal e acesse a pasta que contém o arquivo `manage.py` do back-end do módulo Campeonato:

```bash
cd Campeonato
```

Crie e ative um ambiente virtual.

**Windows PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Windows Prompt de Comando:**

```cmd
python -m venv .venv
.venv\Scriptsctivate
```

**Linux/macOS:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Aplique as migrações do Django:

```bash
python manage.py migrate
```

Opcionalmente, crie um usuário administrativo:

```bash
python manage.py createsuperuser
```

Inicie o servidor Django na porta `8000`:

```bash
python manage.py runserver 8000
```

O back-end do Campeonato deverá ficar disponível em:

```text
http://localhost:8000
```

O painel administrativo do Django, quando habilitado, estará disponível em:

```text
http://localhost:8000/admin/
```

### 6. Execute o front-end do Campeonato

O front-end do módulo Campeonato deve ser executado separadamente e ficar acessível em:

```text
http://localhost:3000
```

Use os comandos definidos no projeto de front-end do Campeonato para instalar as dependências e iniciar o servidor. A tela de Seleção redireciona o usuário para essa interface na porta `3000`; a interface, por sua vez, deve estar configurada para consumir o back-end Django na porta `8000`.

### 7. Configure e execute a aplicação Seleção

Em outro terminal, acesse a pasta da tela inicial:

```bash
cd Seleção
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env.local`:

```env
VITE_PELADA_URL=http://localhost:5173
VITE_CAMPEONATO_URL=http://localhost:3000
```

Inicie a aplicação:

```bash
npm run dev
```

A tela de Seleção estará disponível em:

```text
http://localhost:5175
```

A partir dela, os botões **Pelada** e **Campeonato** redirecionarão para os respectivos módulos.

## Configuração por variáveis de ambiente

### Seleção

Arquivo: `Seleção/.env.local`

```env
VITE_PELADA_URL=http://localhost:5173
VITE_CAMPEONATO_URL=http://localhost:3000
```

| Variável | Finalidade |
| --- | --- |
| `VITE_PELADA_URL` | Endereço do módulo Pelada |
| `VITE_CAMPEONATO_URL` | Endereço do módulo Campeonato |

Após alterar o arquivo, reinicie o Vite.

### Back-end de Pelada

Arquivo: `Pelada/backend/.env`

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/futebol_db?schema=public"
JWT_SECRET="substitua-por-uma-chave-longa-e-aleatoria"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

| Variável | Finalidade |
| --- | --- |
| `DATABASE_URL` | String de conexão com o PostgreSQL |
| `JWT_SECRET` | Chave usada para assinatura dos tokens JWT |
| `PORT` | Porta da API |
| `FRONTEND_URL` | Origem permitida para comunicação entre front-end e API |

> Nunca envie arquivos `.env` com senhas, tokens ou chaves privadas para o repositório. Use arquivos `.env.example` para registrar somente nomes de variáveis e valores fictícios.

## Comandos úteis

### Seleção

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia a aplicação de Seleção em modo de desenvolvimento |
| `npm run build` | Gera os arquivos de produção |
| `npm run preview` | Visualiza localmente a versão gerada |
| `npm run lint` | Executa a análise estática com ESLint |

### Pelada — back-end

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia a API em modo de desenvolvimento |
| `npx prisma generate` | Gera o Prisma Client |
| `npx prisma migrate dev` | Cria e aplica migrações no ambiente de desenvolvimento |
| `npx prisma studio` | Abre a interface visual do Prisma para o banco de dados |

### Campeonato — back-end Django

| Comando | Descrição |
| --- | --- |
| `python manage.py runserver 8000` | Inicia o back-end Django na porta 8000 |
| `python manage.py migrate` | Aplica as migrações pendentes |
| `python manage.py makemigrations` | Cria migrações após alterações nos modelos |
| `python manage.py createsuperuser` | Cria um usuário administrativo |
| `python manage.py collectstatic` | Reúne arquivos estáticos para produção, quando necessário |

## Solução de problemas

### O botão de Seleção abre a porta errada

Verifique o arquivo `Seleção/.env.local`:

```env
VITE_PELADA_URL=http://localhost:5173
VITE_CAMPEONATO_URL=http://localhost:3000
```

Após modificar o arquivo, encerre e inicie novamente o comando `npm run dev` na pasta `Seleção`.

### Erro ao conectar o back-end de Pelada ao banco

Confirme se o PostgreSQL está em execução, se o banco `futebol_db` foi criado e se os dados de `DATABASE_URL` estão corretos.

Depois, execute:

```bash
npx prisma generate
npx prisma migrate dev
```

### Erro relacionado ao Prisma Client

Na pasta do back-end, execute:

```bash
npx prisma generate
```

Em seguida, reinicie a API.

### Erro: `lucide-react ... could not be resolved`

Acesse a pasta do projeto que apresentou o erro e execute:

```bash
npm install
```

Depois, execute novamente o comando de desenvolvimento.

### A porta já está em uso

Cada módulo precisa utilizar uma porta diferente:

| Serviço | Porta local esperada |
| --- | --- |
| Seleção | `5175` |
| Pelada — front-end | `5173` |
| Pelada — API | `3001` |
| Campeonato — front-end | `3000` |
| Campeonato — back-end Django | `8000` |

Encerre o processo que está ocupando a porta ou altere a configuração do módulo e a respectiva variável de ambiente.

### Migrações do back-end Django do Campeonato não são aplicadas

Verifique se o ambiente virtual está ativado, instale as dependências com `pip install -r requirements.txt` e execute:

```bash
python manage.py migrate
```

## Integrantes da equipe

- **Fabíula de Araujo Brandão**
- **Laura Carolina de Sousa Gomes**
- **Vinícius Abreu Vasconcelos Dos Santos**
