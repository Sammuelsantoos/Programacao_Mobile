import BaseRepository from './BaseRepository.js';
import Paciente from '../models/Paciente.js';

export default class PacienteRepository extends BaseRepository {
  constructor() { super('pacientes', Paciente); }

  criar(paciente) {
    const info = this.db.prepare(
      'INSERT INTO pacientes (nome, cpf, data_nascimento, telefone) VALUES (?, ?, ?, ?)'
    ).run(paciente.nome, paciente.cpf, paciente.dataNascimento, paciente.telefone);
    paciente.id = info.lastInsertRowid;
    return paciente;
  }

  buscarPorIdOuCpf(valor) {
    return Paciente.fromRow(
      this.db.prepare('SELECT * FROM pacientes WHERE id = ? OR cpf = ?').get(valor, valor)
    );
  }

  atualizar(id, { nome, cpf, data_nascimento, telefone }) {
    const info = this.db.prepare(`
      UPDATE pacientes SET
        nome = COALESCE(?, nome),
        cpf = COALESCE(?, cpf),
        data_nascimento = COALESCE(?, data_nascimento),
        telefone = COALESCE(?, telefone)
      WHERE id = ?`).run(nome ?? null, cpf ?? null, data_nascimento ?? null, telefone ?? null, id);
    return info.changes > 0;
  }
}