import bcrypt from "bcryptjs";
import Medico from "../models/Medico.js";
import {
  BusinessError,
  ConflictError,
  NotFoundError,
} from "../utils/errors.js";

export default class MedicoService {
  #repository;
  constructor(repository) {
    this.#repository = repository;
  }

  cadastrar({ nome, crm, email, senha }) {
    if (!nome || !crm || !email || !senha) {
      throw new BusinessError("Campos obrigatórios: nome, crm, email, senha");
    }
    const senhaHash = bcrypt.hashSync(senha, 10);
    try {
      return this.#repository.criar(
        new Medico({ nome, crm, email, senha_hash: senhaHash }),
      );
    } catch (e) {
      if (e.message.includes("UNIQUE"))
        throw new ConflictError("CRM ou e-mail já cadastrado");
      throw e;
    }
  }

  listar() {
    return this.#repository.listar();
  }

  buscarPorId(id) {
    const m = this.#repository.buscarPorId(id);
    if (!m) throw new NotFoundError("Médico não encontrado");
    return m;
  }

  atualizar(id, dados) {
    try {
      if (!this.#repository.atualizar(id, dados))
        throw new NotFoundError("Médico não encontrado");
    } catch (e) {
      if (e.message.includes("UNIQUE"))
        throw new ConflictError("CRM ou e-mail já cadastrado");
      throw e;
    }
  }

  remover(id) {
    if (!this.#repository.deletar(id))
      throw new NotFoundError("Médico não encontrado");
  }
}
