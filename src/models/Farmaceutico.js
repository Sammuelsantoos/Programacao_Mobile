export default class Farmaceutico {
  constructor({ id = null, nome, crf, email, senha_hash = null, criado_em = null }) {
    this.id = id;
    this.nome = nome;
    this.crf = crf;
    this.email = email;
    this.senhaHash = senha_hash;
    this.criadoEm = criado_em;
  }

  static fromRow(row) { return row ? new Farmaceutico(row) : null; }

  toJSON() {
    return { id: this.id, nome: this.nome, crf: this.crf, email: this.email, criado_em: this.criadoEm };
  }
}
