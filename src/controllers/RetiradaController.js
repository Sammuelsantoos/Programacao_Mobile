import { handler } from '../utils/handler.js';

export default class RetiradaController {
  #service;
  constructor(retiradaService) { this.#service = retiradaService; }

  registrar = handler((req, res) => {
    const status = this.#service.registrar({ ...req.body, farmaceuticoNome: req.usuario.nome, farmaceuticoId: req.usuario.id });
    res.status(201).json({ ok: true, status });
  });

  listar = handler((req, res) => res.json(this.#service.listar({ ...req.query, medicoId: req.usuario.perfil === 'medico' ? req.usuario.id : undefined }).map((r) => r.toJSON())));

  buscarPorId = handler((req, res) => res.json(this.#service.buscarPorId(req.params.id, req.usuario).toJSON()));
}
