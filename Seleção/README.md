# Sistema de Seleção — Gestão de Futebol Amador

Aplicação inicial do **Sistema de Gestão de Futebol Amador**. Ela apresenta ao usuário os dois modos disponíveis — **Pelada** e **Campeonato** — e o encaminha para o sistema escolhido.

> Este projeto corresponde à pasta `Seleção` do repositório. Ele é um front-end independente, responsável somente pela escolha e pelo redirecionamento entre os módulos.

## Sumário

- [Visão geral](#visão-geral)
- [Problema e contextualização](#problema-e-contextualização)
- [Objetivos](#objetivos)
- [Funcionalidades](#funcionalidades)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Configuração das URLs dos sistemas](#configuração-das-urls-dos-sistemas)
- [Comandos disponíveis](#comandos-disponíveis)
- [Geração de versão de produção](#geração-de-versão-de-produção)
- [Solução de problemas](#solução-de-problemas)

## Visão geral

O Sistema de Seleção funciona como o ponto de entrada da solução de gestão de futebol amador. Em vez de exigir que o usuário conheça e digite manualmente o endereço de cada aplicação, a interface centraliza os acessos e permite escolher, de forma visual, o ambiente desejado:

- **Pelada:** módulo voltado à organização de peladas, jogadores, times, partidas e pagamentos;
- **Campeonato:** módulo voltado à gestão de equipes, tabela, classificação e resultados de campeonatos.

Ao selecionar uma opção, a aplicação realiza um redirecionamento completo para a URL configurada para aquele sistema.

## Problema e contextualização

Uma solução de gestão de futebol amador pode reunir funcionalidades diferentes para contextos distintos. A organização de uma pelada exige controles como confirmação de presença, formação de times, rodízio, placar e pagamentos. Já a administração de um campeonato envolve equipes, calendário, confrontos, classificação e resultados.

Quando esses módulos são executados como aplicações separadas, o acesso pode ficar fragmentado: cada usuário precisa saber qual endereço utilizar e qual sistema atende à sua necessidade. O Sistema de Seleção resolve esse ponto ao disponibilizar uma tela inicial única, clara e configurável para encaminhar o usuário ao módulo correto.

## Objetivos

- Centralizar o acesso aos módulos de **Pelada** e **Campeonato**;
- Facilitar a identificação do sistema adequado para cada necessidade;
- Permitir a configuração das URLs de destino sem alterar o código-fonte;
- Manter uma interface inicial simples, responsiva e coerente com o tema de gestão esportiva;
- Reduzir a dependência de endereços locais fixos durante o desenvolvimento e facilitar futuras implantações.

## Funcionalidades

- Exibição de uma tela inicial com os modos **Pelada** e **Campeonato**;
- Cards interativos com descrição de cada módulo;
- Redirecionamento para o sistema escolhido por meio do navegador;
- Uso de variáveis de ambiente para configurar as URLs de destino;
- Valores padrão para desenvolvimento local:
  - Pelada: `http://localhost:5173`
  - Campeonato: `http://localhost:3000`
- Execução local do seletor na porta `5175`.

## Tecnologias utilizadas

| Tecnologia | Finalidade |
| --- | --- |
| [React](https://react.dev/) | Construção da interface baseada em componentes |
| [TypeScript](https://www.typescriptlang.org/) | Tipagem estática e maior segurança no desenvolvimento |
| [Vite](https://vite.dev/) | Servidor de desenvolvimento e geração do build da aplicação |
| [Tailwind CSS](https://tailwindcss.com/) | Estilização utilitária e responsiva |
| [Lucide React](https://lucide.dev/) | Ícones utilizados na interface |
| ESLint | Análise estática e padronização do código |

## Estrutura do projeto

```text
Seleção/
├── src/
│   ├── pages/
│   │   └── ModeSelection.tsx   # Tela de escolha entre os módulos
│   ├── App.tsx                 # Componente principal
│   ├── main.tsx                # Ponto de entrada da aplicação
│   └── index.css               # Estilos globais
├── vite.config.ts              # Configuração do Vite e porta local
├── package.json                # Dependências e scripts
└── README.md                   # Documentação deste módulo
```

## Pré-requisitos

Antes de iniciar, tenha instalado:

- [Node.js](https://nodejs.org/) em uma versão LTS compatível com o Vite;
- npm (instalado junto com o Node.js);
- Git, caso deseje clonar o repositório.

Verifique as instalações com:

```bash
node --version
npm --version
git --version
```

## Instalação e execução

### 1. Clone o repositório

```bash
git clone https://github.com/ViniciusVas/Sistema-de-Gestao-de-Futebol-Amador-Completo.git
```

### 2. Acesse a pasta do Sistema de Seleção

```bash
cd "Sistema-de-Gestao-de-Futebol-Amador-Completo/Seleção"
```

> As aspas evitam problemas em terminais que não lidam bem com caracteres acentuados no nome da pasta.

### 3. Instale as dependências

Para uma instalação reprodutível a partir do arquivo de bloqueio do projeto, utilize:

```bash
npm ci
```

Como alternativa, também é possível executar:

```bash
npm install
```

### 4. Configure os endereços dos módulos

Crie um arquivo chamado `.env.local` dentro da pasta `Seleção` e informe as URLs que devem ser abertas pelos botões. Consulte o exemplo em [Configuração das URLs dos sistemas](#configuração-das-urls-dos-sistemas).

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Com a configuração atual, a tela estará disponível em:

```text
http://localhost:5175
```

A porta `5175` está definida em `vite.config.ts` com `strictPort: true`. Portanto, se ela já estiver em uso, o Vite exibirá um erro em vez de selecionar outra porta automaticamente.

## Configuração das URLs dos sistemas

As URLs são definidas com variáveis de ambiente do Vite. Crie o arquivo `Seleção/.env.local` com o conteúdo abaixo e ajuste os valores conforme os serviços em execução:

```env
VITE_PELADA_URL=http://localhost:5173
VITE_CAMPEONATO_URL=http://localhost:3000
```

| Variável | Descrição | Valor padrão quando não configurada |
| --- | --- | --- |
| `VITE_PELADA_URL` | URL do sistema de gestão de peladas | `http://localhost:5173` |
| `VITE_CAMPEONATO_URL` | URL do sistema de gestão de campeonatos | `http://localhost:3000` |

Após criar ou alterar o arquivo `.env.local`, reinicie o servidor com `npm run dev` para que as variáveis sejam carregadas novamente.

> Variáveis iniciadas com `VITE_` ficam disponíveis no código executado pelo navegador. Não use esse arquivo para senhas, tokens privados ou outras informações sensíveis.

### Alterando a porta do seletor

Para alterar a porta padrão do Sistema de Seleção, edite o valor de `port` em `vite.config.ts`:

```ts
server: {
  port: 5175,
  strictPort: true,
}
```

Por exemplo, para executar o seletor na porta `5176`, substitua `5175` por `5176` e reinicie o servidor.

## Comandos disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento Vite na porta configurada |
| `npm run build` | Executa a verificação de tipos e gera os arquivos otimizados em `dist/` |
| `npm run lint` | Executa a análise estática do código com ESLint |
| `npm run preview` | Disponibiliza localmente a versão gerada pelo comando de build |

## Geração de versão de produção

Antes de publicar a aplicação, configure as URLs reais dos módulos no arquivo `.env.local` ou nas variáveis de ambiente da plataforma de hospedagem.

Em seguida, gere o build:

```bash
npm run build
```

Os arquivos estáticos serão criados na pasta `dist/`. Para validar a versão de produção localmente, execute:

```bash
npm run preview
```

O Vite exibirá no terminal o endereço local de visualização. Garanta que as URLs configuradas em `VITE_PELADA_URL` e `VITE_CAMPEONATO_URL` estejam acessíveis aos usuários do ambiente publicado.

## Solução de problemas

### Erro: `lucide-react ... could not be resolved`

Esse erro normalmente ocorre quando as dependências ainda não foram instaladas ou a pasta `node_modules` está incompleta. Na pasta `Seleção`, execute:

```bash
npm install
```

Depois, reinicie o servidor:

```bash
npm run dev
```

### A porta `5175` já está em uso

Encerre o processo que está utilizando a porta ou altere a configuração em `vite.config.ts`, conforme descrito em [Alterando a porta do seletor](#alterando-a-porta-do-seletor).

### O botão abre a página errada ou não abre o sistema esperado

Confira os valores definidos em `.env.local`, verifique se os módulos de Pelada e Campeonato estão em execução e reinicie o Vite após alterar as variáveis de ambiente.

### As variáveis de ambiente não são reconhecidas

Verifique se:

1. o arquivo está dentro da pasta `Seleção`;
2. o nome é exatamente `.env.local`;
3. as variáveis começam com `VITE_`;
4. o servidor foi reiniciado após a alteração.

## Autor

Desenvolvido como parte do projeto **Sistema de Gestão de Futebol Amador**.
