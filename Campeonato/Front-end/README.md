# ⚽ FutGestao - Sistema de Gerenciamento de Peladas

O **FutGestao** é uma solução completa, moderna e de alto desempenho para organização, sorteio e gestão de peladas e campeonatos de futebol amador.  
O sistema foi desenvolvido com foco em **performance**, **responsividade**, **tempo real** e **facilidade de uso**, permitindo que organizadores e jogadores tenham uma experiência fluida tanto no desktop quanto em dispositivos mobile.

---

# 🚀 Deploy no Vercel

Acesse a aplicação online:

🔗 https://sistema-de-gestao-de-futebol-amador.vercel.app

---

# 👥 Equipe de Desenvolvimento

## Frontend
### Fabíula de Araujo Brandão — Desenvolvedora Frontend
Responsável por:
- Interface React + TypeScript
- Experiência do usuário (UX/UI)
- Design responsivo
- Componentes reutilizáveis
- Integração Frontend/API

---

## Backend
### Laura Carolina — Desenvolvedora Backend Lead
Responsável por:
- Arquitetura Node.js
- APIs REST
- Autenticação JWT
- Estrutura de segurança
- Integração backend/frontend

### Vinícius Abreu Vasconcelos dos Santos — Desenvolvedor Backend
Responsável por:
- Modelagem de dados
- Regras de negócio
- Prisma ORM
- WebSockets
- Persistência e sincronização

---

# 📝 Sobre o Projeto

O FutGestao foi criado para facilitar completamente a organização de peladas e campeonatos amadores.

O sistema permite:

- Cadastro de jogadores com nível técnico em estrelas
- Criação e gerenciamento de peladas
- Controle de presença e pagamentos
- Sorteio automático de times balanceados
- Estatísticas individuais
- Campeonatos completos
- Atualizações em tempo real
- Controle financeiro
- Painel ao vivo com cronômetro

---

# 🚀 Novidade Tecnológica: Sincronização Local + Tempo Real

O FutGestao possui uma arquitetura híbrida moderna focada em desempenho:

## ⚡ Armazenamento Local Inteligente
Os dados podem ser mantidos em:
- `localStorage`
- MongoDB Atlas
- Prisma + SQLite/PostgreSQL

Dependendo da configuração do ambiente.

---

## 🔄 WebSockets com Socket.IO
As alterações são sincronizadas em tempo real entre todos os dispositivos conectados:

- Atualização instantânea do placar
- Presença sincronizada
- Gols ao vivo
- Controle de cronômetro
- Eventos da partida
- Ranking atualizado automaticamente

---

# 🛠️ Tecnologias Utilizadas

## Frontend

| Tecnologia | Versão | Função |
|---|---|---|
| React | 19.0.0 | Framework Frontend |
| TypeScript | 5.8.2 | Tipagem estática |
| Tailwind CSS | 4.1.14 | Estilização |
| React Router | 7.14.0 | Rotas |
| Axios | 1.14.0 | Cliente HTTP |
| React Hot Toast | 2.6.0 | Notificações |
| Lucide React | 0.546.0 | Ícones |
| Socket.IO Client | 4.8.3 | Tempo real |

---

## Backend

| Tecnologia | Versão | Função |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.21.2 | API REST |
| MongoDB | 7.2.0 | Banco NoSQL |
| Prisma ORM | Latest | ORM |
| JWT | 9.0.3 | Autenticação |
| Socket.IO | 4.8.3 | Comunicação real-time |
| bcryptjs | 3.0.3 | Hash de senhas |
| CORS | 2.8.6 | Segurança CORS |

---

# 🎯 Principais Funcionalidades

## 👤 Sistema de Usuários
- Cadastro de organizadores
- Login seguro JWT
- Sessões autenticadas

---

## ⚽ Gestão de Jogadores
- Cadastro completo
- Avaliação por estrelas (0.5 → 5.0)
- Histórico individual
- Estatísticas

---

## 🏟️ Gestão de Peladas
- Agendamento
- Controle de presença
- Lista de espera
- Controle financeiro

---

## 🎲 Sorteio Inteligente
- Balanceamento automático
- Diferença máxima de força: ≤ 0.5 estrelas
- Sorteio aleatório
- Drag & Drop manual

---

## 🔴 Jogo ao Vivo
- Cronômetro
- Placar em tempo real
- Gols e assistências
- Cartões
- Eventos sincronizados

---

## 🏆 Campeonatos
- Tabela automática
- Classificação
- Artilharia
- Ranking

---

# 📅 Planejamento por Sprints

## ✅ Sprints 1-2 — Login & Segurança
- Cadastro
- JWT
- Dashboard inicial

---

## ✅ Sprints 3-4 — Cadastro de Jogadores
- Jogadores
- Peladas
- Presença

---

## ✅ Sprints 5-6 — Sorteio Balanceado
- Algoritmo inteligente
- Balanceamento automático
- Lista de próximas

---

## ✅ Sprints 7-8 — Partida Ao Vivo
- WebSocket
- Cronômetro
- Súmulas

---

## ✅ Sprints 9-10 — Estatísticas & Financeiro
- Rateios
- Radar SVG
- Estatísticas acumuladas

---

## ✅ Sprints 11-12 — Campeonatos
- Tabelas
- Classificação
- Confrontos automáticos

---

# 💻 Instalação e Execução Local

## Pré-requisitos
- Node.js 18+
- npm ou yarn
- MongoDB Atlas (opcional)

---

## 1️⃣ Clone o projeto

```bash
git clone <url-do-repositorio>
cd futgestao
```

---

## 2️⃣ Instale as dependências

```bash
npm install
```

---

## 3️⃣ Configure o ambiente

Crie o arquivo `.env`:

```env
# MongoDB
MONGODB_URI=
MONGODB_NAME=

# Prisma (Opcional)
DATABASE_URL="postgresql://user:password@localhost:5432/futgestao"

# JWT
JWT_SECRET=jwt-futgestao-2026-x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4
```

---

## 4️⃣ Execute Prisma (Opcional)

```bash
npx prisma db push
```

---

## 5️⃣ Inicie o sistema

```bash
npm run dev
```

A aplicação ficará disponível em:

```txt
http://localhost:3000
```

---

# 📂 Estrutura do Projeto

```txt
futgestao/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── context/
│   ├── services/
│   ├── hooks/
│   ├── lib/
│   └── utils/
│
├── backend/
│
├── prisma/
│
├── public/
│
├── server.ts
├── vercel.json
├── package.json
└── README.md
```

---

# ☁️ Deploy no Vercel

O sistema está preparado para deploy automático:

## Frontend
- Build Vite
- React SPA

## Backend
- Serverless Functions
- Express API

## Variáveis Necessárias
Configure na Vercel:

```env
MONGODB_URI=
JWT_SECRET=
DATABASE_URL=
```

---

# 📖 Manual do Organizador

## 1️⃣ Cadastro
Crie sua conta de organizador.

---

## 2️⃣ Cadastro de Atletas
Defina o nível técnico corretamente.

---

## 3️⃣ Criar Pelada
Informe:
- Local
- Data
- Valor
- Número de atletas

---

## 4️⃣ Lista de Presença
Controle:
- Presença
- Pagamento
- Ordem de chegada

---

## 5️⃣ Sorteio de Times
O sistema gera automaticamente equipes balanceadas.

---

## 6️⃣ Partida Ao Vivo
Controle:
- Cronômetro
- Placar
- Gols
- Cartões
- Assistências

---

# 👥 Manual do Visitante

## 📺 Acompanhar Partidas
Os visitantes podem:
- Ver placar ao vivo
- Estatísticas
- Ranking
- Tabelas
- Artilharia

---

## ⚡ Atualizações em Tempo Real
Tudo sincronizado automaticamente via WebSocket.

---

# 🔌 API Endpoints

## 🔐 Autenticação

```http
POST /api/register
POST /api/token
```

---

## 👤 Jogadores

```http
GET /api/jogadores
POST /api/jogadores
```

---

## ⚽ Peladas

```http
POST /api/peladas
POST /api/peladas/{id}/sortear
```

---

# 🛡️ Segurança

## JWT
Todas as rotas protegidas validam tokens.

---

## BCrypt
Senhas nunca são salvas em texto puro.

---

## CORS
Proteção contra acessos indevidos.

---

# 🛠️ Troubleshooting

## Prisma no StackBlitz/Bolt.new
Caso falhe:

```bash
npx prisma generate
```

---

## MongoDB Atlas
Libere seu IP no painel do MongoDB Atlas.

---

## Socket.IO
Verifique:
- Porta correta
- CORS
- URL do backend

---

# ✅ Checklist de Validação

- [x] Cadastro/Login
- [x] JWT
- [x] Gestão de Jogadores
- [x] Sistema de Estrelas
- [x] Sorteio Balanceado
- [x] Tempo Real
- [x] WebSockets
- [x] Cronômetro
- [x] Controle Financeiro
- [x] Campeonatos
- [x] Ranking
- [x] Deploy Vercel

---

# 🎁 Entregáveis Finais

- Sistema completo de peladas
- Campeonatos automáticos
- Ranking e estatísticas
- Controle financeiro
- Sorteio inteligente
- Painel ao vivo
- WebSockets em tempo real
- Deploy em produção

---

# 📄 Licença

Projeto de uso educacional e profissional.

Livre para:
- estudar
- modificar
- distribuir
- aprimorar

---

# 🏆 FutGestao

Sistema moderno de gerenciamento de futebol amador desenvolvido com:
- React
- TypeScript
- Node.js
- Express
- Socket.IO
- MongoDB
- Prisma
- Tailwind CSS
- Vercel
