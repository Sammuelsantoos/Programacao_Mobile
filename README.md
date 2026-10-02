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

- **Semestre:** [2026.2]

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
```

**Fluxo da Requisição:**

```
Route ➡ Middleware (Auth/Validations) ➡️ Controller ➡️ Service (Business Logic) ➡️ Repository (DB Queries) ➡️ Model
```

---

## 🔌 5. Documentação dos Endpoints ⭐

### 5.1 URL Base

Se executando localmente, a API responderá por padrão na seguinte URL:

```plaintext
http://localhost:3000/api/v1
```

### 5.2 Cabeçalhos de Autenticação (Headers)

A maioria das rotas requer autenticação via token JWT. O token deve ser enviado no header `Authorization`.

```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5c..."
}
```

---

### 🟢 Autenticação

#### POST /auth/login

Autentica um usuário e retorna o Token de acesso.

**Request Body:**

```json
{
  "email": "admin@medcontrol.com",
  "senha": "password123"
}
```

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJI...",
  "usuario": {
    "id": 1,
    "nome": "Farmacêutico João",
    "email": "admin@medcontrol.com"
  }
}
```

---

### 👨‍⚕️ Médicos (/medicos)

#### GET /medicos

Lista todos os médicos cadastrados. *(Requer Auth)*

#### POST /medicos

Cadastra um novo médico. *(Requer Auth)*

**Request Body:**

```json
{
  "nome": "Dra. Ana Silva",
  "crm": "123456-CE",
  "especialidade": "Cardiologia"
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "nome": "Dra. Ana Silva",
  "crm": "123456-CE",
  "especialidade": "Cardiologia",
  "createdAt": "2025-05-10T10:00:00Z"
}
```

---

### 🏥 Pacientes (/pacientes)

#### GET /pacientes | GET /pacientes/:id

Busca lista de pacientes ou um paciente específico.

#### POST /pacientes

Cadastra novo paciente.

**Request Body:**

```json
{
  "nome": "Carlos Mendes",
  "cpf": "111.222.333-44",
  "dataNascimento": "1980-05-15",
  "telefone": "(88) 99999-9999"
}
```

---

### 💊 Medicamentos (/medicamentos)

#### GET /medicamentos

Lista o catálogo de medicamentos disponíveis.

#### POST /medicamentos

**Request Body:**

```json
{
  "nome": "Losartana Potássica",
  "dosagem": "50mg",
  "fabricante": "Neo Química",
  "quantidadeEstoque": 500
}
```

---

### 📝 Receitas (/receitas)

#### POST /receitas

Cria uma nova receita médica vinculando Médico, Paciente e os Medicamentos.

**Request Body:**

```json
{
  "pacienteId": 1,
  "medicoId": 2,
  "dataEmissao": "2025-05-10",
  "validadeDias": 30,
  "itens": [
    {
      "medicamentoId": 1,
      "quantidadePrescrita": 2,
      "posologia": "Tomar 1 comprimido a cada 12 horas."
    }
  ]
}
```

**Response (201 Created):** Retorna o objeto da receita gerada com ID.

---

### 📦 Retiradas (/retiradas)

#### POST /retiradas

Registra a dispensação/retirada de um medicamento por um paciente com base numa receita válida.

**Request Body:**

```json
{
  "receitaId": 10,
  "pacienteId": 1,
  "dataRetirada": "2025-05-11",
  "itensRetirados": [
    {
      "medicamentoId": 1,
      "quantidadeRetirada": 2
    }
  ]
}
```

---

## 🚀 6. Como Executar o Projeto

Você pode rodar a API de duas formas: nativamente usando **Node.js** ou via **Docker**.

### Pré-requisitos

- **Node.js** (v18+) e **NPM** **OU** **Docker** e **Docker Compose**.
- Clonar este repositório.

---

### Opção A: Executando localmente (Node.js)

**1. Instale as dependências:**

```bash
npm install
```

**2. Crie seu arquivo de ambiente copiando o template:**

```bash
cp .env.example .env
```

> **💡 Dica:** Edite o `.env` caso precise ajustar portas ou o secret do JWT.

**3. Execute as migrações/criação do banco de dados** (o SQLite irá gerar o arquivo `sistema.db` na raiz):

```bash
npm run db:migrate # ou comando equivalente configurado em seu package.json
```

**4. Inicie o servidor:**

```bash
npm run dev
```

A API estará rodando em **http://localhost:3000**

---

### Opção B: Executando com Docker 🐳

Esta é a maneira mais fácil, garantindo que o ambiente seja idêntico ao de desenvolvimento.

**1.** Garanta que o Docker esteja rodando na sua máquina.

**2.** Na raiz do projeto, execute:

```bash
docker-compose up -d --build
```

**3.** A API estará exposta na porta definida no seu `compose.yaml` (geralmente porta 3000).

**4.** Para visualizar os logs:

```bash
docker-compose logs -f
```

---

## 📚 7. Referências

- [Documentação oficial do Node.js](https://nodejs.org/docs/)
- [Documentação oficial do Express](https://expressjs.com/)
- [Documentação oficial do Sequelize](https://sequelize.org/)
- [Documentação oficial do JWT](https://jwt.io/)
- [Documentação oficial do Docker](https://docs.docker.com/)


---
