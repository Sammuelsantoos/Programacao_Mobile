import { handler } from '../utils/handler.js'

export default class MedicamentoController {

#service

constructor(medicamentoService){
    this.#service = medicamentoService
}

cadastrar = handler((req, res) => res.status(201).json(this.#service.cadastrar(req.body).toJSON()))
listar = handler((req, res) => res.json(this.#service.listar().map((m) => m.toJSON())))
buscarPorId = handler((req, res) => res.json(this.#service.buscarPorId(req.params.id).toJSON()))

atualizar = handler((req, res) => {
    this.#service.atualizar(req.params.id, req.body); res.json({ ok: true })
})

remover = handler((req, res) => { 
    this.#service.remover(req.params.id); res.status(204).send()
})

}