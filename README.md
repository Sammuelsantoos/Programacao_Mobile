# 💊 MedControl API

<div align="center">
  
  ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
  ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
  ![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
  ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
  ![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
  ![Version](https://img.shields.io/badge/Version-1.0.0-success?style=for-the-badge)

  **O motor backend para gestão de prescrições médicas e dispensação de medicamentos.**
</div>

<br>

## 📡 1. Sobre a API

A **MedControl API** é uma interface RESTful desenvolvida para gerenciar o fluxo completo de receituários médicos, desde o cadastro do paciente e do médico prescritor, até a retirada do medicamento na farmácia. 

**Motivação e Problema que resolve:** 
O projeto visa resolver o problema de controle de estoque e rastreabilidade de receitas (frequentemente perdidas em papel), garantindo que medicamentos controlados ou de uso contínuo sejam dispensados corretamente para os pacientes certos.

**App Mobile Consumidor (Proposto):** 
Esta API não possui um frontend desenvolvido. Ela foi projetada para se conectar a um **suposto aplicativo mobile** (que pode vir a ser construído futuramente em tecnologias como Flutter, React Native ou Kotlin). O objetivo da API é fornecer todo o suporte e os endpoints necessários para que esse futuro app permita aos farmacêuticos registrarem retiradas via leitura de dados e aos médicos emitirem receitas digitais.

**Contexto Acadêmico:**
Projeto prático desenvolvido como requisito avaliativo da disciplina de **Desenvolvimento Mobile**, do curso de Engenharia de Software da **Universidade Federal do Ceará (UFC) - Campus Quixadá**. O objetivo principal é consolidar conhecimentos em arquitetura cliente-servidor, APIs REST, JWT e conteinerização.

* **Semestre:** [2026.2]

---

## ✨ 2. Funcionalidades

A API foi modularizada para atender as seguintes regras de negócio:

### 🔐 Autenticação & Segurança
- [x] **Login de Usuários:** Autenticação via credenciais retornando token JWT.
- [x] **Proteção de Rotas:** Middlewares de autorização para restringir acessos a usuários logados.

### 📋 CRUD Base
- [x] **Gestão de Médicos:** Cadastro, listagem, atualização e inativação (CRM e especialidade).
- [x] **Gestão de Pacientes:** Cadastro completo com dados demográficos e histórico.
- [x] **Gestão de Medicamentos:** Controle de catálogo, dosagens e estoque.

### 💼 Regras de Negócio Core
- [x] **Emissão de Receitas:** Criação de receitas médicas vinculando Médico, Paciente e múltiplos Itens de Receita (`ReceitaItem`).
- [x] **Registro de Retiradas:** Controle de dispensação (`Retirada`), validando se a receita está no prazo e abatendo a quantidade do receituário.

### 🛠 Recursos Extras
- [x] Tratamento centralizado de erros (`errorHandler`).
- [x] Injeção de dependências (`container.js`).
- [x] Suporte a Docker (Dockerfile e Compose incluídos).

---

## 🛠️ 3. Tecnologias Utilizadas

| Tecnologia / Ferramenta | Versão | Finalidade |
| :--- | :--- | :--- |
| **Node.js** | `v18+` | Ambiente de execução JavaScript (Backend). |
| **Express** | `^4.18.x` | Framework web para roteamento e middlewares. |
| **SQLite** | `^3.x` | Banco de dados relacional leve (arquivo local `sistema.db`). |
| **Sequelize** | `^6.x` | ORM para modelagem do banco e queries estruturadas. |
| **JSON Web Token (JWT)**| `^9.x` | Geração de tokens de acesso para autenticação stateless. |
| **Bcryptjs** | `^2.4.x` | Criptografia de senhas (hash) no banco de dados. |
| **Docker / Compose** | `v24+` | Conteinerização da aplicação para padronização de ambiente. |

---

## 📐 4. Arquitetura do Projeto

O projeto adota uma arquitetura em **Camadas (Layered Architecture)** aliada ao padrão **Repository Pattern** para desacoplar a lógica de negócio do acesso a dados.

```text
src/
├── app.js                 # Configuração do Express (Middlewares globais)
├── server.js              # Entrypoint da aplicação (Inicialização do servidor)
├── container.js           # Container de Injeção de Dependências
├── config/                # Variáveis de ambiente e config do banco de dados
├── controllers/           # Lida com requisições HTTP e envia respostas
├── middlewares/           # Interceptadores (auth.js, errorHandler.js)
├── models/                # Definição dos Schemas/Entidades do BD (Sequelize)
├── repositories/          # Lógica de acesso ao banco (BaseRepository, etc)
├── routes/                # Definição das rotas e mapeamento para os controllers
├── services/              # Regras de negócio estritas da aplicação
└── utils/                 # Funções auxiliares, formatação e classes de erro
