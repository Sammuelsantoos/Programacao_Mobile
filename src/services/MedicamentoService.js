import Medicamento from '../models/Medicamento.js'
import { BusinessError, NotFoundError } from '../utils/errors.js'

export default class MedicamentoService {

#repository

constructor(repository){
    this.#repository = repository 
}

cadastrar({ nome, principio_ativo, dosagem, fabricante, estoque }){
    if (!nome || !dosagem) {
        throw new BusinessError('nome e dosagem são obrigatórios')
    } 

    return this.#repository.criar(new Medicamento({
      nome, dosagem,
      principio_ativo: principio_ativo ?? null,
      fabricante: fabricante ?? null,
      estoque: estoque ?? 0,
    }))
}

listar(){ 
    return this.#repository.listar()
}

buscarPorId(id){
    const m = this.#repository.buscarPorId(id)
    if (!m) {
        throw new NotFoundError('Medicamento não encontrado')
    }
    return m
}

atualizar(id, dados){
    if (!this.#repository.atualizar(id, dados)){
        throw new NotFoundError('Medicamento não encontrado')
    }
}

remover(id){
    if (!this.#repository.deletar(id)){
        throw new NotFoundError('Medicamento não encontrado')
    }
}

}