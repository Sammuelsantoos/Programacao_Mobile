import Paciente from '../models/Paciente.js';
import { BusinessError, ConflictError, NotFoundError } from '../utils/errors.js';

export default class PacienteService {
  #repository;
  constructor(repository) { this.#repository = repository; }

  cadastrar({ nome, cpf, data_nascimento, telefone }) {
    if (!nome || !cpf) throw new BusinessError('nome e cpf são obrigatórios');
    try {
      return this.#repository.criar(new Paciente({
        nome, cpf,
        data_nascimento: data_nascimento ?? null,
        telefone: telefone ?? null,
      }));
    } catch (e) {
      if (e.message.includes('UNIQUE')) throw new ConflictError('CPF já cadastrado');
      throw e;
    }
  }

  listar() { return this.#repository.listar(); }

  buscarPorIdOuCpf(valor) {
    const p = this.#repository.buscarPorIdOuCpf(valor);
    if (!p) throw new NotFoundError('Paciente não encontrado');
    return p;
  }

  atualizar(id, dados) {
    try {
      if (!this.#repository.atualizar(id, dados)) throw new NotFoundError('Paciente não encontrado');
    } catch (e) {
      if (e.message.includes('UNIQUE')) throw new ConflictError('CPF já cadastrado');
      throw e;
    }
  }

  remover(id) {
    if (!this.#repository.deletar(id)) throw new NotFoundError('Paciente não encontrado');
  }
}