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
