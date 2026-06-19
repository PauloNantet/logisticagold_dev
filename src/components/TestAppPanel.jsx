import { useState, useRef, useEffect } from "react";
import { Play, Square, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../utils/api";

const DELAY = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function TestData({ apiActions, appActions, onTestStart }) {
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const logRef = useRef(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const log = (msg, type = "info") => {
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString("pt-BR") }]);
  };

  const runTests = async () => {
    setRunning(true);
    abortRef.current = false;
    setLogs([]);
    if (onTestStart) onTestStart();

    const step = async (msg, fn) => {
      if (abortRef.current) throw new Error("ABORTED");
      log(msg, "running");
      await sleep(DELAY);
      try {
        const result = await fn();
        log(`✅ ${msg} — OK`, "success");
        return result;
      } catch (err) {
        log(`❌ ${msg} — ERRO: ${err.message}`, "error");
        throw err;
      }
    };

    try {
      // ========== 1. CONFIGURAÇÕES ==========
      log("═══ 1. CONFIGURAÇÕES DA EMPRESA ═══", "section");
      await step("Carregar configurações atuais", async () => {
        const settings = await apiActions.getSettings();
        return settings;
      });

      await step("Salvar dados da empresa de teste", async () => {
        await apiActions.saveSettings({
          empresa: {
            nome: "LogGold Transportes LTDA",
            documento: "12345678000195",
            telefone: "21 99999-0000",
            email: "contato@teste.com",
            endereco: "Rua Teste, 123 - Centro - Rio de Janeiro/RJ",
          },
          pagamento: {
            tipoPix: "cpf",
            pix: "12345678900",
            nome: "LogGold Transportes",
            cidade: "Rio de Janeiro",
          },
          tema: "gold-text",
        });
      });

      await step("Recarregar configurações e verificar", async () => {
        const s = await apiActions.getSettings();
        if (s.empresa?.nome !== "LogGold Transportes LTDA") throw new Error("Nome da empresa não atualizado");
        return s;
      });

      // ========== 2. CLIENTES ==========
      log("═══ 2. CRUD DE CLIENTES ═══", "section");
      const testClients = [
        { nome: "Empresa Alpha LTDA", documento: "11222333000181", email: "alpha@teste.com", endereco: "Av. Brasil, 500 - Botafogo - RJ", responsavelNome: "João Alpha", responsavelTelefone: "21 98888-1111" },
        { nome: "Beta Corp", documento: "22333444000190", email: "beta@teste.com", endereco: "Rua das Laranjeiras, 200 - RJ", responsavelNome: "Maria Beta", responsavelTelefone: "21 97777-2222" },
        { nome: "Gamma S.A.", documento: "33444555000109", email: "gamma@teste.com", endereco: "Av. Copacabana, 1000 - RJ", responsavelNome: "Carlos Gamma", responsavelTelefone: "21 96666-3333" },
      ];

      const createdClients = [];
      for (const c of testClients) {
        const created = await step(`Cadastrar cliente: ${c.nome}`, async () => {
          return await apiActions.createClient(c);
        });
        createdClients.push(created);
      }

      await step("Listar todos os clientes", async () => {
        const list = await apiActions.listClients();
        if (list.length < 3) throw new Error(`Esperado >=3 clientes, encontrado ${list.length}`);
        log(`   📋 Total de clientes: ${list.length}`, "info");
        return list;
      });

      await step(`Editar cliente: ${testClients[0].nome}`, async () => {
        return await apiActions.updateClient(createdClients[0].id, {
          ...testClients[0],
          nome: "Empresa Alpha LTDA (EDITADO)",
          email: "alpha-editado@teste.com",
        });
      });

      await step(`Excluir cliente: ${testClients[2].nome}`, async () => {
        return await apiActions.deleteClient(createdClients[2].id);
      });

      // ========== 3. SERVIÇOS ==========
      log("═══ 3. CRUD DE SERVIÇOS ═══", "section");
      const testServices = [
        { produto: "Transfer Aeroporto", descricao: "Transfer do aeroporto Galeão ao hotel", valor: "150.00" },
        { produto: "Passeio Turístico", descricao: "Passeio pela cidade - 4h", valor: "350.00" },
        { produto: "Fraco Diário", descricao: "Fretamento de van por dia completo", valor: "1200.00" },
      ];

      const createdServices = [];
      for (const s of testServices) {
        const created = await step(`Cadastrar serviço: ${s.produto}`, async () => {
          return await apiActions.createService(s);
        });
        createdServices.push(created);
      }

      await step("Listar todos os serviços", async () => {
        const list = await apiActions.listServices();
        if (list.length < 3) throw new Error(`Esperado >=3 serviços, encontrado ${list.length}`);
        log(`   📋 Total de serviços: ${list.length}`, "info");
        return list;
      });

      await step(`Editar serviço: ${testServices[0].produto}`, async () => {
        return await apiActions.updateService(createdServices[0].id, {
          ...testServices[0],
          valor: "175.00",
        });
      });

      await step(`Excluir serviço: ${testServices[2].produto}`, async () => {
        return await apiActions.deleteService(createdServices[2].id);
      });

      // ========== 4. VEÍCULOS ==========
      log("═══ 4. CRUD DE VEÍCULOS ═══", "section");
      const testVehicles = [
        { modelo: "Mercedes Sprinter", placa: "ABC-1234", cor: "Branco", marca: "Mercedes" },
        { modelo: "Ford Transit", placa: "DEF-5678", cor: "Prata", marca: "Ford" },
      ];

      const createdVehicles = [];
      for (const v of testVehicles) {
        const created = await step(`Cadastrar veículo: ${v.modelo}`, async () => {
          return await apiActions.createVehicle(v);
        });
        createdVehicles.push(created);
      }

      await step("Listar veículos", async () => {
        const list = await apiActions.listVehicles();
        log(`   📋 Total de veículos: ${list.length}`, "info");
        return list;
      });

      await step(`Excluir veículo: ${testVehicles[1].modelo}`, async () => {
        return await apiActions.deleteVehicle(createdVehicles[1].id);
      });

      // ========== 5. MOTORISTAS ==========
      log("═══ 5. CRUD DE MOTORISTAS ═══", "section");
      const testDrivers = [
        { nome: "Pedro Motorista", contato: "21 95555-4444" },
        { nome: "Lucas Silva", contato: "21 94444-5555" },
      ];

      const createdDrivers = [];
      for (const d of testDrivers) {
        const created = await step(`Cadastrar motorista: ${d.nome}`, async () => {
          return await apiActions.createDriver(d);
        });
        createdDrivers.push(created);
      }

      await step("Listar motoristas", async () => {
        const list = await apiActions.listDrivers();
        log(`   📋 Total de motoristas: ${list.length}`, "info");
        return list;
      });

      // ========== 6. FATURA (UI) ==========
      log("═══ 6. TESTE DE FATURA (UI) ═══", "section");

      await step("Navegar para aba Fatura", async () => {
        appActions.switchTab("fatura");
      });

      await step("Preencher dados da fatura", async () => {
        appActions.update("fatura", "numero", "001");
        appActions.update("fatura", "data", new Date().toISOString().split("T")[0]);
        appActions.update("fatura", "vencimento", new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
      });

      await step("Preencher dados do cliente", async () => {
        appActions.update("cliente", "nome", "Empresa Alpha LTDA (EDITADO)");
        appActions.update("cliente", "documento", "11222333000181");
        appActions.update("cliente", "email", "alpha-editado@teste.com");
        appActions.update("cliente", "endereco", "Av. Brasil, 500 - Botafogo - RJ");
      });

      await step("Preencher responsável", async () => {
        appActions.update("responsavel", "nome", "João Alpha");
        appActions.update("responsavel", "telefone", "21988881111");
      });

      await step("Adicionar itens à fatura", async () => {
        appActions.updateItem(0, "produto", "Transfer Aeroporto");
        appActions.updateItem(0, "descricao", "Transfer do aeroporto Galeão ao hotel");
        appActions.updateItem(0, "valor", "150");
        appActions.updateItem(0, "quantidade", "2");
        appActions.addItem();
        appActions.updateItem(1, "produto", "Passeio Turístico");
        appActions.updateItem(1, "descricao", "Passeio pela cidade - 4h");
        appActions.updateItem(1, "valor", "350");
        appActions.updateItem(1, "quantidade", "1");
      });

      await step("Configurar desconto e imposto", async () => {
        appActions.update("desconto", "tipo", "porcentagem");
        appActions.update("desconto", "valor", "500");
        appActions.update("imposto", "tipo", "fixed");
        appActions.update("imposto", "valor", "10000");
      });

      await step("Adicionar observações", async () => {
        appActions.setData((prev) => ({ ...prev, observacoes: "Pagamento em 2x sem juros. Teste automatizado." }));
      });

      await step("Submeter fatura para preview", async () => {
        appActions.submitFatura();
      });

      await step("Voltar da preview para edição", async () => {
        appActions.setPreview(false);
      });

      // ========== 7. ORÇAMENTO (UI) ==========
      log("═══ 7. TESTE DE ORÇAMENTO (UI) ═══", "section");

      await step("Navegar para aba Orçamento", async () => {
        appActions.switchTab("orcamento");
      });

      await step("Preencher dados do orçamento", async () => {
        appActions.updateOrcamento("orcamento", "numero", "001");
        appActions.updateOrcamento("orcamento", "data", new Date().toISOString().split("T")[0]);
        appActions.updateOrcamento("orcamento", "validade", "30");
      });

      await step("Preencher cliente no orçamento", async () => {
        appActions.updateOrcamento("cliente", "nome", "Beta Corp");
        appActions.updateOrcamento("cliente", "documento", "22333444000190");
        appActions.updateOrcamento("cliente", "email", "beta@teste.com");
        appActions.updateOrcamento("cliente", "endereco", "Rua das Laranjeiras, 200 - RJ");
      });

      await step("Preencher responsável no orçamento", async () => {
        appActions.updateOrcamento("responsavel", "nome", "Maria Beta");
        appActions.updateOrcamento("responsavel", "telefone", "21977772222");
      });

      await step("Adicionar itens ao orçamento", async () => {
        appActions.updateOrcamentoItem(0, "descricao", "Fraco Diário - Van 15 passageiros");
        appActions.updateOrcamentoItem(0, "valor", "1200");
        appActions.updateOrcamentoItem(0, "quantidade", "3");
        appActions.addOrcamentoItem();
        appActions.updateOrcamentoItem(1, "descricao", "Seguro passageiro");
        appActions.updateOrcamentoItem(1, "valor", "50");
        appActions.updateOrcamentoItem(1, "quantidade", "45");
      });

      await step("Configurar desconto no orçamento", async () => {
        appActions.updateOrcamento("desconto", "tipo", "fixed");
        appActions.updateOrcamento("desconto", "valor", "20000");
      });

      await step("Submeter orçamento para preview", async () => {
        appActions.submitOrcamento();
      });

      await step("Voltar da preview do orçamento", async () => {
        appActions.setOrcamentoPreview(false);
      });

      // ========== 8. MAPA DE SERVIÇO (UI) ==========
      log("═══ 8. TESTE DE MAPA DE SERVIÇO (UI) ═══", "section");

      await step("Navegar para aba Mapa de Serviço", async () => {
        appActions.switchTab("mapa");
      });

      await step("Adicionar entry ao mapa via API (agenda)", async () => {
        await apiActions.createAgendaEntry({
          fornecedor: "Fornecedor Alpha",
          numero: "001",
          data: new Date().toISOString().split("T")[0],
          hora: "08:00",
          voo: "GOL 1234",
          servico: "Transfer",
          nome_guia: "Guia Teste",
          tel_guia: "21 99999-0000",
          nome_pax: "John Doe",
          pax: "2",
          file_evento: "Evento Teste",
          cliente: { nome: "Empresa Alpha LTDA (EDITADO)" },
          observacao: "Teste automatizado de mapa",
          veiculo: "Mercedes Sprinter",
          placa: "ABC-1234",
          motorista: "Pedro Motorista",
          contato_motorista: "21 95555-4444",
          valor_pagar: "500",
          valor_receber: "750",
          lucro: 250,
        });
      });

      await step("Adicionar segunda entry ao mapa", async () => {
        await apiActions.createAgendaEntry({
          fornecedor: "Fornecedor Beta",
          numero: "002",
          data: new Date().toISOString().split("T")[0],
          hora: "14:00",
          voo: "AZU 5678",
          servico: "Passeio",
          nome_guia: "Guia Beta",
          tel_guia: "21 98888-1111",
          nome_pax: "Jane Smith",
          pax: "4",
          file_evento: "Evento Beta",
          cliente: { nome: "Beta Corp" },
          observacao: "Segundo teste de mapa",
          veiculo: "Ford Transit",
          placa: "DEF-5678",
          motorista: "Lucas Silva",
          contato_motorista: "21 94444-5555",
          valor_pagar: "800",
          valor_receber: "1200",
          lucro: 400,
        });
      });

      await step("Listar agendamentos", async () => {
        const list = await apiActions.listAgenda();
        log(`   📋 Total de agendamentos: ${list.length}`, "info");
        return list;
      });

      // ========== 9. HISTÓRICOS ==========
      log("═══ 9. VERIFICAR HISTÓRICOS ═══", "section");

      await step("Verificar histórico de faturas", async () => {
        const list = await apiActions.listHistory();
        log(`   📋 Faturas no histórico: ${list.length}`, "info");
        return list;
      });

      await step("Verificar histórico de OS", async () => {
        const list = await apiActions.listOS();
        log(`   📋 Ordens de serviço: ${list.length}`, "info");
        return list;
      });

      await step("Verificar histórico de mapas", async () => {
        const list = await apiActions.listMapas();
        log(`   📋 Mapas: ${list.length}`, "info");
        return list;
      });

      await step("Verificar orçamentos", async () => {
        const list = await apiActions.listOrcamentos();
        log(`   📋 Orçamentos: ${list.length}`, "info");
        return list;
      });

      // ========== 10. USUÁRIOS ==========
      log("═══ 10. TESTE DE USUÁRIOS ═══", "section");

      await step("Listar usuários", async () => {
        const list = await apiActions.listUsers();
        log(`   📋 Usuários: ${list.map((u) => u.username).join(", ")}`, "info");
        return list;
      });

      await step("Criar usuário de teste", async () => {
        return await apiActions.createUser("teste_user", "1234", "user");
      });

      await step("Excluir usuário de teste", async () => {
        return await apiActions.deleteUser("teste_user");
      });

      // ========== 11. HEALTH CHECK ==========
      log("═══ 11. HEALTH CHECK ═══", "section");

      await step("Verificar saúde do servidor", async () => {
        const res = await api.get("/api/health");
        if (res.status !== "ok") throw new Error("Servidor não está saudável");
        log(`   🏥 Status: ${res.status}`, "info");
        return res;
      });

      // ========== RESUMO ==========
      log("", "info");
      log("═══════════════════════════════════", "section");
      log("🎉 TODOS OS TESTES FINALIZADOS!", "success");
      log("═══════════════════════════════════", "section");
    } catch (err) {
      if (err.message === "ABORTED") {
        log("⏹️ Teste interrompido pelo usuário.", "warning");
      } else {
        log(`💥 Erro fatal: ${err.message}`, "error");
      }
    } finally {
      setRunning(false);
    }
  };

  const handleAbort = () => {
    abortRef.current = true;
  };

  const handleClear = () => {
    setLogs([]);
  };

  return (
    <div className={`test-panel ${running ? "test-panel-running" : ""} ${collapsed ? "test-panel-collapsed" : ""}`}>
      <div className="test-panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {running && <span className="test-pulse-dot" />}
          <h3 style={{ margin: 0, fontSize: 14 }}>Teste Automatizado</h3>
          <button
            className="test-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!running ? (
            <button className="test-run-btn" onClick={runTests} title="Iniciar testes">
              <Play size={14} /> Testar App
            </button>
          ) : (
            <button className="test-stop-btn" onClick={handleAbort} title="Parar testes">
              <Square size={14} /> Parar
            </button>
          )}
          {logs.length > 0 && (
            <button className="test-clear-btn" onClick={handleClear} title="Limpar log">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="test-panel-body" ref={logRef}>
          {logs.length === 0 && !running && (
            <div className="test-empty">
              Clique em <strong>Testar App</strong> para iniciar os testes automatizados.
              <br /><br />
              O sistema irá:<br />
              • Configurar dados da empresa<br />
              • Cadastrar clientes, serviços, veículos, motoristas<br />
              • Preencher e submeter Fatura<br />
              • Preencher e submeter Orçamento<br />
              • Criar agendamentos para Mapa de Serviço<br />
              • Verificar históricos<br />
              • Criar/excluir usuário de teste<br />
              • Verificar saúde do servidor
            </div>
          )}
          {logs.map((entry) => (
            <div key={entry.id} className={`test-log-entry test-log-${entry.type}`}>
              <span className="test-log-time">{entry.time}</span>
              <span className="test-log-msg">{entry.msg}</span>
            </div>
          ))}
          {running && (
            <div className="test-log-entry test-log-running">
              <span className="test-log-time">{new Date().toLocaleTimeString("pt-BR")}</span>
              <span className="test-log-msg">⏳ Executando...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TestData;
