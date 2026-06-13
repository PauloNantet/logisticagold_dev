# Fatura App 3.5 — Gerador de Faturas Full Stack

Sistema completo de **geração de faturas profissionais** para prestação de serviços de transporte (logística, fretamento, turismo). Evoluiu de um front-end standalone para um **sistema full-stack multi-usuário** com backend, banco de dados PostgreSQL e deploy em Docker.

---

## Arquitetura

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19 + Vite 8 |
| **Backend** | Node.js + Express 5 |
| **Banco de dados** | PostgreSQL (via pg) — Supabase |
| **Autenticação** | JWT + bcryptjs |
| **PDF** | jsPDF + html2canvas |
| **QR Code PIX** | Padrão EMV/CRC16 (Banco Central) |
| **Deploy** | Docker + Railway |

---

## Funcionalidades

### Autenticação e Multi-usuário
- Login com JWT (username + senha)
- Registro de conta
- Dados isolados por usuário (cada um vê apenas seus dados)
- Admin com painel de gerenciamento de usuários
- Seed automático de dados na primeira execução do admin

### Geração de Faturas
- Formulário completo com seções: Empresa, Dados da Fatura, Cliente, Responsável, Itens, Desconto/Imposto, Observações, PIX
- Autocomplete de clientes e serviços com navegação por teclado
- Múltiplos itens com quantidade, valor unitário e subtotal automático
- Cálculo automático de desconto (R$ ou %), imposto (R$ ou %) e total final
- Máscaras inteligentes de CPF, CNPJ, telefone e chave PIX
- Validação de campos com scroll automático ao primeiro erro
- Preview visual da fatura com escala responsiva (ResizeObserver)

### Temas
- **Branco** — clássico
- **Gold Dark** — dourado escuro
- **Gold Text** — dourado com texto destacado

### Download em PDF
- Geração via html2canvas + jsPDF
- Nome do cliente no arquivo
- Qualidade de impressão

### QR Code PIX
- Geração no padrão EMV/CRC16 do Banco Central
- Chave PIX configurável nas configurações

### Histórico de Faturas
- Toda fatura baixada é salva automaticamente
- Visualização de faturas arquivadas
- Restauração como nova fatura (com novo número)

### CRUD de Clientes
- Nome, documento, email, endereço, responsável, telefone
- Busca e ordenação por colunas
- Paginação com contagem

### CRUD de Serviços
- Produto, descrição, valor
- Busca e ordenação

### Gerenciador de Imagens
- Upload de imagens (logo da empresa)
- Armazenamento no banco como base64
- Exclusão de imagens

### Configurações da Empresa
- Nome, logo, endereço, CPF/CNPJ
- Telefones, email
- Chave PIX
- Tema

### Painel Admin
- Listar todos os usuários
- Criar usuários
- Redefinir senha
- Excluir usuários
- Backup/Restore do banco de dados

---

## API REST

| Rota | Métodos | Descrição |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | Criar conta |
| `/api/auth/login` | POST | Login (retorna JWT) |
| `/api/auth/me` | GET | Dados do usuário logado |
| `/api/auth/users` | GET | Listar usuários (admin) |
| `/api/auth/users/:username` | DELETE | Excluir usuário (admin) |
| `/api/auth/users/:username/reset-password` | POST | Resetar senha (admin) |
| `/api/clients` | GET/POST | Listar/criar clientes |
| `/api/clients/:id` | PUT/DELETE | Editar/excluir cliente |
| `/api/services` | GET/POST | Listar/criar serviços |
| `/api/services/:id` | PUT/DELETE | Editar/excluir serviço |
| `/api/history` | GET/POST | Listar/criar histórico |
| `/api/history/:id` | DELETE | Excluir histórico |
| `/api/settings` | GET/PUT | Obter/salvar configurações |
| `/api/images` | GET/POST | Listar/upload imagens |
| `/api/images/:id` | GET/DELETE | Obter/excluir imagem |
| `/api/images/:id/raw` | GET | Servir imagem raw |
| `/api/vehicles` | GET/POST | Listar/criar veículos |
| `/api/vehicles/:id` | PUT/DELETE | Editar/excluir veículo |
| `/api/drivers` | GET/POST | Listar/criar motoristas |
| `/api/drivers/:id` | PUT/DELETE | Editar/excluir motorista |
| `/api/service-orders` | GET/POST | Listar/criar ordens de serviço |
| `/api/service-orders/:id` | DELETE | Excluir ordem de serviço |
| `/api/mapas` | GET/POST | Listar/criar mapas de serviço |
| `/api/mapas/:id` | DELETE | Excluir mapa |
| `/api/agenda` | GET/POST | Listar/criar agendamentos |
| `/api/agenda/:id` | PUT/DELETE | Editar/excluir agendamento |
| `/api/agenda/:id/concluir` | PATCH | Toggle conclusão |
| `/api/admin/backup` | GET | Backup do banco (SQL) |
| `/api/admin/restore` | POST | Restaurar backup |

---

## Banco de Dados (PostgreSQL)

11 tabelas criadas automaticamente:

| Tabela | Descrição |
|---|---|
| **users** | Usuários com role (user/admin) |
| **clients** | Clientes por usuário |
| **services** | Serviços/produtos por usuário |
| **history** | Histórico de faturas |
| **images** | Imagens (logo) armazenadas em base64 |
| **settings** | Configurações da empresa por usuário |
| **vehicles** | Veículos por usuário |
| **service_orders** | Ordens de serviço |
| **mapas** | Mapas de serviço |
| **drivers** | Motoristas por usuário |
| **agenda_servicos** | Agendamentos de serviços |

Todas as tabelas com `FOREIGN KEY (user_id) ON DELETE CASCADE` — dados isolados por usuário.

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Frontend Vite (porta 5173) |
| `npm run dev:server` | Backend Express (porta 3001) |
| `npm run dev:all` | Frontend + Backend em paralelo |
| `npm run build` | Build do frontend |
| `npm run start` | Produção (Express serve frontend buildado) |
| `npm run lint` | ESLint |

---

## Deploy

- **Docker**: multi-stage (build + runtime)
- **Railway**: deploy automático via GitHub
- **Banco de dados**: Supabase (PostgreSQL na nuvem)
- **Variáveis de ambiente**: PORT, JWT_SECRET, DATABASE_URL, NODE_ENV

---

## Evolução da v2 para v3.5

| Aspecto | v2 (standalone) | v3.5 (full stack) |
|---|---|---|
| Armazenamento | localStorage | PostgreSQL (Supabase) |
| Autenticação | Não existia | JWT + bcrypt |
| Multi-usuário | Não | Sim, dados isolados |
| Backend | Nenhum | Express 5 + REST API |
| Imagens | localStorage | Banco PostgreSQL |
| Deploy | Static (Vercel/Netlify) | Docker + Railway |
| Admin | Não | Painel admin completo |
| Seed data | Manual | Automático |
| API | Nenhuma | REST com 30+ endpoints |
