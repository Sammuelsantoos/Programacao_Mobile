# API Programação Mobile

<p align="center">
  <b>API REST desenvolvida em Node.js com arquitetura em camadas para a atividade acadêmica da disciplina de Programação Mobile.</b>
</p>

<p align="center">
  <code>Node.js</code> &bull; <code>Express</code> &bull; <code>PostgreSQL</code> &bull; <code>JWT</code> &bull; <code>JavaScript</code>
</p>

---

## 📌 Sobre o Projeto

Este projeto consiste em uma API backend desenvolvida como atividade prática para a faculdade. O sistema implementa o gerenciamento de usuários, autenticação baseada em tokens JWT e persistência de dados em banco relacional.

---

## 🚀 Tecnologias Utilizadas

* **Node.js**
* **Express**
* **PostgreSQL**
* **JWT (JSON Web Token)**

---

## 📂 Estrutura do Projeto

A organização dos diretórios do projeto reflete exatamente os módulos implementados:

```text
src/
├── config/         # Configurações de banco de dados e ambiente (database.js, env.js)[cite: 1]
├── controllers/    # Controladores de usuário (usuario.controller.js)[cite: 1]
├── middlewares/    # Interceptadores de autenticação e tratamento de erros (auth.middleware.js, error.middleware.js)[cite: 1]
├── models/         # Modelos de dados (usuario.model.js)[cite: 1]
├── repositories/   # Camada de dados (usuario.repository.js)[cite: 1]
├── routes/         # Definição e agrupamento de rotas (index.js, usuario.routes.js)[cite: 1]
├── services/       # Regras de negócio (usuario.service.js)[cite: 1]
├── utils/          # Tratamento de erros customizados (AppError.js)[cite: 1]
├── app.js          # Configuração do Express[cite: 1]
└── server.js       # Inicialização do servidor[cite: 1]
