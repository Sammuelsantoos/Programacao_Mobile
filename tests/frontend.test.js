import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoApi, createHttpApi } from '../public/data.js';
process.env.DATABASE_PATH = ':memory:';
const { criarApp } = await import('../src/app.js');

const fixture = () => ({
  pacientes: [{ id: 1, nome: 'Paciente fictício', cpf: '00000000000' }],
  medicamentos: [{ id: 1, nome: 'Medicamento de teste', dosagem: 'Teste', estoque: 5 }, { id: 2, nome: 'Sem estoque', dosagem: 'Teste', estoque: 0 }],
  receitas: [], retiradas: [],
});

test('emissão, retirada parcial e conclusão mantêm saldo, estoque e histórico consistentes', async () => {
  const data = fixture();
  const api = createDemoApi(data, 'medico');
  const pharmacy = createDemoApi(data, 'farmaceutico');
  const emitted = await api.create('receitas', { pacienteId: 1, observacoes: 'Teste', itens: [{ medicamentoId: 1, quantidade: 3, posologia: 'Demonstração' }] });
  assert.match(emitted.codigoRetirada, /^[A-Z2-9]{6}$/);
  let recipe = await api.prescription(emitted.codigoRetirada.toLowerCase());
  assert.equal(recipe.paciente_nome, 'Paciente fictício');
  assert.equal(recipe.itens[0].nome, 'Medicamento de teste');
  const itemId = recipe.itens[0].id;
  const partial = await pharmacy.create('retiradas', { codigoRetirada: emitted.codigoRetirada, farmaceuticoNome: 'Teste', itens: [{ receitaItemId: itemId, quantidade: 1 }] });
  assert.equal(partial.status, 'PARCIAL');
  recipe = await api.prescription(emitted.codigoRetirada);
  assert.equal(recipe.itens[0].quantidade_retirada, 1);
  assert.equal(recipe.itens[0].estoque, 4);
  const complete = await pharmacy.create('retiradas', { codigoRetirada: emitted.codigoRetirada, itens: [{ receitaItemId: itemId, quantidade: 2 }] });
  assert.equal(complete.status, 'RETIRADA');
  assert.equal((await api.list('medicamentos'))[0].estoque, 2);
  assert.equal((await api.list('retiradas')).length, 2);
  await assert.rejects(pharmacy.create('retiradas', { codigoRetirada: emitted.codigoRetirada, itens: [{ receitaItemId: itemId, quantidade: 1 }] }), /disponível/);
});

test('retirada com item sem estoque não modifica nenhum dos itens', async () => {
  const data = fixture();
  const api = createDemoApi(data, 'medico');
  const pharmacy = createDemoApi(data, 'farmaceutico');
  const emitted = await api.create('receitas', { pacienteId: 1, itens: [{ medicamentoId: 1, quantidade: 2 }, { medicamentoId: 2, quantidade: 1 }] });
  const before = await api.prescription(emitted.codigoRetirada);
  await assert.rejects(pharmacy.create('retiradas', { codigoRetirada: emitted.codigoRetirada, itens: before.itens.map(i => ({ receitaItemId: i.id, quantidade: 1 })) }), /estoque insuficiente/);
  assert.deepEqual(await api.prescription(emitted.codigoRetirada), before);
  assert.equal((await api.list('retiradas')).length, 0);
});

test('cancelamento bloqueia novas retiradas e consultas inexistentes têm erro claro', async () => {
  const data = fixture();
  const api = createDemoApi(data, 'medico');
  const pharmacy = createDemoApi(data, 'farmaceutico');
  const emitted = await api.create('receitas', { pacienteId: 1, itens: [{ medicamentoId: 1, quantidade: 1 }] });
  const recipe = await api.prescription(emitted.codigoRetirada);
  await api.cancel(emitted.id);
  assert.equal((await api.prescription(emitted.codigoRetirada)).status, 'CANCELADA');
  await assert.rejects(pharmacy.create('retiradas', { codigoRetirada: emitted.codigoRetirada, itens: [{ receitaItemId: recipe.itens[0].id, quantidade: 1 }] }), /disponível/);
  await assert.rejects(api.prescription('ZZZZZZ'), /Nenhuma receita/);
});

test('cadastros impedem CPF repetido e respostas não alteram a base por referência', async () => {
  const data = fixture();
  const api = createDemoApi(data, 'medico');
  const pharmacy = createDemoApi(data, 'farmaceutico');
  await assert.rejects(api.create('pacientes', { nome: 'Duplicado', cpf: '00000000000' }), /já cadastrado/);
  const result = await api.list('medicamentos'); result[0].estoque = 999;
  assert.equal((await api.list('medicamentos'))[0].estoque, 5);
  const created = await api.create('pacientes', { nome: 'Outro teste', cpf: '11111111111' });
  await api.update('pacientes', created.id, { nome: 'Nome editado' });
  assert.equal((await api.list('pacientes')).find(p => p.id === created.id).nome, 'Nome editado');
});

test('adaptador HTTP envia autenticação e preserva mensagem e status de erro da API', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let captured;
  globalThis.fetch = async (path, options) => { captured = { path, options }; return new Response(JSON.stringify({ erro: 'Token inválido ou expirado' }), { status: 401 }); };
  const api = createHttpApi('token-de-teste');
  await assert.rejects(api.create('pacientes', { nome: 'Teste' }), error => error.status === 401 && error.message === 'Token inválido ou expirado');
  assert.equal(captured.path, '/pacientes');
  assert.equal(captured.options.headers.Authorization, 'Bearer token-de-teste');
  assert.equal(captured.options.method, 'POST');
  assert.deepEqual(JSON.parse(captured.options.body), { nome: 'Teste' });
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(api.list('pacientes'), /conectar ao servidor/);
});

test('Express serve o frontend e mantém as rotas da API protegidas', async t => {
  const server = criarApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const index = await fetch(origin);
  assert.equal(index.status, 200);
  assert.match(index.headers.get('content-type'), /text\/html/);
  assert.match(await index.text(), /IntegraSUS/);
  for (const file of ['styles.css', 'app.js', 'data.js', 'profiles.js', 'icons.js', 'favicon.svg']) assert.equal((await fetch(`${origin}/${file}`)).status, 200, file);
  assert.equal((await fetch(`${origin}/api`)).status, 200);
  for (const resource of ['pacientes', 'medicamentos', 'receitas', 'retiradas']) assert.equal((await fetch(`${origin}/${resource}`)).status, 401, resource);
});
