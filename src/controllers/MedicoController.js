import { handler } from "../utils/handler.js";

export default class MedicoController {
  #service;
  #auth;
  constructor(medicoService, authService) {
    this.#service = medicoService;
    this.#auth = authService;
  }

  cadastrar = handler((req, res) => {
    const medico = this.#service.cadastrar(req.body);
    res.status(201).json(medico.toJSON());
  });

  login = handler((req, res) => {
    const { email, senha } = req.body;
    const medico = this.#auth.autenticar(email, senha);
    const token = this.#auth.gerarToken(medico);
    res.json({
      token,
      medico: { id: medico.id, nome: medico.nome, crm: medico.crm },
    });
  });

  listar = handler((req, res) =>
    res.json(this.#service.listar().map((m) => m.toJSON())),
  );

  buscarPorId = handler((req, res) =>
    res.json(this.#service.buscarPorId(req.params.id).toJSON()),
  );

  atualizar = handler((req, res) => {
    this.#service.atualizar(req.params.id, req.body);
    res.json({ ok: true });
  });

  remover = handler((req, res) => {
    this.#service.remover(req.params.id);
    res.status(204).send();
  });
}
