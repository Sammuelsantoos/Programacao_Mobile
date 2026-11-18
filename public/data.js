import { profiles } from './profiles.js';

const DEMO_KEY = 'integrasus-demo-v1';
export const SESSION_KEY = 'integrasus-session';
export const demoUsers = {
  medico: { id: 1, nome: 'Dra. Sarah Jenkins', crm: '184920/SP', perfil: 'medico' },
  farmaceutico: { id: 1, nome: 'Camila Rios', crf: '45109/SP', perfil: 'farmaceutico' },
};
export const demoUser = demoUsers.medico;

function seed() {
  const date = (days, hour = 10) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour, 30, 0, 0);
    return d.toISOString();
  };
  const pacientes = [
    { id: 1, nome: 'Carlos Alberto Mendes', cpf: '34256789018', data_nascimento: '1985-05-12', telefone: '11987654321' },
    { id: 2, nome: 'Mariana Duarte Souza', cpf: '89123456704', data_nascimento: '1992-08-21', telefone: '11976543210' },
    { id: 3, nome: 'Lucas Gabriel Martins', cpf: '11234567890', data_nascimento: '2001-02-14', telefone: '11965432109' },
    { id: 4, nome: 'Juliana Costa Ferreira', cpf: '54912345672', data_nascimento: '1978-11-30', telefone: '11954321098' },
    { id: 5, nome: 'Pedro Henrique Lima', cpf: '23745678912', data_nascimento: '1965-03-08', telefone: '11943210987' },
    { id: 6, nome: 'Ana Beatriz Oliveira', cpf: '67345678923', data_nascimento: '1997-09-17', telefone: '11932109876' },
  ];
  const medicamentos = [
    { id: 1, nome: 'Amoxicilina + Clavulanato', principio_ativo: 'Amoxicilina tri-hidratada', dosagem: '875 mg / 125 mg', fabricante: 'EMS Genéricos', estoque: 48 },
    { id: 2, nome: 'Dipirona Monoidratada', principio_ativo: 'Dipirona sódica', dosagem: '500 mg/mL', fabricante: 'Prati-Donaduzzi', estoque: 120 },
    { id: 3, nome: 'Losartana Potássica', principio_ativo: 'Losartana potássica', dosagem: '50 mg', fabricante: 'Medley', estoque: 8 },
    { id: 4, nome: 'Insulina NPH', principio_ativo: 'Insulina humana', dosagem: '100 UI/mL', fabricante: 'Novo Nordisk', estoque: 2 },
    { id: 5, nome: 'Omeprazol', principio_ativo: 'Omeprazol', dosagem: '20 mg', fabricante: 'Eurofarma', estoque: 64 },
    { id: 6, nome: 'Metformina', principio_ativo: 'Cloridrato de metformina', dosagem: '850 mg', fabricante: 'Germed', estoque: 0 },
  ];
  const specifications = [
    [1, 'X7K2M9', 'PENDENTE', 0, [1, 2]], [2, 'B4W9T1', 'PARCIAL', 0, [3, 5]],
    [3, 'M8P2L5', 'RETIRADA', 1, [2]], [4, 'K3N7V8', 'CANCELADA', 1, [1]],
    [5, 'A6H9D2', 'RETIRADA', 2, [3]], [6, 'F2R8C5', 'PENDENTE', 2, [5, 2]],
    [1, 'P9J3S7', 'RETIRADA', 3, [2]], [2, 'T5G6Q4', 'RETIRADA', 4, [5]],
    [5, 'R6V2N8', 'RETIRADA', 5, [3]], [6, 'H3D8W2', 'RETIRADA', 6, [2]],
  ];
  let itemId = 0;
  const receitas = specifications.map(([paciente_id, codigo_retirada, status, days, medicines], index) => ({
    id: index + 1, medico_id: 1, paciente_id, codigo_retirada, status, data_emissao: date(days, 10 - index % 3),
    medico_nome: demoUser.nome, medico_crm: demoUser.crm,
    observacoes: null,
    itens: medicines.map((medicamento_id, i) => ({
      id: ++itemId, receita_id: index + 1, medicamento_id, quantidade: 2,
      quantidade_retirada: status === 'RETIRADA' ? 2 : status === 'PARCIAL' && i === 0 ? 2 : 0,
      posologia: 'Exemplo de prescrição. Dados fictícios para demonstração da interface.',
    })),
  }));
  const retiradas = receitas.flatMap(r => r.itens.filter(i => i.quantidade_retirada).map(i => ({
    id: i.id, receita_id: r.id, receita_item_id: i.id, farmaceutico_nome: 'Camila Rios',
    quantidade: i.quantidade_retirada, data_retirada: r.data_emissao,
    codigo_retirada: r.codigo_retirada, paciente_nome: pacientes.find(p => p.id === r.paciente_id).nome,
    medicamento_nome: medicamentos.find(m => m.id === i.medicamento_id).nome,
  })));
  return { pacientes, medicamentos, receitas, retiradas };
}

function loadDemo() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DEMO_KEY));
    if (saved && ['pacientes', 'medicamentos', 'receitas', 'retiradas'].every(key => Array.isArray(saved[key]))) return saved;
  } catch { /* A new session also recovers an invalid demo cache. */ }
  return seed();
}

export function createDemoApi(initialData, perfil = 'medico') {
  const db = initialData || loadDemo();
  const requireRole = expected => {
    if (perfil !== expected) { const error = new Error('Seu perfil não tem permissão para esta operação.'); error.status = 403; throw error; }
  };
  const save = () => { try { sessionStorage.setItem(DEMO_KEY, JSON.stringify(db)); } catch { /* Demo remains usable without browser storage. */ } };
  const nextId = list => Math.max(0, ...list.map(row => row.id)) + 1;
  const enrich = r => {
    const p = db.pacientes.find(p => p.id === r.paciente_id);
    return { ...r, paciente_nome: p?.nome, paciente_cpf: p?.cpf, itens: r.itens.map(i => ({ ...i, ...Object.fromEntries(Object.entries(db.medicamentos.find(m => m.id === i.medicamento_id) || {}).filter(([key]) => ['nome', 'dosagem', 'estoque', 'principio_ativo'].includes(key))) })) };
  };
  return {
    async list(resource) {
      if (!profiles[perfil]?.resources.includes(resource)) { const error = new Error('Acesso não permitido.'); error.status = 403; throw error; }
      const recipes = perfil === 'medico' ? db.receitas.filter(r => r.medico_id === demoUser.id) : db.receitas;
      const records = resource === 'receitas' ? recipes.map(enrich) : resource === 'retiradas' && perfil === 'medico' ? db.retiradas.filter(r => recipes.some(recipe => recipe.id === r.receita_id)) : db[resource];
      return structuredClone(records);
    },
    async prescription(code) {
      const recipe = db.receitas.find(r => r.codigo_retirada === code.toUpperCase());
      if (!recipe) throw new Error('Nenhuma receita encontrada. Confira o código e tente novamente.');
      return structuredClone(enrich(recipe));
    },
    async create(resource, body) {
      if (resource === 'receitas') {
        requireRole('medico');
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code;
        do { code = Array.from(crypto.getRandomValues(new Uint8Array(6)), n => chars[n % chars.length]).join(''); }
        while (db.receitas.some(r => r.codigo_retirada === code));
        const id = nextId(db.receitas);
        let itemId = Math.max(0, ...db.receitas.flatMap(r => r.itens.map(i => i.id)));
        db.receitas.unshift({ id, paciente_id: body.pacienteId, medico_id: 1, medico_nome: demoUser.nome, medico_crm: demoUser.crm,
          codigo_retirada: code, data_emissao: new Date().toISOString(), status: 'PENDENTE', observacoes: body.observacoes,
          itens: body.itens.map(i => ({ id: ++itemId, receita_id: id, medicamento_id: i.medicamentoId, quantidade: i.quantidade, quantidade_retirada: 0, posologia: i.posologia })) });
        save(); return { id, codigoRetirada: code };
      }
      if (resource === 'retiradas') {
        requireRole('farmaceutico');
        const r = db.receitas.find(r => r.codigo_retirada === body.codigoRetirada);
        if (!r || !['PENDENTE', 'PARCIAL'].includes(r.status)) throw new Error('Esta receita não está disponível para retirada.');
        const seen = new Set();
        for (const i of body.itens) {
          const item = r.itens.find(item => item.id === i.receitaItemId);
          const med = db.medicamentos.find(m => m.id === item?.medicamento_id);
          if (!item || seen.has(item.id) || !Number.isInteger(i.quantidade) || i.quantidade <= 0 || i.quantidade > item.quantidade - item.quantidade_retirada || i.quantidade > med.estoque) throw new Error('Quantidade inválida ou estoque insuficiente.');
          seen.add(item.id);
        }
        for (const i of body.itens) {
          const item = r.itens.find(item => item.id === i.receitaItemId);
          const med = db.medicamentos.find(m => m.id === item.medicamento_id);
          item.quantidade_retirada += i.quantidade; med.estoque -= i.quantidade;
          db.retiradas.unshift({ id: nextId(db.retiradas), receita_id: r.id, receita_item_id: item.id, farmaceutico_nome: demoUsers.farmaceutico.nome, farmaceutico_id: demoUsers.farmaceutico.id, quantidade: i.quantidade,
            data_retirada: new Date().toISOString(), codigo_retirada: r.codigo_retirada, paciente_nome: enrich(r).paciente_nome, medicamento_nome: med.nome, dosagem: med.dosagem });
        }
        r.status = r.itens.every(i => i.quantidade === i.quantidade_retirada) ? 'RETIRADA' : 'PARCIAL';
        save(); return { ok: true, status: r.status };
      }
      requireRole(resource === 'pacientes' ? 'medico' : 'farmaceutico');
      if (resource === 'pacientes' && db.pacientes.some(p => p.cpf === body.cpf)) throw new Error('CPF já cadastrado.');
      const record = { id: nextId(db[resource]), ...body, criado_em: new Date().toISOString() };
      db[resource].unshift(record); save(); return structuredClone(record);
    },
    async update(resource, id, body) {
      requireRole(resource === 'pacientes' ? 'medico' : 'farmaceutico');
      const item = db[resource].find(row => row.id === Number(id));
      if (!item) throw new Error('Registro não encontrado.');
      if (resource === 'pacientes' && db.pacientes.some(p => p.id !== item.id && p.cpf === body.cpf)) throw new Error('CPF já cadastrado.');
      Object.assign(item, body); save(); return { ok: true };
    },
    async cancel(id) {
      requireRole('medico');
      const r = db.receitas.find(r => r.id === Number(id) && r.medico_id === demoUser.id);
      if (!r) throw new Error('Receita não encontrada.');
      r.status = 'CANCELADA'; save(); return { ok: true };
    },
  };
}

export function createHttpApi(token) {
  async function request(path, method = 'GET', body) {
    let response;
    try {
      response = await fetch(path, { method, headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) }, ...(body && { body: JSON.stringify(body) }) });
    } catch { throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.erro || 'Não foi possível concluir a operação.');
      error.status = response.status; throw error;
    }
    return data;
  }
  return {
    list: resource => request(`/${resource}`),
    prescription: code => request(`/receitas/codigo/${encodeURIComponent(code)}`),
    create: (resource, body) => request(`/${resource}`, 'POST', body),
    update: (resource, id, body) => request(`/${resource}/${id}`, 'PUT', body),
    cancel: id => request(`/receitas/${id}`, 'DELETE'),
    login: (body, perfil = 'medico') => request(`/${perfil === 'farmaceutico' ? 'farmaceuticos' : 'medicos'}/login`, 'POST', body),
    register: (body, perfil = 'medico') => request(`/${perfil === 'farmaceutico' ? 'farmaceuticos' : 'medicos'}`, 'POST', body),
  };
}
