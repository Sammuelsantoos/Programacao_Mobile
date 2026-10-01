import { handler } from '../utils/handler.js';

export default class ReceitaController {
  #service;
  constructor(receitaService) { this.#service = receitaService; }

  emitir = handler((req, res) => {
    const receita = this.#service.emitir(req.body, req.medico.id);
    res.status(201).json({ id: receita.id, codigoRetirada: receita.codigoRetirada });
  });

  listar = handler((req, res) => res.json(this.#service.listar(req.query).map((r) => r.toJSON())));

  buscarPorId = handler((req, res) => res.json(this.#service.buscarPorId(req.params.id).toJSON()));

  // Rota pública (farmácia) — sem autenticação no original
  buscarPorCodigo = handler((req, res) => res.json(this.#service.buscarPorCodigo(req.params.codigo).toJSON()));

  atualizar = handler((req, res) => { this.#service.atualizar(req.params.id, req.body); res.json({ ok: true }); });

  cancelar = handler((req, res) => {
    const r = this.#service.cancelar(req.params.id);
    res.json({ ok: true, status: r.status });
  });
}