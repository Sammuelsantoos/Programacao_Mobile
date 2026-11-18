import { icon, logo } from './icons.js';
import { createHttpApi, SESSION_KEY } from './data.js';
import { profiles, canAccess } from './profiles.js';

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const initials = name => String(name || '').replace(/^(Dra?\.?\s+)/i, '').split(' ').filter(Boolean).map(s => s[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').slice(0, 2);
const number = value => new Intl.NumberFormat('pt-BR').format(value);
const parseDate = value => new Date(value?.includes('T') ? value : `${value?.replace(' ', 'T')}Z`);
const date = (value, options = {}) => value ? parseDate(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', ...options }) : '—';
const time = value => value ? parseDate(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
const maskedCpf = value => value ? `${String(value).slice(0, 3)}.***.***-${String(value).slice(-2)}` : '—';
const statuses = { PENDENTE: 'Pendente', PARCIAL: 'Parcial', RETIRADA: 'Dispensada', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada' };
const badge = status => `<span class="badge ${esc(status)}"><i class="dot"></i>${esc(statuses[status] || status)}</span>`;
const colorClasses = ['', 'lilac', 'blue-avatar', 'pink', 'peach'];
const avatar = (name, id = 0) => `<span class="avatar ${colorClasses[id % colorClasses.length]}">${esc(initials(name))}</span>`;
const person = (name, cpf, id) => `<div class="person-cell">${avatar(name, id)}<span><strong>${esc(name)}</strong><small>CPF: ${maskedCpf(cpf)}</small></span></div>`;
const routes = {
  inicio: ['Visão geral', 'grid'], receita: ['Nova receita', 'prescription'], dispensar: ['Dispensação', 'pill'],
  pacientes: ['Pacientes', 'users'], estoque: ['Estoque', 'box'], historico: ['Histórico', 'history'],
};
let session;
try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { session = null; }
const restoredUser = session?.usuario || (session?.medico && { ...session.medico, perfil: 'medico' }) || session?.farmaceutico;
if (session?.token && !profiles[restoredUser?.perfil]) { session = null; sessionStorage.removeItem(SESSION_KEY); }
const state = {
  user: session?.token ? restoredUser : null,
  api: createHttpApi(session?.token),
  authProfile: session?.token ? restoredUser.perfil : 'medico', authDraft: {},
  data: { receitas: [], pacientes: [], medicamentos: [], retiradas: [] }, loaded: false,
  query: '', filter: 'Todas', page: 1, prescription: null, publicPrescription: null,
  draft: { pacienteId: '', observacoes: '', itens: [{ medicamentoId: '', quantidade: 1, posologia: '' }] },
};
const profile = () => profiles[state.user?.perfil];
const isDoctor = () => state.user?.perfil === 'medico';
const userRegistration = () => `${profile().registration} ${state.user[profile().registrationField] || ''}`;
function profileSelector(selected, action) {
  return `<div class="profile-selector" role="group" aria-label="Perfil profissional">${Object.entries(profiles).map(([key, p]) => `<button type="button" data-action="${action}" data-profile="${key}" class="${selected === key ? 'active' : ''}" aria-pressed="${selected === key}">${icon(key === 'medico' ? 'stethoscope' : 'pill')}${p.shortLabel}</button>`).join('')}</div>`;
}
let renderVersion = 0;
const route = () => location.hash.slice(1).split('?')[0] || (state.user ? 'inicio' : 'login');
function navigate(to) {
  if (route() === to) render();
  else location.hash = to;
}
function toast(message, error = false) {
  const el = document.createElement('div'); el.className = `toast${error ? ' error' : ''}`;
  el.innerHTML = `${icon(error ? 'alert' : 'check')}<span>${esc(message)}</span>`;
  $('#toasts').append(el); setTimeout(() => el.remove(), 5500);
}
async function task(button, action, errorTarget) {
  const original = button?.innerHTML;
  if (button) { button.disabled = true; button.innerHTML = '<span class="spinner"></span> Aguarde…'; }
  if (errorTarget) errorTarget.textContent = '';
  try { await action(); }
  catch (error) {
    if (error.status === 401 && !['login', 'cadastro', 'consulta'].includes(route())) {
      sessionStorage.removeItem(SESSION_KEY); $('#modal').close(); navigate('login');
      toast('Sua sessão expirou. Entre novamente para continuar.', true);
    } else if (errorTarget?.isConnected) errorTarget.textContent = error.message;
    else toast(error.message, true);
  } finally { if (button?.isConnected) { button.disabled = false; button.innerHTML = original; } }
}
async function loadData() {
  const api = state.api;
  const keys = profile().resources;
  const values = await Promise.all(keys.map(key => api.list(key)));
  if (api !== state.api) return;
  state.data = { pacientes: [], receitas: [], medicamentos: [], retiradas: [], ...Object.fromEntries(keys.map((key, i) => [key, values[i]])) };
  state.data.receitas.sort((a, b) => parseDate(b.data_emissao) - parseDate(a.data_emissao));
  state.loaded = true;
}
function shell() {
  const user = state.user;
  return `<div class="app-shell"><header class="topbar"><div class="breadcrumb">Workspace ${icon('chevron')}<strong>${routes[route()]?.[0] || 'Visão geral'}</strong></div>
    <a class="mobile-brand" href="#inicio" aria-label="IntegraSUS — Início">${logo()}</a>
    <div class="topbar-right"><div class="connection"><i class="dot"></i>Conectado ao servidor</div>
    ${!isDoctor() ? `<button class="icon-btn" data-action="notifications" aria-label="Ver alertas de estoque">${icon('bell')}${state.data.medicamentos.some(m => m.estoque <= 10) ? '<i class="notice-dot"></i>' : ''}</button><div class="topbar-divider"></div>` : ''}
    <button class="user" data-action="account" aria-label="Abrir minha conta">${avatar(user.nome)}<span class="user-copy"><strong>${esc(user.nome)}</strong><small>${profile().label} · ${esc(userRegistration())}</small></span>${icon('down')}</button></div>
  </header><main class="main" id="main" tabindex="-1">
    <div class="workspace-label">${icon(profile().primaryIcon)}${isDoctor() ? 'CONSULTÓRIO MÉDICO' : 'ÁREA DA FARMÁCIA'}<span>${profile().label} · ${esc(userRegistration())}</span></div>
    <div id="page"></div><footer class="footer"><span>© ${new Date().getFullYear()} IntegraSUS. Cuidado em cada conexão.</span><span>${icon('shield')}Sessão autenticada · Acesso profissional</span></footer>
  </main></div><nav class="mobile-nav" aria-label="Telas principais">${profile().routes.map(key => `<a href="#${key}" class="${route() === key ? 'active' : ''}" ${route() === key ? 'aria-current="page"' : ''}>${icon(routes[key][1])}<span>${({ inicio: 'Início', receita: 'Receita', dispensar: 'Dispensar', pacientes: 'Pacientes', estoque: 'Estoque', historico: 'Histórico' })[key]}</span></a>`).join('')}</nav>`;
}
function heading(title, subtitle, actions = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function empty(title = 'Nenhum resultado encontrado', message = 'Tente outro termo de busca ou ajuste os filtros.', action = '') {
  return `<div class="empty">${icon('search')}<h3>${title}</h3><p>${message}</p>${action}</div>`;
}
function metric(label, value, symbol, tone, note, subnote) {
  const sparks = { blue: '0,21 10,19 19,23 29,12 39,15 49,5 65,2', mint: '0,22 12,17 23,18 34,9 44,13 54,5 65,3', amber: '0,8 11,13 20,8 33,20 42,16 54,22 65,17', purple: '0,24 11,19 21,21 32,14 43,17 53,6 65,2' };
  const colors = { blue: '#729ce6', mint: '#74bcae', amber: '#dfbc70', purple: '#bca2e8' };
  return `<article class="metric"><div class="metric-top"><span class="metric-label">${label}</span><span class="metric-icon ${tone}">${icon(symbol)}</span></div><div class="between"><strong class="metric-value">${value}</strong><svg class="metric-spark" viewBox="0 0 65 28" aria-hidden="true"><polyline points="${sparks[tone]}" fill="none" stroke="${colors[tone]}" stroke-width="1.5"/><path d="M${sparks[tone].replaceAll(' ', ' L')} L65,28 L0,28Z" fill="${colors[tone]}" opacity=".07"/></svg></div><div class="metric-bottom"><strong class="${tone === 'amber' ? 'amber-text' : ''}">${icon(tone === 'amber' ? 'clock' : 'check')}${note}</strong><span>${subnote}</span></div></article>`;
}
function recipeTable(recipes, compact = false) {
  if (!recipes.length) return empty('Nenhuma receita por aqui', isDoctor() ? 'Emita sua primeira receita para acompanhar os atendimentos.' : 'As receitas emitidas pelos médicos aparecerão aqui.', `<a href="#${profile().primaryRoute}" class="btn btn-primary">${profile().primaryLabel}</a>`);
  return `<div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Código</th><th>Emissão</th>${!compact ? '<th>Prescritor</th>' : ''}<th>Status</th><th aria-label="Ações"></th></tr></thead><tbody>${recipes.map(r => `<tr><td>${person(r.paciente_nome, r.paciente_cpf, r.paciente_id)}</td><td><span class="code">#${esc(r.codigo_retirada)}</span></td><td>${date(r.data_emissao)}<div class="tiny muted">${time(r.data_emissao)}</div></td>${!compact ? `<td>${esc(r.medico_nome)}</td>` : ''}<td>${badge(r.status)}</td><td><button class="table-action" data-action="details" data-code="${esc(r.codigo_retirada)}" aria-label="Ver receita ${esc(r.codigo_retirada)}">${icon('chevron')}</button></td></tr>`).join('')}</tbody></table></div>`;
}
function weeklyChart() {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0); return d; });
  const equalDay = (a, b) => a.toDateString() === b.toDateString();
  const counts = days.map(d => ({ date: d, issued: state.data.receitas.filter(r => equalDay(parseDate(r.data_emissao), d)).length,
    fulfilled: new Set(state.data.retiradas.filter(r => equalDay(parseDate(r.data_retirada), d)).map(r => r.receita_id)).size }));
  const max = Math.max(4, ...counts.flatMap(c => [c.issued, c.fulfilled]));
  return `<div class="chart" role="img" aria-label="Receitas emitidas e dispensadas nos últimos sete dias"><div class="chart-y">${[max, Math.round(max * .75), Math.round(max * .5), Math.round(max * .25), 0].map(v => `<span>${v}</span>`).join('')}</div><div class="chart-plot"><div class="chart-lines">${'<i></i>'.repeat(5)}</div><div class="chart-bars">${counts.map(c => `<div class="chart-day" title="${date(c.date.toISOString())}: ${c.issued} emitidas, ${c.fulfilled} dispensadas"><div class="bars"><span class="bar" style="height:${c.issued / max * 100}%"></span><span class="bar mint" style="height:${c.fulfilled / max * 100}%"></span></div><span class="chart-day-label">${c.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span></div>`).join('')}</div></div></div>`;
}
function stockAlerts() {
  const low = state.data.medicamentos.filter(m => m.estoque <= 10).sort((a, b) => a.estoque - b.estoque);
  return `<section class="panel stock-alerts section-gap"><div class="panel-head"><h2>Fique de olho no estoque</h2><span class="icon-title">${icon('alert')}</span></div><div class="stock-list">${low.length ? low.slice(0, 3).map(m => `<div class="stock-list-row"><div><strong>${esc(m.nome)}</strong><small>${esc(m.dosagem)}</small></div><div class="stock-level ${m.estoque <= 2 ? 'critical-text' : ''}">${m.estoque}<small> unidades</small></div></div>`).join('') : '<p class="muted tiny" style="padding:15px 0">Todos os medicamentos com estoque regular.</p>'}</div><div class="panel-body"><a href="#estoque" class="btn btn-block">Gerenciar estoque ${icon('arrow')}</a></div></section>`;
}
function activityPanel() {
  const items = state.data.retiradas.slice(0, 3);
  return `<section class="panel activity-panel section-gap"><div class="panel-head"><h2>Últimas movimentações</h2>${icon('history', 'muted')}</div><div class="activity-list">${items.length ? items.map(item => `<div class="activity"><span class="activity-icon">${icon('check')}</span><div><strong>Retirada registrada</strong><p>${esc(item.paciente_nome)} · ${item.quantidade} un.</p><small>${date(item.data_retirada)} às ${time(item.data_retirada)}</small></div></div>`).join('') : '<p class="muted tiny">As retiradas registradas aparecerão aqui.</p>'}</div></section>`;
}
function dashboard() {
  const { receitas, pacientes } = state.data;
  const fulfilled = receitas.filter(r => r.status === 'RETIRADA').length;
  const pending = receitas.filter(r => ['PENDENTE', 'PARCIAL'].includes(r.status)).length;
  const rate = receitas.length ? Math.round(fulfilled / receitas.length * 100) : 0;
  const firstName = state.user.nome.replace(/^(Dra?\.?\s+)/i, '').split(' ')[0];
  const hour = new Date().getHours();
  const pharmacyMetrics = metric('Aguardando retirada', number(pending), 'clock', 'blue', 'Receitas disponíveis', 'para atendimento') + metric('Retiradas registradas', number(state.data.retiradas.length), 'shield', 'mint', 'Entregas realizadas', 'na plataforma') + metric('Estoque em atenção', number(state.data.medicamentos.filter(m => m.estoque <= 10).length), 'alert', 'amber', 'Confira os saldos', 'até 10 unidades') + metric('Medicamentos', number(state.data.medicamentos.length), 'box', 'purple', 'Catálogo disponível', 'para dispensação');
  return `${heading(`${hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'}, ${esc(firstName)} <span style="font-size:24px">☀</span>`, isDoctor() ? 'Seu consultório conectado ao cuidado de cada paciente.' : 'Sua farmácia pronta para o próximo atendimento.', `<span class="date-label">${icon('calendar')}${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span><a class="btn btn-primary" href="#${profile().primaryRoute}">${icon(isDoctor() ? 'plus' : 'pill')}${profile().primaryLabel}</a>`)}
    <div class="metrics">${isDoctor() ? `${metric('Minhas receitas', number(receitas.length), 'prescription', 'blue', 'Total registrado', 'no consultório')}${metric('Receitas dispensadas', number(fulfilled), 'shield', 'mint', `${rate}% atendidas`, 'do total emitido')}${metric('Aguardando retirada', number(pending), 'clock', 'amber', 'Acompanhe', 'as receitas em aberto')}${metric('Pacientes cadastrados', number(pacientes.length), 'users', 'purple', 'Cuidado conectado', 'em um só lugar')}` : pharmacyMetrics}</div>
    <div class="dashboard-grid"><div><section class="panel chart-panel"><div class="panel-head"><div><h2>Um panorama dos atendimentos</h2><p>Movimentação dos últimos 7 dias</p></div><div class="chart-legend"><span><i></i>Emitidas</span><span><i></i>Dispensadas</span></div></div>${weeklyChart()}</section>
    <section class="panel section-gap"><div class="panel-head"><div><h2>Receitas recentes</h2><p>Acompanhe cada etapa do cuidado.</p></div><a class="text-btn" href="#historico">Ver todas ${icon('arrow')}</a></div>${recipeTable(receitas.slice(0, 5), true)}<div class="table-foot"><span>Mostrando ${Math.min(5, receitas.length)} de ${receitas.length} receitas</span><span class="flex">${icon('shield')}Registro integrado</span></div></section></div>
    <aside class="dashboard-aside"><section class="quick-panel"><div class="quick-icon">${icon(profile().primaryIcon)}</div><div><h2>${isDoctor() ? 'O próximo cuidado<br class="hide-mobile"> começa aqui.' : 'Da receita à entrega.<br>Com você em cada etapa.'}</h2><p>${isDoctor() ? 'Emita uma receita e conecte seu paciente ao tratamento.' : 'Consulte o código da receita, confira os itens e registre a dispensação.'}</p></div><a class="btn" href="#${profile().primaryRoute}">${profile().primaryLabel} ${icon('arrow')}</a></section>${isDoctor() ? `<section class="panel section-gap"><div class="panel-head"><div><h2>Pessoas no centro do cuidado</h2><p>${pacientes.length} paciente(s) cadastrado(s)</p></div>${icon('users', 'blue')}</div><div class="panel-body"><a href="#pacientes" class="btn btn-block">Gerenciar pacientes ${icon('arrow')}</a></div></section>` : stockAlerts()}${activityPanel()}</aside></div>`;
}
function searchToolbar(placeholder, filters) {
  return `<div class="toolbar"><label class="search-field">${icon('search')}<input type="search" id="list-search" placeholder="${placeholder}" aria-label="${placeholder}" value="${esc(state.query)}"></label><div class="chips">${filters.map(f => `<button class="chip ${state.filter === f ? 'active' : ''}" data-action="filter" data-filter="${esc(f)}" aria-pressed="${state.filter === f}">${f}</button>`).join('')}</div></div>`;
}
function filteredRecipes() {
  const q = state.query.toLocaleLowerCase('pt-BR');
  return state.data.receitas.filter(r => (state.filter === 'Todas' || statuses[r.status] === state.filter) && `${r.paciente_nome} ${r.paciente_cpf} ${r.codigo_retirada} ${r.medico_nome}`.toLocaleLowerCase('pt-BR').includes(q));
}
function historyResults() {
  const all = filteredRecipes(); const pageSize = 8; const pages = Math.max(1, Math.ceil(all.length / pageSize));
  state.page = Math.min(state.page, pages);
  return `${recipeTable(all.slice((state.page - 1) * pageSize, state.page * pageSize))}<div class="table-foot"><span>${all.length} receita${all.length !== 1 ? 's' : ''} encontrada${all.length !== 1 ? 's' : ''}</span><div class="page-numbers">${Array.from({ length: pages }, (_, i) => `<button class="${state.page === i + 1 ? 'active' : ''}" data-action="page" data-page="${i + 1}" aria-label="Página ${i + 1}" ${state.page === i + 1 ? 'aria-current="page"' : ''}>${i + 1}</button>`).join('')}</div></div>`;
}
function history() {
  return `${heading(isDoctor() ? 'Minhas receitas' : 'Histórico de receitas', isDoctor() ? 'Acompanhe as prescrições emitidas por você e suas retiradas.' : 'Cada prescrição, do primeiro cuidado à última retirada.', `<button class="btn" data-action="export">${icon('download')}Exportar CSV</button><a class="btn btn-primary" href="#${profile().primaryRoute}">${icon(profile().primaryIcon)}${profile().primaryLabel}</a>`)}${searchToolbar('Buscar por paciente, CPF, código ou médico…', ['Todas', 'Pendente', 'Parcial', 'Dispensada', 'Cancelada'])}<section class="panel" id="list-results">${historyResults()}</section>`;
}
function stockStatus(m) { return m.estoque <= 2 ? ['critical', m.estoque === 0 ? 'Esgotado' : 'Crítico'] : m.estoque <= 10 ? ['low', 'Estoque baixo'] : ['normal', 'Regular']; }
function inventoryResults() {
  const q = state.query.toLocaleLowerCase('pt-BR');
  const meds = state.data.medicamentos.filter(m => `${m.nome} ${m.principio_ativo || ''} ${m.fabricante || ''}`.toLocaleLowerCase('pt-BR').includes(q) && (state.filter === 'Todos' || (state.filter === 'Estoque baixo' ? m.estoque <= 10 : m.estoque === 0)));
  return meds.length ? meds.map(m => { const [style, label] = stockStatus(m); return `<article class="medicine-card"><div class="between"><span class="medicine-symbol">${icon(m.id === 4 ? 'heart' : 'pill')}</span><span class="badge ${style}"><i class="dot"></i>${label}</span></div><div><h2>${esc(m.nome)}</h2><p>${esc(m.principio_ativo || 'Princípio ativo não informado')} · ${esc(m.dosagem)}</p></div><div class="medicine-detail"><span>${esc(m.fabricante || 'Fabricante não informado')}</span><strong>${m.estoque}<small> un.</small></strong></div><button class="btn" data-action="medicine" data-id="${m.id}">${icon('filter')}Ajustar medicamento ${icon('arrow')}</button></article>`; }).join('') : empty();
}
function inventory() {
  const meds = state.data.medicamentos;
  return `${heading('Controle de estoque', 'Disponibilidade organizada. Tratamentos em dia.', `<button class="btn btn-primary" data-action="medicine">${icon('plus')}Cadastrar medicamento</button>`)}<div class="metrics inventory-metrics">${metric('Medicamentos', number(meds.length), 'box', 'blue', 'Catálogo', 'cadastrado')}${metric('Estoque baixo', number(meds.filter(m => m.estoque > 0 && m.estoque <= 10).length), 'alert', 'amber', 'Atenção', 'até 10 unidades')}${metric('Esgotados', number(meds.filter(m => m.estoque === 0).length), 'pill', 'purple', 'Reposição', 'necessária')}</div>${searchToolbar('Buscar medicamento, princípio ativo ou fabricante…', ['Todos', 'Estoque baixo', 'Esgotados'])}<div class="inventory-grid" id="list-results">${inventoryResults()}</div>`;
}
function patientsResults() {
  const q = state.query.toLocaleLowerCase('pt-BR').replace(/[.\-]/g, '');
  const patients = state.data.pacientes.filter(p => `${p.nome} ${p.cpf}`.toLocaleLowerCase('pt-BR').includes(q));
  return patients.length ? `<div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Data de nascimento</th><th>Telefone</th><th>Receitas</th><th aria-label="Ações"></th></tr></thead><tbody>${patients.map(p => `<tr><td>${person(p.nome, p.cpf, p.id)}</td><td>${p.data_nascimento ? new Date(`${p.data_nascimento}T12:00:00`).toLocaleDateString('pt-BR') : '—'}</td><td>${esc(p.telefone || '—')}</td><td>${state.data.receitas.filter(r => r.paciente_id === p.id).length}</td><td><button class="table-action" data-action="patient" data-id="${p.id}" aria-label="Editar ${esc(p.nome)}">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>` : empty('Nenhum paciente encontrado', 'Cadastre um paciente para começar a emitir receitas.', '<button class="btn btn-primary" data-action="patient">Cadastrar paciente</button>');
}
function patients() {
  return `${heading('Pacientes', 'Pessoas no centro. Informações sempre à mão.', `<button class="btn btn-primary" data-action="patient">${icon('plus')}Novo paciente</button>`)}${searchToolbar('Buscar paciente por nome ou CPF…', [])}<section class="panel" id="list-results">${patientsResults()}</section>`;
}
function patientOptions(selected) { return `<option value="">Selecione um paciente</option>${state.data.pacientes.map(p => `<option value="${p.id}" ${Number(selected) === p.id ? 'selected' : ''}>${esc(p.nome)} · ${maskedCpf(p.cpf)}</option>`).join('')}`; }
function medicineOptions(selected) { return `<option value="">Selecione um medicamento</option>${state.data.medicamentos.map(m => `<option value="${m.id}" ${Number(selected) === m.id ? 'selected' : ''}>${esc(m.nome)} · ${esc(m.dosagem)}</option>`).join('')}`; }
function prescriptionLines() {
  return state.draft.itens.map((i, index) => `<div class="prescription-line"><div class="line-title"><strong>MEDICAMENTO ${String(index + 1).padStart(2, '0')}</strong>${state.draft.itens.length > 1 ? `<button class="icon-btn" type="button" data-action="remove-line" data-index="${index}" aria-label="Remover medicamento ${index + 1}">${icon('close')}</button>` : ''}</div><div class="line-grid"><label class="field">Medicamento<select name="med-${index}" required>${medicineOptions(i.medicamentoId)}</select></label><label class="field">Quantidade<input type="number" name="qty-${index}" min="1" max="9999" step="1" value="${i.quantidade}" required></label></div><label class="field">Posologia e instruções<textarea name="pos-${index}" rows="2" placeholder="Informe a dose, frequência e duração do tratamento." required maxlength="2000">${esc(i.posologia)}</textarea></label></div>`).join('');
}
function prescriptionForm() {
  return `${heading('Nova receita', 'Um novo cuidado, com tudo o que seu paciente precisa.', '<a href="#historico" class="btn">Ver histórico '+icon('history')+'</a>')}<form id="prescription-form" class="form-layout"><div class="stack"><section class="panel form-panel"><div class="between" style="margin-bottom:22px"><div class="form-section-title" style="margin:0"><span>01</span><h2>Dados do paciente</h2></div><button type="button" class="text-btn" data-action="patient">${icon('plus')}Novo paciente</button></div><label class="field">Paciente<select name="pacienteId" id="patient-select" required>${patientOptions(state.draft.pacienteId)}</select></label><div id="selected-patient"></div></section><section class="panel form-panel"><div class="form-section-title"><span>02</span><h2>Prescrição médica</h2></div><div id="prescription-lines">${prescriptionLines()}</div><button type="button" class="btn btn-light btn-block" data-action="add-line" style="margin-top:17px">${icon('plus')}Adicionar medicamento</button><div class="form-divider"></div><label class="field">Orientações gerais <span class="muted">(opcional)</span><textarea name="observacoes" placeholder="Recomendações e observações para o paciente." maxlength="4000">${esc(state.draft.observacoes)}</textarea></label></section></div><aside class="panel summary-panel"><h2>Resumo da prescrição</h2><div class="summary-row"><span>Profissional</span><strong>${esc(state.user.nome)}</strong></div><div class="summary-row"><span>Registro</span><strong>CRM ${esc(state.user.crm)}</strong></div><div class="form-divider"></div><div class="summary-row"><span>Paciente</span><strong id="summary-patient">Não selecionado</strong></div><div class="summary-row"><span>Medicamentos</span><strong id="summary-count">${state.draft.itens.length} item(ns)</strong></div><div class="info-box">${icon('shield')}<span>Um código único será gerado para consultar a receita e registrar a retirada na farmácia.</span></div><label class="check-label"><input type="checkbox" name="reviewed" required>Confirmo que conferi os dados do paciente e as instruções desta prescrição.</label><div class="error-message" id="prescription-error" role="alert"></div><button type="submit" class="btn btn-primary btn-block">${icon('prescription')}Emitir receita</button></aside></form>`;
}
function captureDraft() {
  const form = $('#prescription-form'); if (!form) return;
  const data = new FormData(form);
  state.draft = { pacienteId: data.get('pacienteId'), observacoes: data.get('observacoes'), itens: state.draft.itens.map((_, index) => ({ medicamentoId: data.get(`med-${index}`), quantidade: Number(data.get(`qty-${index}`)), posologia: data.get(`pos-${index}`) })) };
}
function updatePatientSummary() {
  const patient = state.data.pacientes.find(p => p.id === Number($('#patient-select')?.value));
  if ($('#selected-patient')) $('#selected-patient').innerHTML = patient ? `<div class="patient-info">${avatar(patient.nome, patient.id)}<div><strong>${esc(patient.nome)}</strong><small>CPF: ${maskedCpf(patient.cpf)} · ${esc(patient.telefone || 'Sem telefone')}</small></div></div>` : '';
  if ($('#summary-patient')) $('#summary-patient').textContent = patient?.nome || 'Não selecionado';
}
function dispatchDetails(r) {
  const active = ['PENDENTE', 'PARCIAL'].includes(r.status);
  return `<div class="panel"><div class="panel-head"><div>${person(r.paciente_nome, r.paciente_cpf, r.paciente_id)}<p style="margin-top:12px">${esc(r.medico_nome)} · CRM ${esc(r.medico_crm)} · ${date(r.data_emissao)}</p></div>${badge(r.status)}</div>${(r.itens || []).map(i => {
    const left = i.quantidade - i.quantidade_retirada; const max = Math.max(0, Math.min(left, i.estoque || 0));
    return `<div class="dispatch-item"><div class="between"><div><h3>${esc(i.nome)}</h3><p>${esc(i.dosagem)}</p></div><span class="badge ${i.estoque > 10 ? 'normal' : 'low'}">${i.estoque || 0} un. em estoque</span></div><div class="dispatch-metrics"><div><small>Prescrito</small><strong>${i.quantidade}</strong></div><div><small>Já dispensado</small><strong>${i.quantidade_retirada}</strong></div><div><small>Restante</small><strong class="blue">${left}</strong></div></div><p style="margin-bottom:15px">${esc(i.posologia || 'Sem instruções adicionais.')}</p>${active && left > 0 ? `<div class="between"><label class="field" for="dispatch-${i.id}">Quantidade a entregar</label><div class="quantity-control"><button class="qty-btn" type="button" data-action="qty" data-id="${i.id}" data-delta="-1" aria-label="Diminuir quantidade de ${esc(i.nome)}">−</button><input type="number" name="item-${i.id}" id="dispatch-${i.id}" min="0" max="${max}" step="1" value="0" required aria-label="Quantidade de ${esc(i.nome)}"><button class="qty-btn" type="button" data-action="qty" data-id="${i.id}" data-delta="1" aria-label="Aumentar quantidade de ${esc(i.nome)}">+</button></div></div>` : ''}</div>`;
  }).join('')}${r.observacoes ? `<div class="dispatch-note">Orientações: ${esc(r.observacoes)}</div>` : ''}</div>${active ? `<div class="panel summary-panel section-gap"><h2>Conferência da retirada</h2><label class="field">Farmacêutico responsável<input name="farmaceuticoNome" value="${esc(state.user.nome)} · ${esc(userRegistration())}" readonly><small>A retirada será vinculada à sua conta autenticada.</small></label><label class="check-label"><input type="checkbox" name="verified" required>Conferi os medicamentos, a quantidade, o lote e a validade antes da entrega.</label><div class="error-message" id="dispatch-error" role="alert"></div><button class="btn btn-primary btn-block" type="submit">${icon('check')}Registrar retirada e dar baixa</button></div>` : `<div class="info-box">${icon('shield')}Esta receita está ${statuses[r.status]?.toLowerCase()}. Não há retirada disponível.</div>`}`;
}
function dispatch() {
  return `${heading('Terminal de dispensação', 'Da receita à entrega. Cada etapa com mais segurança.')}<section class="panel lookup-panel"><h2>Localizar uma receita</h2><p>Digite o código de retirada informado pelo paciente.</p><form id="lookup-form" class="lookup-row"><label class="search-field">${icon('scan')}<input name="code" aria-label="Código de retirada" placeholder="Ex.: X7K2M9" required maxlength="6" minlength="6" pattern="[A-Za-z0-9]{6}" value="${esc(state.prescription?.codigo_retirada || '')}"></label><button class="btn btn-primary" type="submit">${icon('search')}Buscar receita</button></form><div class="error-message" id="lookup-error" role="alert"></div></section><form id="dispatch-form" class="dispatch-content">${state.prescription ? dispatchDetails(state.prescription) : empty('Pronto para o próximo atendimento', 'Busque uma receita para consultar os medicamentos e registrar a retirada.')}</form>`;
}

async function render() {
  const version = ++renderVersion;
  document.title = `IntegraSUS · ${routes[route()]?.[0] || (route() === 'consulta' ? 'Consulta de receita' : 'Acesso profissional')}`;
  $('#modal').close();
  if (['login', 'cadastro', 'consulta'].includes(route())) { renderAuth(); return; }
  if (!state.user || !sessionStorage.getItem(SESSION_KEY)) { navigate('login'); return; }
  if (!routes[route()]) { navigate('inicio'); return; }
  if (!canAccess(state.user.perfil, route())) { navigate('inicio'); toast('Esta tela não está disponível para seu perfil.', true); return; }
  $('#app').innerHTML = shell();
  if (!state.loaded) {
    $('#page').innerHTML = '<div class="loading"><span class="spinner"></span>Carregando seus cuidados…</div>';
    try { await loadData(); }
    catch (error) {
      if (error.status === 401) { sessionStorage.removeItem(SESSION_KEY); navigate('login'); toast('Entre novamente para continuar.', true); return; }
      $('#page').innerHTML = empty('Não foi possível carregar os dados', esc(error.message), '<button class="btn btn-primary" data-action="retry">Tentar novamente</button>'); return;
    }
    if (version !== renderVersion) return;
    $('#app').innerHTML = shell();
  }
  $('#page').innerHTML = ({ inicio: dashboard, historico: history, estoque: inventory, pacientes: patients, receita: prescriptionForm, dispensar: dispatch })[route()]();
  if (route() === 'receita') updatePatientSummary();
}

function modal(title, content) {
  const dialog = $('#modal');
  dialog.innerHTML = `<div class="modal-head"><h2 id="modal-title">${title}</h2><button type="button" class="icon-btn" data-action="close" aria-label="Fechar janela">${icon('close')}</button></div><div class="modal-body">${content}</div>`;
  if (!dialog.open) dialog.showModal();
}
function formField(label, name, value = '', extra = '') {
  return `<label class="field">${label}<input name="${name}" value="${esc(value)}" ${extra}></label>`;
}
function patientModal(id) {
  const p = state.data.pacientes.find(p => p.id === Number(id)) || {};
  modal(p.id ? 'Editar paciente' : 'Novo paciente', `<form id="patient-form" data-id="${p.id || ''}"><div class="form-grid"><div class="full">${formField('Nome completo *', 'nome', p.nome, 'required minlength="3" maxlength="150" autocomplete="name" placeholder="Nome e sobrenome"')}</div>${formField('CPF *', 'cpf', p.cpf, 'required inputmode="numeric" pattern="[0-9.\\-]{11,14}" maxlength="14" placeholder="000.000.000-00"')}${formField('Data de nascimento', 'data_nascimento', p.data_nascimento, `type="date" max="${new Date().toLocaleDateString('en-CA')}"`)}<div class="full">${formField('Telefone', 'telefone', p.telefone, 'type="tel" autocomplete="tel" maxlength="20" placeholder="(11) 99999-9999"')}</div></div><div class="error-message" id="patient-error" role="alert"></div><div class="form-actions"><button type="button" class="btn" data-action="close">Cancelar</button><button class="btn btn-primary" type="submit">${icon('check')}${p.id ? 'Salvar alterações' : 'Cadastrar paciente'}</button></div></form>`);
}
function medicineModal(id) {
  const m = state.data.medicamentos.find(m => m.id === Number(id)) || {};
  modal(m.id ? 'Ajustar medicamento' : 'Cadastrar medicamento', `<form id="medicine-form" data-id="${m.id || ''}"><div class="form-grid"><div class="full">${formField('Nome do medicamento *', 'nome', m.nome, 'required maxlength="150" placeholder="Ex.: Amoxicilina"')}</div><div class="full">${formField('Princípio ativo', 'principio_ativo', m.principio_ativo, 'maxlength="150" placeholder="Nome do princípio ativo"')}</div>${formField('Dosagem *', 'dosagem', m.dosagem, 'required maxlength="100" placeholder="Ex.: 500 mg"')}${formField('Estoque (unidades) *', 'estoque', m.estoque ?? 0, 'type="number" required min="0" max="9999999" step="1"')}<div class="full">${formField('Fabricante', 'fabricante', m.fabricante, 'maxlength="150" placeholder="Nome do laboratório"')}</div></div><div class="error-message" id="medicine-error" role="alert"></div><div class="form-actions"><button type="button" class="btn" data-action="close">Cancelar</button><button class="btn btn-primary" type="submit">${icon('check')}Salvar medicamento</button></div></form>`);
}
function detailsModal(r, isPublic = false) {
  modal(`Receita #${esc(r.codigo_retirada)}`, `<div class="between">${person(r.paciente_nome, r.paciente_cpf, r.paciente_id)}${badge(r.status)}</div><div class="summary-row"><span>Prescritor</span><strong>${esc(r.medico_nome)}</strong></div><div class="summary-row"><span>Registro</span><strong>CRM ${esc(r.medico_crm)}</strong></div><div class="summary-row"><span>Emissão</span><strong>${date(r.data_emissao, { year: 'numeric' })} às ${time(r.data_emissao)}</strong></div><div class="detail-list">${(r.itens || []).map(i => `<div class="detail-item"><h3>${esc(i.nome)} · ${esc(i.dosagem)}</h3><p>${esc(i.posologia || 'Sem instruções adicionais.')}</p><small>${i.quantidade} un. prescritas · ${i.quantidade_retirada} un. retiradas</small></div>`).join('')}</div>${r.observacoes ? `<div class="info-box">${icon('prescription')}<span>${esc(r.observacoes)}</span></div>` : ''}<div class="form-actions"><button class="btn" data-action="print">${icon('print')}Imprimir</button>${!isPublic && ['PENDENTE', 'PARCIAL'].includes(r.status) ? (isDoctor() ? (r.medico_id === state.user.id ? `<button class="btn btn-danger" data-action="cancel-confirm" data-id="${r.id}">Cancelar receita</button>` : '') : `<button class="btn btn-primary" data-action="go-dispatch" data-code="${esc(r.codigo_retirada)}">Dispensar ${icon('arrow')}</button>`) : ''}</div>`);
}
function successModal(code) {
  modal('Receita emitida', `<div class="success-body"><div class="success-mark">${icon('check')}</div><h2>Cuidado a caminho.</h2><p>A receita foi emitida. Compartilhe o código de retirada com seu paciente.</p><div class="success-code"><span>Código de retirada</span><strong>${esc(code)}</strong></div><div class="stack" style="gap:10px"><button class="btn btn-primary btn-block" data-action="copy" data-code="${esc(code)}">Copiar código ${icon('prescription')}</button><button class="btn btn-block" data-action="details" data-code="${esc(code)}">Ver receita ${icon('arrow')}</button></div></div>`);
}

function renderAuth() {
  const register = route() === 'cadastro';
  const quick = route() === 'consulta';
  const selected = profiles[state.authProfile];
  const draft = state.authDraft;
  $('#app').innerHTML = `<main class="auth-page" id="main" tabindex="-1"><section class="auth-story"><a href="#login" class="brand">${logo()}</a><div class="auth-story-content"><span class="eyebrow">TECNOLOGIA A SERVIÇO DO CUIDADO</span><h1>Conectando receitas.<br>Cuidando de pessoas.</h1><p>Do consultório à farmácia, cada profissional tem seu espaço para fazer o cuidado acontecer.</p><div class="auth-illustration"><div class="auth-float-card">${icon(selected.primaryIcon)}<strong>${state.authProfile === 'medico' ? 'Seu consultório conectado' : 'Sua farmácia conectada'}</strong><span></span><span></span></div><div class="auth-verified">${icon('shield')}O acesso certo para cada cuidado</div></div></div><div class="auth-story-foot">${icon('heart')}Feito para quem cuida de pessoas.</div></section><section class="auth-form-side"><div class="auth-box"><a href="#login" class="brand">${logo()}</a><div class="eyebrow">${quick ? 'CONSULTA DE RECEITA' : register ? 'CADASTRO PROFISSIONAL' : 'ACESSO PROFISSIONAL'}</div><h1>${quick ? 'Seu tratamento, por aqui.' : register ? 'Faça parte dessa conexão.' : 'Que bom ter você aqui.'}</h1><p>${quick ? 'Informe o código de retirada para visualizar sua receita.' : register ? 'Escolha seu perfil e cadastre suas credenciais profissionais.' : 'Selecione seu perfil para acessar seu espaço de trabalho.'}</p>
  ${!quick ? profileSelector(state.authProfile, 'auth-profile') + `<div class="profile-description">${icon(selected.primaryIcon)}<span>${state.authProfile === 'medico' ? 'Pacientes, emissão de receitas e acompanhamento das suas prescrições.' : 'Consulta de receitas, dispensação de medicamentos e gestão de estoque.'}</span></div>` : ''}
  ${quick ? `<form id="public-form">${formField('Código de retirada', 'code', '', 'required minlength="6" maxlength="6" pattern="[A-Za-z0-9]{6}" placeholder="Ex.: X7K2M9" style="text-transform:uppercase"')}<div class="error-message" id="auth-error" role="alert"></div><button type="submit" class="btn btn-primary btn-block">${icon('search')}Consultar receita</button></form>` : `<form id="auth-form" data-register="${register}" data-profile="${state.authProfile}">${register ? `${formField('Nome completo', 'nome', draft.nome, 'required minlength="3" maxlength="150" autocomplete="name" placeholder="Nome e sobrenome"')}${formField(`Registro profissional (${selected.registration}/UF)`, selected.registrationField, draft[selected.registrationField], `required minlength="2" maxlength="30" placeholder="Ex.: ${state.authProfile === 'medico' ? '123456' : '45109'}/SP"`)}` : ''}${formField('E-mail profissional', 'email', draft.email, 'required type="email" autocomplete="email" maxlength="150" placeholder="voce@exemplo.com.br"')}<div class="field"><label for="password">Senha de acesso</label><div class="password-wrap"><input name="senha" id="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" required ${register ? 'minlength="6"' : ''} maxlength="128" placeholder="${register ? 'No mínimo 6 caracteres' : 'Digite sua senha'}"><button class="icon-btn" type="button" data-action="password" aria-label="Mostrar senha">${icon('eye')}</button></div></div><div class="error-message" id="auth-error" role="alert"></div><button class="btn btn-primary btn-block" type="submit">${icon(register ? 'plus' : 'lock')}${register ? `Criar conta de ${selected.shortLabel.toLowerCase()}` : state.authProfile === 'medico' ? 'Acessar consultório' : 'Acessar farmácia'}${icon('arrow')}</button></form>`}
  <div class="auth-bottom">${quick ? `<a href="#login" class="btn btn-light btn-block">${icon('arrow', 'back-icon')}Voltar para o login</a>` : register ? 'Já tem uma conta? <a href="#login" class="text-btn">Entrar</a>' : 'Primeiro acesso? <a href="#cadastro" class="text-btn">Criar conta profissional</a>'}</div>${!quick ? '<a href="#consulta" class="auth-quick">Consultar uma receita por código →</a>' : ''}</div></section></main>`;
}

document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('#main')?.focus(); $('#main')?.scrollIntoView(); return; }
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const { action, id, code } = button.dataset;
  const medicalActions = ['patient', 'add-line', 'remove-line', 'cancel', 'cancel-confirm'];
  const pharmacyActions = ['medicine', 'notifications', 'qty', 'go-dispatch'];
  if ((medicalActions.includes(action) && !isDoctor()) || (pharmacyActions.includes(action) && isDoctor())) { toast('Esta ação não está disponível para seu perfil.', true); return; }
  if (action === 'close') { $('#modal').close(); return; }
  if (action === 'auth-profile') {
    if (!profiles[button.dataset.profile] || $('#auth-form button[type="submit"]')?.disabled) return;
    const form = $('#auth-form');
    if (form) for (const [key, value] of new FormData(form)) if (key !== 'senha') state.authDraft[key] = value;
    state.authProfile = button.dataset.profile; renderAuth(); return;
  }
  if (action === 'logout') { sessionStorage.removeItem(SESSION_KEY); state.api = createHttpApi(); state.user = null; state.data = { receitas: [], pacientes: [], medicamentos: [], retiradas: [] }; state.loaded = false; state.prescription = null; state.draft = { pacienteId: '', observacoes: '', itens: [{ medicamentoId: '', quantidade: 1, posologia: '' }] }; navigate('login'); return; }
  if (action === 'account') { modal('Minha conta', `<div class="patient-info">${avatar(state.user.nome)}<div><strong>${esc(state.user.nome)}</strong><small>${profile().label} · ${esc(userRegistration())}</small></div></div><div class="info-box">${icon('shield')}<span>Sua sessão está conectada à API do projeto. As alterações são registradas no banco de dados.</span></div><button class="btn btn-primary btn-block" data-action="logout">${icon('logout')}Sair da conta</button>`); return; }
  if (action === 'notifications') { const low = state.data.medicamentos.filter(m => m.estoque <= 10); modal('Alertas do estoque', low.length ? `<p>${low.length} medicamento(s) precisam de atenção.</p><div class="detail-list">${low.map(m => `<div class="between detail-item"><div><h3>${esc(m.nome)}</h3><p>${esc(m.dosagem)}</p></div><span class="badge ${m.estoque <= 2 ? 'critical' : 'low'}">${m.estoque} unidades</span></div>`).join('')}</div><a href="#estoque" class="btn btn-primary btn-block">Abrir estoque ${icon('arrow')}</a>` : '<p>Todos os medicamentos estão com o estoque regular.</p>'); return; }
  if (action === 'patient') { captureDraft(); patientModal(id); return; }
  if (action === 'medicine') { medicineModal(id); return; }
  if (action === 'filter') { state.filter = button.dataset.filter; state.page = 1; document.querySelectorAll('.chip').forEach(el => { const selected = el.dataset.filter === state.filter; el.classList.toggle('active', selected); el.setAttribute('aria-pressed', selected); }); updateList(); return; }
  if (action === 'page') { state.page = Number(button.dataset.page); updateList(); return; }
  if (action === 'retry') { state.loaded = false; render(); return; }
  if (action === 'add-line' || action === 'remove-line') {
    captureDraft();
    if (action === 'add-line') state.draft.itens.push({ medicamentoId: '', quantidade: 1, posologia: '' });
    else state.draft.itens.splice(Number(button.dataset.index), 1);
    $('#prescription-lines').innerHTML = prescriptionLines(); $('#summary-count').textContent = `${state.draft.itens.length} item(ns)`; return;
  }
  if (action === 'qty') { const input = $(`#dispatch-${id}`); input.value = Math.max(0, Math.min(Number(input.max), Number(input.value) + Number(button.dataset.delta))); return; }
  if (action === 'details') { await task(button, async () => detailsModal(await state.api.prescription(code))); return; }
  if (action === 'go-dispatch') { await task(button, async () => { state.prescription = await state.api.prescription(code); navigate('dispensar'); }); return; }
  if (action === 'cancel-confirm') {
    modal('Cancelar esta receita?', '<p>A receita deixará de estar disponível para novas retiradas. Confira o código antes de continuar.</p><div class="form-actions"><button class="btn" data-action="close">Voltar</button><button class="btn btn-danger" data-action="cancel" data-id="'+id+'">Confirmar cancelamento</button></div>'); return;
  }
  if (action === 'cancel') { await task(button, async () => { await state.api.cancel(id); await loadData(); state.prescription = null; await render(); toast('Receita cancelada.'); }); return; }
  if (action === 'copy') { await task(button, async () => { try { await navigator.clipboard.writeText(code); toast('Código copiado.'); } catch { toast(`Código de retirada: ${code}. Selecione-o para copiar.`, true); } }); return; }
  if (action === 'print') { window.print(); return; }
  if (action === 'password') { const input = $('#password'); const show = input.type === 'password'; input.type = show ? 'text' : 'password'; button.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha'); return; }
  if (action === 'export') {
    const rows = [['Código', 'Paciente', 'Emissão', 'Status', 'Prescritor'], ...filteredRecipes().map(r => [r.codigo_retirada, r.paciente_nome, date(r.data_emissao, { year: 'numeric' }), statuses[r.status], r.medico_nome])];
    const csv = '\uFEFF' + rows.map(row => row.map(v => `"${String(v ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); const link = document.createElement('a'); link.href = url; link.download = `integrasus-receitas-${new Date().toLocaleDateString('en-CA')}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Histórico exportado.');
  }
});
function updateList() { if ($('#list-results')) $('#list-results').innerHTML = ({ historico: historyResults, estoque: inventoryResults, pacientes: patientsResults })[route()](); }
document.addEventListener('input', event => {
  if (event.target.id === 'list-search') { state.query = event.target.value; state.page = 1; updateList(); }
  if (event.target.closest('#lookup-form') && state.prescription && event.target.value.trim().toUpperCase() !== state.prescription.codigo_retirada) {
    state.prescription = null;
    $('#dispatch-form').innerHTML = empty('Pronto para o próximo atendimento', 'Busque uma receita para consultar os medicamentos e registrar a retirada.');
  }
});
document.addEventListener('change', event => { if (event.target.id === 'patient-select') updatePatientSummary(); });

document.addEventListener('submit', async event => {
  const form = event.target; const forms = ['auth-form', 'public-form', 'patient-form', 'medicine-form', 'prescription-form', 'lookup-form', 'dispatch-form'];
  if (!forms.includes(form.id)) return;
  event.preventDefault(); const data = new FormData(form); const button = $('button[type="submit"]', form);
  if (form.id === 'auth-form') {
    await task(button, async () => {
      const body = Object.fromEntries(data); body.email = body.email.trim();
      const api = createHttpApi();
      const perfil = form.dataset.profile;
      if (form.dataset.register === 'true') await api.register(body, perfil);
      const authenticated = await api.login({ email: body.email, senha: body.senha }, perfil);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authenticated)); state.api = createHttpApi(authenticated.token); state.user = authenticated.usuario;
      state.authDraft = {};
      state.loaded = false; state.prescription = null; state.draft = { pacienteId: '', observacoes: '', itens: [{ medicamentoId: '', quantidade: 1, posologia: '' }] };
      navigate('inicio'); toast('Bem-vindo(a) ao IntegraSUS.');
    }, $('#auth-error')); return;
  }
  if (form.id === 'public-form') { await task(button, async () => { const r = await createHttpApi().prescription(data.get('code').trim().toUpperCase()); detailsModal(r, true); }, $('#auth-error')); return; }
  if (form.id === 'patient-form' || form.id === 'medicine-form') {
    const patient = form.id === 'patient-form';
    await task(button, async () => {
      const body = Object.fromEntries([...data].map(([k, v]) => [k, v.trim()]));
      if (patient) { body.cpf = body.cpf.replace(/\D/g, ''); if (body.cpf.length !== 11) throw new Error('Informe um CPF com 11 dígitos.'); }
      else { body.estoque = Number(body.estoque); if (!Number.isInteger(body.estoque) || body.estoque < 0) throw new Error('Informe uma quantidade inteira e positiva ou zero.'); }
      const resource = patient ? 'pacientes' : 'medicamentos';
      let created;
      if (form.dataset.id) await state.api.update(resource, form.dataset.id, body);
      else created = await state.api.create(resource, body);
      await loadData();
      if (patient && route() === 'receita' && created) state.draft.pacienteId = created.id;
      await render(); toast(patient ? 'Dados do paciente salvos.' : 'Medicamento salvo.');
    }, $(patient ? '#patient-error' : '#medicine-error')); return;
  }
  if (form.id === 'prescription-form') {
    captureDraft();
    await task(button, async () => {
      const ids = state.draft.itens.map(i => i.medicamentoId);
      if (new Set(ids).size !== ids.length) throw new Error('Há medicamentos repetidos. Agrupe a quantidade em um único item.');
      const body = { pacienteId: Number(state.draft.pacienteId), observacoes: state.draft.observacoes, itens: state.draft.itens.map(i => ({ ...i, medicamentoId: Number(i.medicamentoId) })) };
      const created = await state.api.create('receitas', body);
      state.draft = { pacienteId: '', observacoes: '', itens: [{ medicamentoId: '', quantidade: 1, posologia: '' }] };
      await loadData(); await render(); successModal(created.codigoRetirada);
    }, $('#prescription-error')); return;
  }
  if (form.id === 'lookup-form') {
    state.prescription = null;
    $('#dispatch-form').innerHTML = empty('Aguardando consulta', 'A receita será exibida quando o código for encontrado.');
    await task(button, async () => { state.prescription = await state.api.prescription(data.get('code').trim().toUpperCase()); $('#dispatch-form').innerHTML = dispatchDetails(state.prescription); }, $('#lookup-error')); return;
  }
  if (form.id === 'dispatch-form') {
    await task(button, async () => {
      const items = [...data].filter(([key]) => key.startsWith('item-')).map(([key, value]) => ({ receitaItemId: Number(key.slice(5)), quantidade: Number(value) })).filter(i => i.quantidade > 0);
      if (!items.length) throw new Error('Informe a quantidade de pelo menos um medicamento para registrar a retirada.');
      const result = await state.api.create('retiradas', { codigoRetirada: state.prescription.codigo_retirada, farmaceuticoNome: state.user.nome, itens: items });
      state.prescription = await state.api.prescription(state.prescription.codigo_retirada); await loadData(); await render();
      modal('Retirada registrada', `<div class="success-body"><div class="success-mark">${icon('check')}</div><h2>Entrega concluída.</h2><p>${items.reduce((n, i) => n + i.quantidade, 0)} unidade(s) dispensada(s). O estoque foi atualizado.</p><div style="margin:20px 0">${badge(result.status)}</div><button class="btn btn-primary btn-block" data-action="close">Continuar atendimento ${icon('arrow')}</button></div>`);
    }, $('#dispatch-error'));
  }
});

$('#modal').addEventListener('click', event => { if (event.target === $('#modal')) { const bounds = $('#modal').getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) $('#modal').close(); } });
window.addEventListener('hashchange', () => {
  state.query = ''; state.filter = route() === 'estoque' ? 'Todos' : 'Todas'; state.page = 1;
  render(); window.scrollTo({ top: 0 });
});
state.filter = route() === 'estoque' ? 'Todos' : 'Todas';
render();
