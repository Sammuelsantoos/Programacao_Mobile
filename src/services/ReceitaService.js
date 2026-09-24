import Receita from '../models/Receita.js';
import ReceitaItem from '../models/ReceitaItem.js';
import { BusinessError, NotFoundError } from '../utils/errors.js';

export default class ReceitaService {
  #receitaRepo; #pacienteRepo; #medicamentoRepo;

  constructor({ receitaRepository, pacienteRepository, medicamentoRepository }) {
    this.#receitaRepo = receitaRepository;
    this.#pacienteRepo = pacienteRepository;
    this.#medicamentoRepo = medicamentoRepository;
  }

  #gerarCodigoUnico() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo;
    do {
      codigo = Array.from({ length: 6 },
        () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.#receitaRepo.codigoExiste(codigo));
    return codigo;
  }

  emitir({ pacienteId, observacoes, itens }, medicoId) {
    if (!pacienteId || !Array.isArray(itens) || itens.length === 0) {
      throw new BusinessError('pacienteId e itens[] são obrigatórios');
    }
    if (!this.#pacienteRepo.buscarPorId(pacienteId)) {
      throw new NotFoundError('Paciente não encontrado');
    }

    // Validação em bloco (Information Expert: cada Medicamento sabe existir)
    for (const item of itens) {
      if (!item.medicamentoId || !item.quantidade || item.quantidade <= 0) {
        throw new BusinessError('Cada item precisa de medicamentoId e quantidade > 0');
      }
      if (!this.#medicamentoRepo.buscarPorId(item.medicamentoId)) {
        throw new NotFoundError(`Medicamento ${item.medicamentoId} não existe`);
      }
    }

    // Creator: ReceitaService cria Receita; Receita agrega ReceitaItem
    const receita = new Receita({
      medico_id: medicoId,
      paciente_id: pacienteId,
      codigo_retirada: this.#gerarCodigoUnico(),
      observacoes: observacoes ?? null,
      itens: itens.map((i) => new ReceitaItem({
        medicamento_id: i.medicamentoId,
        quantidade: i.quantidade,
        posologia: i.posologia ?? null,
      })),
    });

    return this.#receitaRepo.criarComItens(receita);
  }

  listar(filtros) { return this.#receitaRepo.listar(filtros); }

  buscarPorId(id) {
    const r = this.#receitaRepo.buscarPorIdComItens(id);
    if (!r) throw new NotFoundError('Receita não encontrada');
    return r;
  }

  buscarPorCodigo(codigo) {
    const r = this.#receitaRepo.buscarPorCodigo(codigo.toUpperCase());
    if (!r) throw new NotFoundError('Código não encontrado');
    return r;
  }

  atualizar(id, dados) {
    if (!this.#receitaRepo.atualizar(id, dados)) throw new NotFoundError('Receita não encontrada');
  }

  cancelar(id) {
    const r = this.#receitaRepo.buscarPorId(id);
    if (!r) throw new NotFoundError('Receita não encontrada');
    r.cancelar(); // regra no domínio
    this.#receitaRepo.atualizarStatus(r.id, r.status);
    return r;
  }
}