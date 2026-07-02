# FutGestao - Sistema de Gerenciamento de Peladas

Sistema completo para organização e gestão de peladas de futebol, desenvolvido com React + TypeScript no frontend e Node.js + Express no backend, utilizando MongoDB como banco de dados.

## 🚀 Deploy no Vercel
Acesse a aplicação: [https://sistema-de-gestao-de-futebol-amador.vercel.app](https://sistema-de-gestao-de-futebol-amador.vercel.app)

---

## 👥 Equipe de Desenvolvimento

### Frontend
- **Fabíula de Araújo Brandão** - Desenvolvedora Frontend
  - Responsável por: Interface React/TypeScript, experiência do usuário, design responsivo

### Backend
- **Laura Carolina** - Desenvolvedora Backend Lead
  - Responsável por: Arquitetura Node.js, APIs REST, autenticação JWT

- **Vinícius Abreu Vasconcelos dos Santos** - Desenvolvedor Backend
  - Responsável por: Modelos de dados, lógica de negócios, integração MongoDB

---

## 📝 Sobre o Projeto
O FutGestao é uma solução moderna e completa para organizadores de peladas que precisam:
- Cadastrar e gerenciar jogadores com níveis de habilidade
- Agendar e organizar partidas
- Controlar listas de presença em tempo real
- Confirmar participação e pagamentos
- Visualizar estatísticas e histórico
- Gerenciar times e campeonatos

### Características Principais
- **Frontend React** - React 19 + TypeScript + Tailwind CSS
- **Backend Node.js** - Express + MongoDB (ou SQLite/Prisma) com autenticação JWT
- **Design Responsivo** - Interface adaptável para desktop e mobile
- **Autenticação Segura** - Sistema de login com JWT
- **Deploy Automático** - Configurado para Vercel
- **Banco MongoDB** - Suporte a MongoDB Atlas para produção
- **Real-time** - Socket.IO para atualizações em tempo real

---

## 🛠️ Tecnologias Utilizadas

### Frontend
| Tecnologia | Versão | Função |
|-----------|--------|--------|
| React | 19.0.0 | Framework JavaScript |
| TypeScript | 5.8.2 | Tipagem estática |
| Tailwind CSS | 4.1.14 | Framework CSS |
| React Router | 7.14.0 | Roteamento |
| Axios | 1.14.0 | Cliente HTTP |
| React Hot Toast | 2.6.0 | Notificações |
| Lucide React | 0.546.0 | Ícones |

### Backend
| Tecnologia | Versão | Função |
|-----------|--------|--------|
| Node.js | 18+ | Runtime JavaScript |
| Express | 4.21.2 | Framework web |
| MongoDB | 7.2.0 | Banco de dados NoSQL |
| JWT | 9.0.3 | Autenticação |
| Socket.IO | 4.8.3 | Comunicação real-time |
| bcryptjs | 3.0.3 | Hash de senhas |
| CORS | 2.8.6 | Controle de CORS |

---

## 💻 Instalação e Execução Local

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm ou yarn
- Conta no MongoDB Atlas (ou MongoDB local)

### Passo 1: Clone o projeto
```bash
git clone <url-do-repositorio>
cd futgestao
```

### Passo 2: Instale as dependências
```bash
npm install
```

### Passo 3: Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
# MongoDB
MONGODB_URI=mongodb+srv://fabiulabrandao15_db_user:hGT5wxGilTYu6D9l@cluster0.cislst7.mongodb.net/
MONGODB_NAME=futgestao

# JWT
JWT_SECRET=jwt-futgestao-2026-x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4
```

### Passo 4: Inicie o servidor
```bash
npm run dev
```
O sistema estará rodando em `http://localhost:3000`

---

## 📂 Estrutura do Projeto
```
futgestao/
|
+-- src/                    # Frontend React
|   +-- components/         # Componentes reutilizáveis
|   +-- pages/              # Páginas da aplicação (Login, Dashboard, Players, etc.)
|   +-- context/            # Context API (Auth, Theme)
|   +-- services/           # Serviços (API, Socket)
|   +-- lib/                # Utilitários
|
+-- backend/                # Estrutura do Backend Node.js
+-- prisma/                 # Esquema do banco de dados
+-- server.ts               # Servidor Express + Vite Middleware
+-- vercel.json             # Configuração Vercel
+-- package.json            # Dependências e scripts
```

---

## ☁️ Deploy no Vercel

O projeto está configurado para deploy automático:
1. **Frontend**: Build estático com Vite.
2. **Backend**: Serverless functions com Express.
3. **Variáveis**: Devem ser configuradas no painel da Vercel (MONGODB_URI, JWT_SECRET).

---

## 🏆 Modo Campeonato
O FutGestao agora conta com um completo **Modo Campeonato**, permitindo organizar torneios com múltiplas equipes, tabela automatizada e estatísticas avançadas.

### Funcionalidades do Campeonato
- **Gestão de Times**: Criação de equipes personalizadas e escalação de jogadores.
- **Geração de Tabela**: Sorteio automático de rodadas (Turno Único ou Ida e Volta).
- **Classificação em Tempo Real**: Cálculo automático de Pontos, Vitórias, Saldo de Gols e Gols Pró.
- **Súmula Eletrônica**: Registro detalhado de gols e cartões por partida.
- **Artilharia e Cartões**: Rankings automáticos de goleadores e controle de suspensões (2 amarelos ou 1 vermelho).

---

## 📖 Manuais de Uso

### 👔 Manual do Organizador
1. **Cadastro**: Crie sua conta de organizador para ter acesso ao painel de controle.
2. **Setup Inicial**: Vá em "Jogadores" e cadastre todos os participantes com seus devidos níveis (0.5 a 5.0 estrelas).
3. **Organizando a Pelada**: 
   - Crie uma nova pelada.
   - Adicione os jogadores na lista de presença conforme eles confirmam.
   - Use o botão "Sortear Times" para gerar equipes equilibradas automaticamente.
   - Durante o jogo, clique em "Iniciar" no cronômetro e use os botões "+" para registrar gols.
   - Ao final, marque quem pagou no ícone de "Cifrão ($)".
4. **Gerindo Campeonatos**:
   - Em "Campeonatos", crie um novo torneio e defina o formato.
   - Adicione os times e escale os jogadores (cada jogador deve estar em um time).
   - Clique em "Gerar Tabela" para criar as rodadas.
   - Clique no ícone de "Prancheta" em cada jogo para registrar o placar e os eventos (quem fez o gol, quem levou cartão).

### 🏃 Manual do Visitante / Jogador
1. **Página Inicial**: Acompanhe as próximas peladas agendadas.
2. **Estatísticas**: Veja seu desempenho individual no ranking geral (Gols, Assistências, Vitórias).
3. **Campeonatos**: Acesse a aba de Campeonatos para ver a classificação atualizada, a artilharia e os próximos confrontos do seu time.

---

## 🔌 API Endpoints (Resumo)

### Autenticação
- `POST /api/register` - Registro
- `POST /api/token` - Login (JWT)

### Jogadores & Peladas
- `GET /api/jogadores` - Lista geral
- `POST /api/peladas` - Nova partida
- `POST /api/peladas/{id}/sortear` - Sorteio de times

### Campeonatos
- `GET /api/championships` - Listar campeonatos
- `GET /api/championships/{id}/classificacao` - Tabela de classificação
- `GET /api/championships/{id}/artilharia` - Ranking de gols
- `PUT /api/championships/jogos/{id}` - Atualizar súmula do jogo

---

## 🛡️ Segurança
- **JWT**: Todas as rotas protegidas validam o token no header Authorization.
- **Bcrypt**: Senhas nunca são salvas em texto puro.
- **CORS**: Configurado para restringir acessos não autorizados.

---

## 🛠️ Troubleshooting (Solução de Problemas)
- **Erro de Prisma no StackBlitz**: Se o download das engines falhar, o sistema entrará em modo restrito. Tente recarregar ou rodar `npx prisma generate` manualmente.
- **Conexão MongoDB**: Verifique se o seu IP está liberado no painel do MongoDB Atlas.

---

## 📄 Licença
Este projeto é de uso educacional e pode ser modificado e distribuído livremente.

---

## 🏆 Checklist de Validação
- [x] Cadastro e Login
- [x] Gestão de Jogadores (0.5 a 5.0 estrelas)
- [x] Sorteio Balanceado (diferença ≤ 0.5)
- [x] Cronômetro e Placar em tempo real
- [x] Controle Financeiro e Pagamentos
- [x] Campeonatos e Classificação Automatizada
