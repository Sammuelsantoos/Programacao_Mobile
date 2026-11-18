import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

test('migração preserva médicos e retiradas existentes e pode executar novamente', t => {
  const directory = mkdtempSync(join(tmpdir(), 'integrasus-migration-'));
  const filename = join(directory, 'legacy.db');
  t.after(() => { rmSync(filename, { force: true }); rmdirSync(directory); });
  const legacy = new Database(filename);
  legacy.exec(`
    CREATE TABLE medicos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL,
      crm TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, senha_hash TEXT NOT NULL,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO medicos (nome, crm, email, senha_hash)
      VALUES ('Médico anterior fictício', '100/SP', 'anterior@example.invalid', 'hash-preservado');
    CREATE TABLE retiradas (id INTEGER PRIMARY KEY AUTOINCREMENT, receita_id INTEGER NOT NULL,
      receita_item_id INTEGER NOT NULL, farmaceutico_nome TEXT, quantidade INTEGER NOT NULL,
      data_retirada TEXT DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO retiradas (receita_id, receita_item_id, farmaceutico_nome, quantidade)
      VALUES (1, 1, 'Responsável anterior fictício', 2);
  `);
  legacy.close();
  const uri = pathToFileURL(resolve('src/config/database.js')).href;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const first = (await import(${JSON.stringify(uri)})).default;
    const second = (await import(${JSON.stringify(uri + '?second-pass')})).default;
    const result = {
      medico: second.prepare('SELECT * FROM medicos WHERE id = 1').get(),
      retirada: second.prepare('SELECT * FROM retiradas WHERE id = 1').get(),
      columns: second.raw.pragma('table_info(retiradas)').filter(c => c.name === 'farmaceutico_id').length,
      farmaceuticos: second.prepare('SELECT count(*) AS total FROM farmaceuticos').get().total,
    };
    second.raw.close(); first.raw.close(); console.log(JSON.stringify(result));
  `], { env: { ...process.env, DATABASE_PATH: filename }, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.medico.nome, 'Médico anterior fictício');
  assert.equal(result.medico.senha_hash, 'hash-preservado');
  assert.equal(result.retirada.farmaceutico_nome, 'Responsável anterior fictício');
  assert.equal(result.retirada.quantidade, 2);
  assert.equal(result.retirada.farmaceutico_id, null);
  assert.equal(result.columns, 1);
  assert.equal(result.farmaceuticos, 0);
});
