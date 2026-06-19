# Melhorias Futuras — Fatura App 3.5

## Arquitetura & Organização

- [ ] Quebrar `App.jsx` (~888 linhas) em hooks customizados (`useFatura`, `useOS`, `useMapa`)
- [ ] Criar pastas `src/hooks/`, `src/context/`, `src/pages/` para separar responsabilidades
- [ ] Migrar para TypeScript para reduzir erros e melhorar DX

## Performance

- [ ] Agrupar estados relacionados ou usar `useReducer`
- [ ] Adicionar `useCallback` nos handlers passados como props para evitar re-renders
- [ ] Separar o state global único (`data`) em contextos menores para evitar re-renders em cascata

## UX/UI

- [ ] Adicionar biblioteca de componentes (Material UI, Chakra UI, ou componentes próprios reutilizáveis)
- [ ] Implementar tema dinâmico via ThemeProvider/Context
- [ ] Adicionar feedback visual de loading (spinners, skeletons) em vez de `return null`

## Código

- [x] Remover backup/restore do banco
- [x] Remover isolamento por user_id (app de empresa única)
- [ ] Renomear `api.del` para `api.delete` (convenção)
- [ ] Melhorar tratamento de erros com feedback visual para o usuário (toasts, alerts estilizados)
- [ ] Extrair strings mágicas (`"mapa"`, `"ordem-servico"`, `"fatura"`) para constantes/enum

## Backend

- [ ] Adicionar validação de schemas nas rotas (Zod, Joi, express-validator)
- [ ] Adicionar ORM (Knex, Prisma, Drizzle) para segurança e produtividade

---

# Análise Completa — LogGold 1.0 (Junho 2026)

## Bugs Críticos

- [ ] **Credenciais expostas no `.env`** — Arquivo contém senha real do banco PostgreSQL e JWT secret. Se estiver no git, é um risco grave de segurança.
- [ ] **SQL Injection em `server/db.js:163`** — Nome da tabela é interpolado diretamente na query (`${table}`). Embora as tabelas sejam fixas agora, é uma vulnerabilidade.
- [ ] **Servidor inicia antes do DB (`server/index.js:58-69`)** — `app.listen()` roda antes do `initDB()` completar. Requests podem chegar antes do banco estar pronto.
- [ ] **Admin hardcoded (`server/routes/auth.js:25-26`)** — `ADMIN_USERNAME = "cainn"` e `ADMIN_PASSWORD = "cainn"` fixados no código-fonte.
- [ ] **Rotas sem tratamento de erro** — A maioria das rotas (clients, services, vehicles, drivers, history, etc.) não tem `try/catch`. Erros do PostgreSQL vão para o handler genérico do Express.

## Melhorias de Segurança

- [ ] **JWT_SECRET com fallback fraco** (`server/middleware/auth.js:3`) — Fallback é uma string hardcoded previsível.
- [ ] **Token no localStorage** (`src/utils/api.js:4`) — Vulnerável a ataques XSS. Usar httpOnly cookies seria mais seguro.
- [ ] **cors() aberto para todos** (`server/index.js:27`) — Deveria restringir origens em produção.
- [ ] **express.json sem limites de tipo** (`server/index.js:28`) — Apenas limite de tamanho, sem validação.
- [ ] **bcryptjs com salt rounds 10** (`server/routes/auth.js:100`) — Considerar 12 para produção.

## Bugs Funcionais

- [ ] **Cálculo de desconto/imposto duvidoso** (`App.jsx:237-249`) — Divisão por 10000 sugere input em "centavos de porcentagem" (ex: 1500 = 15%). Pode causar confusão ao usuário.
- [ ] **Arquivo `backup-$(Get-Date` na raiz** — Arquivo corrompido, provavelmente backup PowerShell com escape incorreto.
- [ ] **Rota `/api/admin` vazia** (`server/routes/admin.js`) — Rota importada em `index.js` mas o router está completamente vazio.

## Problemas de Arquitetura

- [ ] **`App.jsx` monolítico (1294 linhas)** — Toda a lógica de estado de 4 módulos (Fatura, OS, Mapa, Orçamento) em um único componente. Dividir em custom hooks (`useFatura`, `useOS`, `useMapa`, `useOrcamento`).
- [ ] **Dados duplicados no OrcamentoPreview** (`App.jsx:1199-1258`) — Cálculos de total/desconto/imposto re-feitos inline 3x cada em vez de usar `useMemo`.
- [ ] **localStorage para simulação de OS** (`App.jsx:136-141`) — Dados de simulação no `localStorage`, limitado e pode perder dados.

## Resumo

| Categoria | Qtd |
|---|---|
| Bugs críticos | 5 |
| Segurança | 5 |
| Funcionais | 3 |
| Arquitetura | 3 |

**Prioridade máxima:** Corrigir credenciais expostas, adicionar try/catch nas rotas, proteger endpoint de admin.
