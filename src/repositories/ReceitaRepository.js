import BaseRepository from './BaseRepository.js';
import Receita from '../models/Receita.js';
import ReceitaItem from '../models/ReceitaItem.js';

export default class ReceitaRepository extends BaseRepository {
  constructor() { super('receitas', Receita); }

  codigoExiste(codigo) {
    return !!this.db.prepare('SELECT 1 FROM receitas WHERE codigo_retirada = ?').get(codigo);
  }

  /** Cria receita + itens em transação. */
  criarComItens(receita) {
    const tx = this.db.transaction(() => {
      const info = this.db.prepare(
        'INSERT INTO receitas (medico_id, paciente_id, codigo_retirada, observacoes) VALUES (?, ?, ?, ?)'
      ).run(receita.medicoId, receita.pacienteId, receita.codigoRetirada, receita.observacoes);
      receita.id = info.lastInsertRowid;

      const stmt = this.db.prepare(
        'INSERT INTO receita_itens (receita_id, medicamento_id, quantidade, posologia) VALUES (?, ?, ?, ?)'
      );
      for (const item of receita.itens) {
        const r = stmt.run(receita.id, item.medicamentoId, item.quantidade, item.posologia);
        item.id = r.lastInsertRowid;
        item.receitaId = receita.id;
      }
      return receita;
    });
    return tx();
  }

  #itensDe(receitaId) {
    return this.db.prepare(`
      SELECT ri.*, m.nome, m.dosagem, m.principio_ativo, m.estoque
      FROM receita_itens ri
      JOIN medicamentos m ON m.id = ri.medicamento_id
      WHERE ri.receita_id = ?
    `).all(receitaId).map(ReceitaItem.fromRow);
  }

  #sqlBase() {
    return `
      SELECT r.*, p.nome AS paciente_nome, p.cpf AS paciente_cpf,
             m.nome AS medico_nome, m.crm AS medico_crm
      FROM receitas r
      JOIN pacientes p ON p.id = r.paciente_id
      JOIN medicos  m ON m.id = r.medico_id
    `;
  }

  buscarPorIdComItens(id) {
    const receita = Receita.fromRow(this.db.prepare(`${this.#sqlBase()} WHERE r.id = ?`).get(id));
    if (receita) receita.itens = this.#itensDe(receita.id);
    return receita;
  }

  buscarPorCodigo(codigo) {
    const receita = Receita.fromRow(
      this.db.prepare(`${this.#sqlBase()} WHERE r.codigo_retirada = ?`).get(codigo)
    );
    if (receita) receita.itens = this.#itensDe(receita.id);
    return receita;
  }

  listar({ status, pacienteCpf } = {}) {
    let sql = this.#sqlBase();
    const cond = [];
    const params = [];
    if (status) { cond.push('r.status = ?'); params.push(status); }
    if (pacienteCpf) { cond.push('p.cpf = ?'); params.push(pacienteCpf); }
    if (cond.length) sql += ' WHERE ' + cond.join(' AND ');
    return this.db.prepare(sql).all(...params).map(Receita.fromRow);
  }

  atualizar(id, { observacoes, status }) {
    const info = this.db.prepare(`
      UPDATE receitas SET
        observacoes = COALESCE(?, observacoes),
        status = COALESCE(?, status)
      WHERE id = ?`).run(observacoes ?? null, status ?? null, id);
    return info.changes > 0;
  }

  atualizarStatus(id, status) {
    this.db.prepare('UPDATE receitas SET status = ? WHERE id = ?').run(status, id);
  }

  atualizarItem(item) {
    this.db.prepare('UPDATE receita_itens SET quantidade_retirada = ? WHERE id = ?')
      .run(item.quantidadeRetirada, item.id);
  }
}