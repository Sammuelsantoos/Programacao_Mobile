import { handler } from '../utils/handler.js';

export default class ReceitaController {
  #service;
  constructor(receitaService) { this.#service = receitaService; }

  emitir = handler((req, res) => {
    const receita = this.#service.emitir(req.body, req.medico.id);
    res.status(201).json({ id: receita.id, codigoRetirada: receita.codigoRetirada });
  });

  listar = handler((req, res) => res.json(this.#service.listar({ ...req.query, medicoId: req.usuario.perfil === 'medico' ? req.usuario.id : undefined }).map((r) => r.toJSON())));

  buscarPorId = handler((req, res) => res.json(this.#service.buscarPorId(req.params.id, req.usuario).toJSON()));

  // Rota pública (farmácia) — sem autenticação no original
  buscarPorCodigo = handler((req, res) => res.json(this.#service.buscarPorCodigo(req.params.codigo).toJSON()));

  atualizar = handler((req, res) => { this.#service.atualizar(req.params.id, req.body, req.usuario); res.json({ ok: true }); });

  cancelar = handler((req, res) => {
    const r = this.#service.cancelar(req.params.id, req.usuario);
    res.json({ ok: true, status: r.status });
  });
}
