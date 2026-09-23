import db from '../config/Database.js';

/**
 * Pure Fabrication: não existe no domínio — criado para separar persistência.
 * Indirection: intermedeia modelo × driver SQL.
 */
export default class BaseRepository {
  constructor(tabela, ModelClass) {
    this.db = db;
    this.tabela = tabela;
    this.Model = ModelClass;
  }

  buscarPorId(id) {
    const row = this.db.prepare(`SELECT * FROM ${this.tabela} WHERE id = ?`).get(id);
    return row ? this.Model.fromRow(row) : null;
  }

  listar() {
    return this.db.prepare(`SELECT * FROM ${this.tabela}`).all().map(this.Model.fromRow);
  }

  deletar(id) {
    return this.db.prepare(`DELETE FROM ${this.tabela} WHERE id = ?`).run(id).changes > 0;
  }
}