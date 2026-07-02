# FutGestão — Sistema de Gestão de Futebol Amador

Plataforma completa para organizar campeonatos de futebol amador. O organizador cria times, inscreve jogadores, gera tabelas automaticamente e acompanha classificação, artilharia, assistências e cartões. Tudo público — sem login necessário para torcedores.

---

## Funcionalidades

### Jogadores
- Cadastro com nome e nível de habilidade (0,5 a 5 estrelas)
- Ativação / desativação
- Perfil público com histórico de gols, assistências e cartões

### Times
- Criação com nome, escudo (upload de imagem) e cor
- Gerenciamento do elenco: adicionar e remover jogadores
- Times sem jogadores exibem aviso âmbar e são bloqueados de inscrição em campeonatos

### Campeonatos
Dois formatos disponíveis:

| Formato | Tamanho | Times |
|---|---|---|
| **Pontos Corridos** | Pequeno | 5 |
| **Pontos Corridos** | Médio | 10 |
| **Pontos Corridos** | Grande | 20 |
| **Grupos + Mata-Mata** | Pequeno | 8 |
| **Grupos + Mata-Mata** | Médio | 16 |
| **Grupos + Mata-Mata** | Grande | 32 |

**Geração automática de tabela** ao inscrever o último time (pontos corridos) ou ao confirmar os grupos (mata-mata).

**Critérios de desempate** configuráveis em ordem de prioridade:
1. Saldo de gols
2. Confronto direto
3. Número de vitórias

**Status automático:** rascunho → ativo (ao gerar partidas) → encerrado (ao finalizar o último jogo).

### Partidas
- Registro de placar via PATCH — jogo finalizado automaticamente ao informar ambos os placares
- Boletim completo: gols com minuto e assistência, cartões com minuto
- Progressão automática no mata-mata: ao encerrar todos os jogos de uma fase, a próxima é gerada com os classificados

### Classificação
- Tabela atualizada em tempo real (PTS, PJ, V, E, D, GP, GC, SG)
- Desempate respeitado na ordem configurada pelo organizador
- Suporte a grupos (mata-mata) com tabelas separadas por grupo

### Artilharia e Assistências
- Ranking de artilheiros com gols, jogos e média por jogo
- Ranking de assistências separado

### Cartões e Suspensões

**Regras aplicadas automaticamente ao registrar um cartão:**

| Situação | Efeito |
|---|---|
| 3 amarelos acumulados na mesma competição (em partidas diferentes) | 1 jogo de suspensão; contador zerado após cumpri-la |
| 2 amarelos na mesma partida (duplo amarelo) | Expulsão imediata + 1 jogo de suspensão; esses amarelos **não** somam no acúmulo |
| Cartão vermelho direto | Suspensão configurável pelo organizador (padrão: 1 jogo) |

- O campo **"Jogos de suspensão por vermelho direto"** é configurável por campeonato
- Suspensões são decrementadas automaticamente ao finalizar cada partida do time do jogador
- O endpoint `GET /api/campeonatos/<id>/cartoes/` retorna, por jogador: total de amarelos, amarelos de acúmulo, vermelhos diretos, expulsões por duplo amarelo, status de suspensão e contagem de suspensões pendentes/cumpridas
- O endpoint `GET /api/campeonatos/<id>/suspensoes/` lista todas as suspensões do campeonato (filtrável com `?pendente=true` ou `?pendente=false`)

### Peladas
- Organização de peladas avulsas com sorteio de times
- Placar ao vivo com cronômetro

### Página Pública (sem login)
Acesse em `/c` — torcedores e jogadores visualizam:
- Lista de campeonatos (com busca)
- Classificação
- Calendário e resultados com boletim de cada jogo
- Artilharia
- Ranking de assistências
- Cartões e suspensões

---

## Stack

| Camada | Tecnologias |
|---|---|
| Back-end | Python 3.12, Django 6, Django REST Framework, Django Channels |
| Autenticação | JWT (djangorestframework-simplejwt) |
| Banco de dados | SQLite (desenvolvimento) |
| Front-end | React 19, TypeScript, Vite, Tailwind CSS, Axios |

---

## Como rodar

### Pré-requisitos

- **Python 3.12+**
- **Node.js 18+** e npm

> Sem Node.js? Instale via [nvm](https://github.com/nvm-sh/nvm):
> ```bash
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
> source ~/.bashrc
> nvm install 20
> ```

---

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd sistema-de-gestao-de-futebol
```

---

### 2. Back-end (Django)

```bash
cd Back-end

# Crie e ative o ambiente virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Instale as dependências
pip install django djangorestframework djangorestframework-simplejwt \
            channels django-cors-headers bcrypt

# Aplique as migrations
python manage.py migrate

# (Opcional) Crie um superusuário para acessar /admin
python manage.py createsuperuser

# Inicie o servidor
python manage.py runserver
```

Back-end disponível em **http://localhost:8000**.

---

### 3. Front-end (React)

Abra um **novo terminal**:

```bash
cd Front-end

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Front-end disponível em **http://localhost:3000**.

---

### 4. Acesse

| URL | Descrição |
|---|---|
| http://localhost:3000 | Área do organizador (requer login) |
| http://localhost:3000/c | Página pública (sem login) |
| http://localhost:8000/admin | Admin Django |

Na primeira vez, clique em **Cadastrar** para criar sua conta.

---

## Variáveis de ambiente

Crie um arquivo `.env` dentro de `Front-end/` (já existe por padrão):

```env
VITE_API_URL=http://localhost:8000/api
```

Para habilitar envio de e-mail real de recuperação de senha, exporte antes de rodar o Django:

```bash
export EMAIL_HOST_USER="seu@gmail.com"
export EMAIL_HOST_PASSWORD="senha-de-app-google"
export DEFAULT_FROM_EMAIL="seu@gmail.com"
export FRONTEND_URL="http://localhost:3000"
```

Sem essas variáveis, os e-mails aparecem apenas no terminal do servidor.

---

## Estrutura do projeto

```
sistema-de-gestao-de-futebol/
├── Back-end/
│   ├── core/
│   │   ├── models.py        # Entidades: Jogador, Time, Campeonato, Jogo...
│   │   ├── serializers.py   # Validações e serialização da API
│   │   ├── views.py         # Lógica de negócio e endpoints
│   │   ├── urls.py          # Roteamento da API
│   │   └── admin.py         # Interface administrativa
│   ├── projeto/
│   │   └── settings.py      # Configurações Django
│   ├── manage.py
│   └── db.sqlite3
└── Front-end/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.tsx          # Visão geral com atalhos
    │   │   ├── Players.tsx            # Gestão de jogadores
    │   │   ├── Teams.tsx              # Gestão de times e elencos
    │   │   ├── Championships.tsx      # Criação e listagem de campeonatos
    │   │   ├── ChampionshipDetail.tsx # Gestão de um campeonato (jogos, tabela...)
    │   │   ├── Peladas.tsx            # Gestão de peladas
    │   │   ├── PublicChampionships.tsx # Lista pública de campeonatos
    │   │   └── PublicChampionship.tsx  # Detalhe público de um campeonato
    │   ├── context/
    │   │   └── AuthContext.tsx        # Sessão JWT (login, logout, refresh)
    │   ├── services/
    │   │   ├── api.ts                 # Axios com interceptor JWT automático
    │   │   └── publicApi.ts           # Axios sem autenticação (rotas públicas)
    │   └── components/
    │       └── Layout.tsx             # Sidebar e navegação
    ├── server.ts                      # Express + proxy para o Django
    └── vite.config.ts
```

---

## Como a integração funciona

O front-end roda em Express (porta 3000) e serve o React. Toda requisição para `/api/*` é **encaminhada automaticamente** para o Django na porta 8000.

```
Navegador → localhost:3000/api/...
                  ↓ proxy (server.ts)
            Django → localhost:8000/api/...
```

A autenticação usa **JWT**. Após o login, dois tokens são salvos no `localStorage`:

| Token | Validade | Uso |
|---|---|---|
| `access` | 8 horas | Enviado em `Authorization: Bearer <token>` |
| `refresh` | 1 dia | Renova o `access` automaticamente |

O Axios intercepta respostas `401` e renova o token de forma transparente. Se o refresh também expirar, o usuário é redirecionado para o login.

---

## Principais endpoints da API

Todas as rotas (exceto as marcadas como **Pública**) exigem `Authorization: Bearer <token>`.

### Autenticação
| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/register/` | Cadastro |
| POST | `/api/login/` | Login — retorna access + refresh |
| POST | `/api/token/refresh/` | Renovar token |
| POST | `/api/password/recovery/` | Enviar e-mail de recuperação |
| POST | `/api/password/reset/` | Redefinir senha |

### Jogadores
| Método | Endpoint | Descrição |
|---|---|---|
| GET / POST | `/api/jogadores/` | Listar / cadastrar |
| GET / PATCH / DELETE | `/api/jogadores/<id>/` | Detalhe / editar / desativar |

### Times
| Método | Endpoint | Descrição |
|---|---|---|
| GET / POST | `/api/times/` | Listar / criar |
| GET / PATCH / DELETE | `/api/times/<id>/` | Detalhe / editar / excluir |
| GET / POST | `/api/times/<id>/elenco/` | Listar / adicionar jogador ao elenco |
| DELETE | `/api/elenco/<id>/` | Remover jogador do elenco |

### Campeonatos
| Método | Endpoint | Descrição |
|---|---|---|
| GET / POST | `/api/campeonatos/` | Listar / criar |
| GET / PATCH / DELETE | `/api/campeonatos/<id>/` | Detalhe / editar / excluir |
| POST | `/api/campeonatos/<id>/gerar-partidas/` | Gerar tabela manualmente |
| POST | `/api/campeonatos/<id>/gerar-mata-mata/` | Gerar próxima fase eliminatória |
| GET | `/api/campeonatos/<id>/classificacao/` | Tabela de classificação |
| GET | `/api/campeonatos/<id>/artilharia/` | Ranking de artilheiros |
| GET | `/api/campeonatos/<id>/assistencias/` | Ranking de assistências |
| GET | `/api/campeonatos/<id>/cartoes/` | Resumo de cartões e suspensões por jogador |
| GET | `/api/campeonatos/<id>/suspensoes/` | Lista todas as suspensões (`?pendente=true/false`) |

### Inscrições
| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/inscricoes/` | Inscrever time em campeonato |
| DELETE | `/api/inscricoes/<id>/` | Remover inscrição |

### Partidas
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/campeonatos/<id>/partidas/` | Listar partidas |
| PATCH | `/api/partidas/<id>/` | Registrar placar (finaliza automaticamente) |
| GET | `/api/partidas/<id>/boletim/` | **Pública** — gols e cartões da partida |
| POST | `/api/partidas/<id>/gols/` | Registrar gol |
| POST | `/api/partidas/<id>/cartoes/` | Registrar cartão |

### Páginas públicas (sem autenticação)
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/public/campeonatos/` | Lista pública de campeonatos |
| GET | `/api/public/campeonatos/<id>/` | Detalhe público de um campeonato |
