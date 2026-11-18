import Receita from '../models/Receita.js';
import ReceitaItem from '../models/ReceitaItem.js';
import { BusinessError, NotFoundError, ForbiddenError } from '../utils/errors.js';

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
      if (!item.medicamentoId || !Number.isInteger(item.quantidade) || item.quantidade <= 0) {
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

  buscarPorId(id, usuario) {
    const r = this.#receitaRepo.buscarPorIdComItens(id);
    if (!r) throw new NotFoundError('Receita não encontrada');
    if (usuario?.perfil === 'medico' && r.medicoId !== usuario.id) throw new ForbiddenError('Você só pode gerenciar suas próprias receitas');
    return r;
  }

  buscarPorCodigo(codigo) {
    const r = this.#receitaRepo.buscarPorCodigo(codigo.toUpperCase());
    if (!r) throw new NotFoundError('Código não encontrado');
    return r;
  }

  atualizar(id, dados, usuario) {
    const receita = this.buscarPorId(id, usuario);
    if (dados.status !== undefined && dados.status !== receita.status) throw new BusinessError('O status é atualizado pela retirada ou pelo cancelamento da receita');
    if (!this.#receitaRepo.atualizar(id, { observacoes: dados.observacoes })) throw new NotFoundError('Receita não encontrada');
  }

  cancelar(id, usuario) {
    const r = this.buscarPorId(id, usuario);
    r.cancelar(); // regra no domínio
    this.#receitaRepo.atualizarStatus(r.id, r.status);
    return r;
  }
}
