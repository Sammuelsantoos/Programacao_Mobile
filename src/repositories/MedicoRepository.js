import BaseRepository from './BaseRepository.js';
import Medico from '../models/Medico.js';

export default class MedicoRepository extends BaseRepository {
  constructor() {
    super('medicos', Medico);
  }

  criar(medico) {
    const info = this.db.prepare(
      'INSERT INTO medicos (nome, crm, email, senha_hash) VALUES (?, ?, ?, ?)'
    ).run(medico.nome, medico.crm, medico.email, medico.senhaHash);
    medico.id = info.lastInsertRowid;
    return medico;
  }

  buscarPorEmail(email) {
    const row = this.db.prepare('SELECT * FROM medicos WHERE email = ?').get(email);
    return row ? Medico.fromRow(row) : null;
  }

  listar() {
    return this.db.prepare('SELECT id, nome, crm, email, criado_em FROM medicos')
      .all().map((r) => Medico.fromRow(r));
  }

  atualizar(id, { nome, crm, email }) {
    const info = this.db.prepare(`
      UPDATE medicos SET
        nome  = COALESCE(?, nome),
        crm   = COALESCE(?, crm),
        email = COALESCE(?, email)
      WHERE id = ?`).run(nome ?? null, crm ?? null, email ?? null, id);
    return info.changes > 0;
  }
}
