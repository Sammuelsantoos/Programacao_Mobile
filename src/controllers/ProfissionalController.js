import { handler } from '../utils/handler.js';

export default class ProfissionalController {
  constructor(service, authService, perfil) {
    this.service = service;
    this.authService = authService;
    this.perfil = perfil;
  }

  cadastrar = handler((req, res) => res.status(201).json({ ...this.service.cadastrar(req.body).toJSON(), perfil: this.perfil }));

  login = handler((req, res) => {
    const profissional = this.authService.autenticar(req.body.email, req.body.senha, this.perfil);
    const usuario = { ...profissional.toJSON(), perfil: this.perfil };
    res.json({ token: this.authService.gerarToken(profissional, this.perfil), usuario,
      // Preserva o formato de login médico anterior para clientes existentes.
      [this.perfil]: usuario });
  });

  listar = handler((_req, res) => res.json(this.service.listar().map(p => p.toJSON())));
  buscarPorId = handler((req, res) => res.json(this.service.buscarPorId(req.params.id).toJSON()));
  atualizar = handler((req, res) => { this.service.atualizar(req.params.id, req.body); res.json({ ok: true }); });
  remover = handler((req, res) => { this.service.remover(req.params.id); res.status(204).send(); });
}
