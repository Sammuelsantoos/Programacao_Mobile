import { handler } from '../utils/handler.js';

export default class RetiradaController {
  #service;
  constructor(retiradaService) { this.#service = retiradaService; }

  registrar = handler((req, res) => {
    const status = this.#service.registrar(req.body);
    res.status(201).json({ ok: true, status });
  });

  listar = handler((req, res) => res.json(this.#service.listar(req.query).map((r) => r.toJSON())));

  buscarPorId = handler((req, res) => res.json(this.#service.buscarPorId(req.params.id).toJSON()));
}