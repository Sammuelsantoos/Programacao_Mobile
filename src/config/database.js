import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';

/**
 * Singleton (Pure Fabrication + Protected Variations).
 * Isola toda a aplicação do driver SQLite.
 */
class DatabaseConnection {
  static #instance = null;

  static getInstance() {
    if (!DatabaseConnection.#instance) {
      DatabaseConnection.#instance = new DatabaseConnection();
    }
    return DatabaseConnection.#instance;
  }

  #db;

  constructor() {
    if (DatabaseConnection.#instance) {
      throw new Error('Use DatabaseConnection.getInstance()');
    }
    const dbPath = fileURLToPath(new URL('../../sistema.db', import.meta.url));
    this.#db = new Database(dbPath);
    this.#db.pragma('foreign_keys = ON');
    this.#criarSchema();
  }

  #criarSchema() {
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS medicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        crm TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT NOT NULL UNIQUE,
        data_nascimento TEXT,
        telefone TEXT,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS medicamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        principio_ativo TEXT,
        dosagem TEXT NOT NULL,
        fabricante TEXT,
        estoque INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS receitas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medico_id INTEGER NOT NULL,
        paciente_id INTEGER NOT NULL,
        codigo_retirada TEXT NOT NULL UNIQUE,
        data_emissao TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'PENDENTE',
        observacoes TEXT,
        FOREIGN KEY (medico_id) REFERENCES medicos(id),
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
      );
      CREATE TABLE IF NOT EXISTS receita_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receita_id INTEGER NOT NULL,
        medicamento_id INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        quantidade_retirada INTEGER NOT NULL DEFAULT 0,
        posologia TEXT,
        FOREIGN KEY (receita_id) REFERENCES receitas(id) ON DELETE CASCADE,
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
      );
      CREATE TABLE IF NOT EXISTS retiradas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receita_id INTEGER NOT NULL,
        receita_item_id INTEGER NOT NULL,
        farmaceutico_nome TEXT,
        quantidade INTEGER NOT NULL,
        data_retirada TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (receita_id) REFERENCES receitas(id),
        FOREIGN KEY (receita_item_id) REFERENCES receita_itens(id)
      );
    `);
  }

  get raw() { return this.#db; }
  prepare(sql) { return this.#db.prepare(sql); }
  transaction(fn) { return this.#db.transaction(fn); }
  exec(sql) { return this.#db.exec(sql); }
}

export default DatabaseConnection.getInstance();