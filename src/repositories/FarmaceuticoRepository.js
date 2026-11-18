import BaseRepository from './BaseRepository.js';
import Farmaceutico from '../models/Farmaceutico.js';

export default class FarmaceuticoRepository extends BaseRepository {
  constructor() { super('farmaceuticos', Farmaceutico); }

  criar(profissional) {
    const info = this.db.prepare('INSERT INTO farmaceuticos (nome, crf, email, senha_hash) VALUES (?, ?, ?, ?)')
      .run(profissional.nome, profissional.crf, profissional.email, profissional.senhaHash);
    profissional.id = info.lastInsertRowid;
    return profissional;
  }

  buscarPorEmail(email) {
    return Farmaceutico.fromRow(this.db.prepare('SELECT * FROM farmaceuticos WHERE lower(email) = lower(?)').get(email));
  }

  atualizar(id, { nome, crf, email }) {
    return this.db.prepare('UPDATE farmaceuticos SET nome = COALESCE(?, nome), crf = COALESCE(?, crf), email = COALESCE(?, email) WHERE id = ?')
      .run(nome ?? null, crf ?? null, email ?? null, id).changes > 0;
  }
}
