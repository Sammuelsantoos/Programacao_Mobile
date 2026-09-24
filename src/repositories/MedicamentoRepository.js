import BaseRepository from './BaseRepository.js';
import Medicamento from '../models/Medicamento.js';

export default class MedicamentoRepository extends BaseRepository {

constructor(){
    super('medicamentos', Medicamento)
}

criar(med) {
    const info = this.db.prepare(
      'INSERT INTO medicamentos (nome, principio_ativo, dosagem, fabricante, estoque) VALUES (?, ?, ?, ?, ?)'
    ).run(med.nome, med.principioAtivo, med.dosagem, med.fabricante, med.estoque)
    med.id = info.lastInsertRowid
    return med
}

atualizar(id, { nome, principio_ativo, dosagem, fabricante, estoque }){
    const info = this.db.prepare(`
      UPDATE medicamentos SET
        nome = COALESCE(?, nome),
        principio_ativo = COALESCE(?, principio_ativo),
        dosagem = COALESCE(?, dosagem),
        fabricante = COALESCE(?, fabricante),
        estoque = COALESCE(?, estoque)
      WHERE id = ?`).run(nome ?? null, principio_ativo ?? null, dosagem ?? null, fabricante ?? null, estoque ?? null, id)
    return info.changes > 0
}

salvarEstoque(medicamento) {
    this.db.prepare('UPDATE medicamentos SET estoque = ? WHERE id = ?')
      .run(medicamento.estoque, medicamento.id)
    }

}