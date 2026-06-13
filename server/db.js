import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        documento TEXT DEFAULT '',
        email TEXT DEFAULT '',
        endereco TEXT DEFAULT '',
        responsavel_nome TEXT DEFAULT '',
        responsavel_telefone TEXT DEFAULT '',
        created_at TEXT DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        produto TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        valor TEXT DEFAULT '',
        created_at TEXT DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS history (
        id SERIAL PRIMARY KEY,
        numero TEXT DEFAULT '',
        data_emissao TEXT DEFAULT '',
        cliente TEXT DEFAULT '',
        valor REAL DEFAULT 0,
        full_data TEXT DEFAULT '{}',
        created_at TEXT DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        data TEXT NOT NULL,
        content_type TEXT DEFAULT 'image/png',
        created_at TEXT DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        empresa TEXT DEFAULT '{}',
        pagamento TEXT DEFAULT '{}',
        tema TEXT DEFAULT 'white'
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        modelo TEXT NOT NULL,
        placa TEXT DEFAULT '',
        cor TEXT DEFAULT '',
        marca TEXT DEFAULT '',
        created_at TEXT DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS service_orders (
        id SERIAL PRIMARY KEY,
        numero TEXT DEFAULT '',
        data_emissao TEXT DEFAULT '',
        hora TEXT DEFAULT '',
        servico TEXT DEFAULT '',
        nome_guia TEXT DEFAULT '',
        nome_pax TEXT DEFAULT '',
        pax TEXT DEFAULT '',
        file_evento TEXT DEFAULT '',
        cliente TEXT DEFAULT '',
        observacao TEXT DEFAULT '',
        veiculo TEXT DEFAULT '',
        placa TEXT DEFAULT '',
        motorista TEXT DEFAULT '',
        valor REAL DEFAULT 0,
        full_data TEXT DEFAULT '{}',
        created_at TEXT DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS mapas (
        id SERIAL PRIMARY KEY,
        entries TEXT DEFAULT '[]',
        full_data TEXT DEFAULT '{}',
        created_at TEXT DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orcamentos (
        id SERIAL PRIMARY KEY,
        numero TEXT DEFAULT '',
        data_emissao TEXT DEFAULT '',
        validade TEXT DEFAULT '',
        cliente TEXT DEFAULT '',
        valor REAL DEFAULT 0,
        full_data TEXT DEFAULT '{}',
        created_at TEXT DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        contato TEXT DEFAULT '',
        created_at TEXT DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS agenda_servicos (
        id SERIAL PRIMARY KEY,
        fornecedor TEXT DEFAULT '',
        numero TEXT DEFAULT '',
        data TEXT DEFAULT '',
        hora TEXT DEFAULT '',
        voo TEXT DEFAULT '',
        servico TEXT DEFAULT '',
        nome_guia TEXT DEFAULT '',
        tel_guia TEXT DEFAULT '',
        nome_pax TEXT DEFAULT '',
        pax TEXT DEFAULT '',
        file_evento TEXT DEFAULT '',
        cliente_nome TEXT DEFAULT '',
        cliente_documento TEXT DEFAULT '',
        cliente_email TEXT DEFAULT '',
        cliente_endereco TEXT DEFAULT '',
        observacao TEXT DEFAULT '',
        veiculo TEXT DEFAULT '',
        placa TEXT DEFAULT '',
        motorista TEXT DEFAULT '',
        contato_motorista TEXT DEFAULT '',
        valor_pagar TEXT DEFAULT '',
        valor_receber TEXT DEFAULT '',
        lucro NUMERIC DEFAULT 0,
        concluido BOOLEAN DEFAULT FALSE,
        created_at TEXT DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE agenda_servicos ADD COLUMN IF NOT EXISTS valor_pagar TEXT DEFAULT '';
      ALTER TABLE agenda_servicos ADD COLUMN IF NOT EXISTS valor_receber TEXT DEFAULT '';
      ALTER TABLE agenda_servicos ADD COLUMN IF NOT EXISTS lucro NUMERIC DEFAULT 0;
    `);

    const tables = [
      'users', 'clients', 'services', 'history', 'images',
      'settings', 'vehicles', 'service_orders', 'mapas',
      'drivers', 'agenda_servicos', 'orcamentos'
    ];
    for (const table of tables) {
      await client.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1));
      `);
    }

    console.log("Banco de dados inicializado com sucesso.");
  } finally {
    client.release();
  }
}

export { initDB };
export default pool;
