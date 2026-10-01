import Retirada from '../models/Retirada.js';
import { BusinessError, NotFoundError } from '../utils/errors.js';

export default class RetiradaService {
  #retiradaRepo; #receitaRepo; #medicamentoRepo; #db;

  constructor({ retiradaRepository, receitaRepository, medicamentoRepository, database }) {
    this.#retiradaRepo = retiradaRepository;
    this.#receitaRepo = receitaRepository;
    this.#medicamentoRepo = medicamentoRepository;
    this.#db = database;
  }

  registrar({ codigoRetirada, farmaceuticoNome, itens }) {
    if (!codigoRetirada || !Array.isArray(itens) || itens.length === 0) {
      throw new BusinessError('codigoRetirada e itens[] são obrigatórios');
    }

    const tx = this.#db.transaction(() => {
      const receita = this.#receitaRepo.buscarPorCodigo(codigoRetirada.toUpperCase());
      if (!receita) throw new NotFoundError('Receita não encontrada');
      if (!receita.podeSerRetirada()) throw new BusinessError(`Receita ${receita.status.toLowerCase()}`);

      for (const it of itens) {
        // Information Expert: a própria Receita localiza seus itens;
        // o próprio ReceitaItem decide se pode ser retirado;
        // o próprio Medicamento decide se tem estoque.
        const item = receita.encontrarItem(it.receitaItemId);
        if (!item.podeRetirar(it.quantidade)) {
          throw new BusinessError(`Item ${it.receitaItemId}: restam apenas ${item.quantidadeRestante} unidades`);
        }

        const medicamento = this.#medicamentoRepo.buscarPorId(item.medicamentoId);
        if (!medicamento.temEstoque(it.quantidade)) {
          throw new BusinessError(`Estoque insuficiente para ${medicamento.nome} (disponível: ${medicamento.estoque})`);
        }

        item.registrarRetirada(it.quantidade);
        medicamento.debitarEstoque(it.quantidade);

        this.#medicamentoRepo.salvarEstoque(medicamento);
        this.#receitaRepo.atualizarItem(item);
        this.#retiradaRepo.criar(new Retirada({
          receita_id: receita.id,
          receita_item_id: item.id,
          farmaceutico_nome: farmaceuticoNome ?? null,
          quantidade: it.quantidade,
        }));
      }

      const novoStatus = receita.atualizarStatus(); // Receita calcula seu status
      this.#receitaRepo.atualizarStatus(receita.id, novoStatus);
      return novoStatus;
    });

    return tx();
  }

  listar(filtros) { return this.#retiradaRepo.listarComDetalhes(filtros); }

  buscarPorId(id) {
    const r = this.#retiradaRepo.buscarPorId(id);
    if (!r) throw new NotFoundError('Retirada não encontrada');
    return r;
  }
}