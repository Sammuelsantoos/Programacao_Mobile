import bcrypt from 'bcryptjs';
import { BusinessError, ConflictError, NotFoundError } from '../utils/errors.js';

// Validações compartilhadas pelos dois cadastros profissionais.
export default class ProfissionalService {
  constructor(repository, Model, registro) {
    this.repository = repository;
    this.Model = Model;
    this.registro = registro;
  }

  validar(dados, cadastro = false) {
    const result = {};
    const limites = { nome: [3, 150], [this.registro]: [2, 30], email: [3, 150] };
    for (const [campo, [min, max]] of Object.entries(limites)) {
      if (dados[campo] === undefined && !cadastro) continue;
      if (typeof dados[campo] !== 'string' || dados[campo].trim().length < min || dados[campo].trim().length > max) {
        throw new BusinessError(`Informe ${campo === this.registro ? campo.toUpperCase() : campo} válido (${min} a ${max} caracteres)`);
      }
      result[campo] = dados[campo].trim();
    }
    if (result.email) {
      result.email = result.email.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new BusinessError('Informe um e-mail válido');
    }
    if (result[this.registro]) result[this.registro] = result[this.registro].toUpperCase();
    if (cadastro && (typeof dados.senha !== 'string' || dados.senha.length < 6 || dados.senha.length > 128)) {
      throw new BusinessError('A senha deve ter entre 6 e 128 caracteres');
    }
    return result;
  }

  cadastrar(dados = {}) {
    const normalized = this.validar(dados, true);
    if (this.repository.buscarPorEmail(normalized.email)) throw new ConflictError('E-mail já cadastrado neste perfil');
    try {
      return this.repository.criar(new this.Model({ ...normalized, senha_hash: bcrypt.hashSync(dados.senha, 10) }));
    } catch (error) {
      if (error.code?.startsWith('SQLITE_CONSTRAINT_UNIQUE')) throw new ConflictError(`${this.registro.toUpperCase()} ou e-mail já cadastrado`);
      throw error;
    }
  }

  listar() { return this.repository.listar(); }

  buscarPorId(id) {
    const profissional = this.repository.buscarPorId(id);
    if (!profissional) throw new NotFoundError('Profissional não encontrado');
    return profissional;
  }

  atualizar(id, dados = {}) {
    const normalized = this.validar(dados);
    const existing = normalized.email && this.repository.buscarPorEmail(normalized.email);
    if (existing && existing.id !== Number(id)) throw new ConflictError('E-mail já cadastrado neste perfil');
    try {
      if (!this.repository.atualizar(id, normalized)) throw new NotFoundError('Profissional não encontrado');
    } catch (error) {
      if (error.code?.startsWith('SQLITE_CONSTRAINT_UNIQUE')) throw new ConflictError(`${this.registro.toUpperCase()} ou e-mail já cadastrado`);
      throw error;
    }
  }

  remover(id) {
    if (!this.repository.deletar(id)) throw new NotFoundError('Profissional não encontrado');
  }
}
