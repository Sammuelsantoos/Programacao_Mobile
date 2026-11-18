import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { profiles, canAccess } from '../public/profiles.js';
import { createDemoApi, createHttpApi } from '../public/data.js';

process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'segredo-isolado-dos-testes-de-perfil';
const { criarApp } = await import('../src/app.js');
const { default: db } = await import('../src/config/database.js');
let server, origin, doctor, otherDoctor, pharmacist;
const password = 'senha-ficticia-medico';
const pharmacyPassword = 'senha-ficticia-farmacia';

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(origin + path, { method, headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { 'Content-Type': 'application/json' }) }, ...(body && { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json().catch(() => null) };
}

before(async () => {
  server = criarApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await request('/medicos', { method: 'POST', body: { nome: 'Médico de teste', crm: '100/SP', email: 'MESMO@EXAMPLE.INVALID', senha: password, perfil: 'farmaceutico' } })).status, 201);
  assert.equal((await request('/medicos', { method: 'POST', body: { nome: 'Outro médico', crm: '101/SP', email: 'outro@example.invalid', senha: password } })).status, 201);
  assert.equal((await request('/farmaceuticos', { method: 'POST', body: { nome: 'Farmacêutico de teste', crf: '200/SP', email: 'mesmo@example.invalid', senha: pharmacyPassword, perfil: 'medico' } })).status, 201);
  doctor = (await request('/medicos/login', { method: 'POST', body: { email: 'mesmo@example.invalid', senha: password } })).body;
  otherDoctor = (await request('/medicos/login', { method: 'POST', body: { email: 'outro@example.invalid', senha: password } })).body;
  pharmacist = (await request('/farmaceuticos/login', { method: 'POST', body: { email: 'mesmo@example.invalid', senha: pharmacyPassword } })).body;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); });

test('cadastros separados normalizam e-mail, usam CRM/CRF, protegem senha e fixam perfil no servidor', () => {
  assert.equal(doctor.usuario.perfil, 'medico');
  assert.equal(pharmacist.usuario.perfil, 'farmaceutico');
  assert.equal(doctor.usuario.crm, '100/SP');
  assert.equal(pharmacist.usuario.crf, '200/SP');
  assert.equal(doctor.usuario.email, 'mesmo@example.invalid');
  assert.equal(doctor.usuario.senha_hash, undefined);
  assert.equal(pharmacist.usuario.senhaHash, undefined);
  assert.equal(doctor.usuario.id, pharmacist.usuario.id, 'IDs coincidentes entre tabelas não confundem os perfis');
  for (const [table, plaintext] of [['medicos', password], ['farmaceuticos', pharmacyPassword]]) {
    const stored = db.prepare(`SELECT senha_hash FROM ${table} WHERE id = 1`).get().senha_hash;
    assert.notEqual(stored, plaintext);
    assert.equal(bcrypt.compareSync(plaintext, stored), true);
  }
  assert.equal(jwt.decode(doctor.token).perfil, 'medico');
  assert.equal(jwt.decode(pharmacist.token).perfil, 'farmaceutico');
});

test('cadastros rejeitam e-mail e registro repetidos, campos inválidos e senha curta', async () => {
  for (const [resource, field] of [['medicos', 'crm'], ['farmaceuticos', 'crf']]) {
    const body = { nome: 'Profissional teste', [field]: 'NOVO/SP', email: 'MESMO@example.invalid', senha: 'teste123' };
    assert.equal((await request(`/${resource}`, { method: 'POST', body })).status, 409);
    assert.equal((await request(`/${resource}`, { method: 'POST', body: { ...body, email: 'novo@example.invalid', [field]: field === 'crm' ? '100/SP' : '200/SP' } })).status, 409);
    assert.equal((await request(`/${resource}`, { method: 'POST', body: { ...body, email: 'novo@example.invalid', senha: '123' } })).status, 400);
    assert.equal((await request(`/${resource}`, { method: 'POST', body: { ...body, email: 'email-invalido' } })).status, 400);
    assert.equal((await request(`/${resource}`, { method: 'POST', body: { ...body, [field]: undefined } })).status, 400);
  }
});

test('login exige as credenciais do perfil escolhido e recusa tokens sem perfil ou adulterados', async () => {
  assert.equal((await request('/farmaceuticos/login', { method: 'POST', body: { email: 'mesmo@example.invalid', senha: password } })).status, 401);
  assert.equal((await request('/medicos/login', { method: 'POST', body: { email: 'mesmo@example.invalid', senha: pharmacyPassword } })).status, 401);
  assert.equal((await request('/farmaceuticos/login', { method: 'POST', body: {} })).status, 401);
  const legacy = jwt.sign({ id: 1, nome: 'Sem perfil' }, process.env.JWT_SECRET);
  assert.equal((await request('/receitas', { token: legacy })).status, 401);
  const parts = doctor.token.split('.');
  parts[1] = Buffer.from(JSON.stringify({ ...jwt.decode(doctor.token), perfil: 'farmaceutico' })).toString('base64url');
  assert.equal((await request('/medicamentos', { method: 'POST', token: parts.join('.'), body: { nome: 'Teste', dosagem: 'Teste' } })).status, 401);
});

test('permissões impedem médico de alterar estoque/dispensar e farmacêutico de cadastrar pacientes/prescrever/cancelar', async () => {
  for (const [path, method, token] of [
    ['/medicamentos', 'POST', doctor.token], ['/medicamentos/1', 'PUT', doctor.token], ['/medicamentos/1', 'DELETE', doctor.token],
    ['/retiradas', 'POST', doctor.token], ['/pacientes', 'GET', pharmacist.token], ['/pacientes', 'POST', pharmacist.token],
    ['/pacientes/1', 'PUT', pharmacist.token], ['/receitas', 'POST', pharmacist.token], ['/receitas/1', 'PUT', pharmacist.token],
    ['/receitas/1', 'DELETE', pharmacist.token], ['/medicos', 'GET', pharmacist.token], ['/farmaceuticos/1', 'GET', doctor.token],
  ]) assert.equal((await request(path, { method, token, ...(method !== 'GET' && { body: {} }) })).status, 403, `${method} ${path}`);
  assert.equal((await request('/medicamentos', { token: doctor.token })).status, 200);
  assert.equal((await request('/retiradas', { token: pharmacist.token })).status, 200);
  assert.equal((await request('/receitas')).status, 401);
});

test('fluxo real: médico emite, farmacêutico dispensa, responsável autenticado é registrado e médico acompanha só suas receitas', async () => {
  const med = await request('/medicamentos', { method: 'POST', token: pharmacist.token, body: { nome: 'Medicamento fictício', dosagem: 'Teste', estoque: 5 } });
  assert.equal(med.status, 201);
  const patient = await request('/pacientes', { method: 'POST', token: doctor.token, body: { nome: 'Paciente fictício', cpf: '00000000001' } });
  assert.equal(patient.status, 201);
  const prescriptionBody = { pacienteId: patient.body.id, itens: [{ medicamentoId: med.body.id, quantidade: 3, posologia: 'Apenas teste de integração' }] };
  const issued = await request('/receitas', { method: 'POST', token: doctor.token, body: prescriptionBody });
  const otherIssued = await request('/receitas', { method: 'POST', token: otherDoctor.token, body: prescriptionBody });
  assert.equal(issued.status, 201);
  assert.equal(otherIssued.status, 201);
  const doctorList = await request(`/receitas?medicoId=${otherDoctor.usuario.id}`, { token: doctor.token });
  assert.deepEqual(doctorList.body.map(r => r.id), [issued.body.id]);
  assert.equal((await request('/receitas', { token: pharmacist.token })).body.length, 2);
  assert.equal((await request(`/receitas/${otherIssued.body.id}`, { token: doctor.token })).status, 403);
  assert.equal((await request(`/receitas/${otherIssued.body.id}`, { method: 'DELETE', token: doctor.token })).status, 403);
  assert.equal((await request(`/receitas/${issued.body.id}`, { method: 'PUT', token: doctor.token, body: { status: 'RETIRADA' } })).status, 400);
  const code = issued.body.codigoRetirada;
  const recipe = (await request(`/receitas/codigo/${code}`)).body;
  const item = recipe.itens[0];
  const withdrawalBody = { codigoRetirada: code, farmaceuticoNome: 'Nome adulterado', farmaceuticoId: 99999, itens: [{ receitaItemId: item.id, quantidade: 1 }] };
  const partial = await request('/retiradas', { method: 'POST', token: pharmacist.token, body: withdrawalBody });
  assert.equal(partial.status, 201);
  assert.equal(partial.body.status, 'PARCIAL');
  const stock = (await request(`/medicamentos/${med.body.id}`, { token: pharmacist.token })).body.estoque;
  assert.equal(stock, 4);
  const history = (await request('/retiradas', { token: doctor.token })).body;
  assert.equal(history.length, 1);
  assert.equal(history[0].farmaceutico_nome, pharmacist.usuario.nome);
  assert.equal(history[0].farmaceutico_id, pharmacist.usuario.id);
  assert.equal((await request(`/retiradas/${history[0].id}`, { token: otherDoctor.token })).status, 403);
  assert.equal((await request('/retiradas', { token: otherDoctor.token })).body.length, 0);
  const fractional = await request('/retiradas', { method: 'POST', token: pharmacist.token, body: { ...withdrawalBody, itens: [{ receitaItemId: item.id, quantidade: .5 }] } });
  assert.equal(fractional.status, 400);
  assert.equal((await request(`/medicamentos/${med.body.id}`, { token: doctor.token })).body.estoque, 4);
  const complete = await request('/retiradas', { method: 'POST', token: pharmacist.token, body: { ...withdrawalBody, itens: [{ receitaItemId: item.id, quantidade: 2 }] } });
  assert.equal(complete.body.status, 'RETIRADA');
  assert.equal((await request(`/receitas/${issued.body.id}`, { token: doctor.token })).body.status, 'RETIRADA');
});

test('contas autenticadas só podem editar o próprio cadastro e não podem trocar de perfil', async () => {
  assert.equal((await request(`/medicos/${otherDoctor.usuario.id}`, { method: 'PUT', token: doctor.token, body: { nome: 'Tentativa' } })).status, 403);
  assert.equal((await request(`/farmaceuticos/${pharmacist.usuario.id}`, { method: 'PUT', token: pharmacist.token, body: { perfil: 'medico', nome: 'Farmacêutico atualizado' } })).status, 200);
  const ownAccount = await request(`/farmaceuticos/${pharmacist.usuario.id}`, { token: pharmacist.token });
  assert.equal(ownAccount.body.nome, 'Farmacêutico atualizado');
  assert.equal(ownAccount.body.senha_hash, undefined);
  assert.equal((await request('/pacientes', { token: pharmacist.token })).status, 403);
});

test('menus e demonstração seguem as mesmas duas visões', async () => {
  assert.deepEqual(Object.keys(profiles), ['medico', 'farmaceutico']);
  assert.deepEqual(profiles.medico.routes, ['inicio', 'receita', 'pacientes', 'historico']);
  assert.deepEqual(profiles.farmaceutico.routes, ['inicio', 'dispensar', 'estoque', 'historico']);
  assert.equal(canAccess('farmaceutico', 'receita'), false);
  assert.equal(canAccess('medico', 'dispensar'), false);
  assert.equal(canAccess('administrador', 'inicio'), false);
  const data = { pacientes: [], receitas: [], medicamentos: [], retiradas: [] };
  const medicalDemo = createDemoApi(data, 'medico');
  const pharmacyDemo = createDemoApi(data, 'farmaceutico');
  await assert.rejects(medicalDemo.create('medicamentos', {}), error => error.status === 403);
  await assert.rejects(medicalDemo.create('retiradas', {}), error => error.status === 403);
  await assert.rejects(pharmacyDemo.list('pacientes'), error => error.status === 403);
  await assert.rejects(pharmacyDemo.create('receitas', {}), error => error.status === 403);
});

test('adaptador usa a rota de cadastro e login do perfil selecionado', async t => {
  const saved = globalThis.fetch;
  t.after(() => { globalThis.fetch = saved; });
  const calls = [];
  globalThis.fetch = async (path, options) => { calls.push({ path, options }); return new Response('{}', { status: 200 }); };
  const api = createHttpApi();
  await api.register({ nome: 'Farmacêutico', crf: '100/SP' }, 'farmaceutico');
  await api.login({ email: 'farmacia@example.invalid', senha: 'teste123' }, 'farmaceutico');
  await api.login({ email: 'medico@example.invalid', senha: 'teste123' }, 'medico');
  assert.deepEqual(calls.map(c => c.path), ['/farmaceuticos', '/farmaceuticos/login', '/medicos/login']);
});
