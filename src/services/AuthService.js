import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errors.js";

export default class AuthService {
  #secret;
  #repositories;

  constructor(
    medicoRepository,
    farmaceuticoRepository,
    secret = process.env.JWT_SECRET || "troque-este-segredo-em-producao",
  ) {
    this.#repositories = { medico: medicoRepository, farmaceutico: farmaceuticoRepository };
    this.#secret = secret;
  }

  autenticar(email, senha, perfil = 'medico') {
    const repository = this.#repositories[perfil];
    if (!repository || typeof email !== 'string' || typeof senha !== 'string' || senha.length > 128) {
      throw new UnauthorizedError('Credenciais inválidas');
    }
    const profissional = repository.buscarPorEmail(email.trim().toLowerCase());
    if (!profissional || !bcrypt.compareSync(senha, profissional.senhaHash)) {
      throw new UnauthorizedError("Credenciais inválidas");
    }
    return profissional;
  }

  gerarToken(profissional, perfil = 'medico') {
    if (!this.#repositories[perfil]) throw new UnauthorizedError('Perfil inválido');
    return jwt.sign({ id: profissional.id, nome: profissional.nome, perfil }, this.#secret, {
      expiresIn: "8h",
    });
  }

  verificarToken(token) {
    const claims = jwt.verify(token, this.#secret, { algorithms: ['HS256'] });
    const repository = this.#repositories[claims.perfil];
    if (!repository || !Number.isInteger(claims.id)) throw new UnauthorizedError('Token inválido ou expirado');
    const profissional = repository.buscarPorId(claims.id);
    if (!profissional) throw new UnauthorizedError('Conta não encontrada');
    return { ...profissional.toJSON(), perfil: claims.perfil };
  }
}
