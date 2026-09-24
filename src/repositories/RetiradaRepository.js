import BaseRepository from './BaseRepository.js';
import Retirada from '../models/Retirada.js';

export default class RetiradaRepository extends BaseRepository {
  constructor() { super('retiradas', Retirada); }

  criar(retirada) {
    const info = this.db.prepare(`
      INSERT INTO retiradas (receita_id, receita_item_id, farmaceutico_nome, quantidade)
      VALUES (?, ?, ?, ?)
    `).run(
      retirada.receitaId, retirada.receitaItemId,
      retirada.farmaceuticoNome, retirada.quantidade
    );
    retirada.id = info.lastInsertRowid;
    return retirada;
  }

  listarComDetalhes({ codigoRetirada } = {}) {
    let sql = `
      SELECT rt.*, r.codigo_retirada, p.nome AS paciente_nome,
             m.nome AS medicamento_nome, m.dosagem
      FROM retiradas rt
      JOIN receitas r        ON r.id = rt.receita_id
      JOIN pacientes p       ON p.id = r.paciente_id
      JOIN receita_itens ri  ON ri.id = rt.receita_item_id
      JOIN medicamentos m    ON m.id = ri.medicamento_id
    `;
    const params = [];
    if (codigoRetirada) { sql += ' WHERE r.codigo_retirada = ?'; params.push(codigoRetirada); }
    sql += ' ORDER BY rt.data_retirada DESC';
    return this.db.prepare(sql).all(...params).map(Retirada.fromRow);
  }
}