# ⚡ PROGRAMAÇÃO MOBILE API ⚡

<p align="center">
  <b>Uma arquitetura de backend de nível empresarial, altamente modular, robusta e desenvolvida sob medida para ecossistemas mobile de alta performance.</b>
</p>

<p align="center">
  <code>Node.js</code> &bull; <code>Express</code> &bull; <code>PostgreSQL</code> &bull; <code>JWT Authentication</code> &bull; <code>Layered Architecture</code>
</p>

---

## 💎 Visão Geral do Projeto

Este repositório abriga o núcleo de serviços e regras de negócio para aplicações mobile modernas. O projeto foi meticulosamente desenhado priorizando **escalabilidade**, **segurança de ponta a ponta**, **tratamento preditivo de falhas** e uma **separação estrita de responsabilidades (SoC)** através de uma arquitetura em camadas bem delimitada.

---

## 🛠️ Stack Tecnológica & Ecossistema

O projeto integra tecnologias modernas e consolidadas no desenvolvimento backend contemporâneo:

* **Ambiente de Execução:** `Node.js` (Runtime assíncrono orientado a eventos de altíssima performance)
* **Framework Web:** `Express` (Gerenciamento de rotas minimalista, flexível e altamente extensível)
* **Persistência de Dados:** `PostgreSQL` (Banco de dados relacional robusto para integridade transacional complexa)[cite: 1]
* **Segurança & Sessões:** `JSON Web Token (JWT)` (Autenticação stateful/stateless segura para clientes mobile)[cite: 1]

---

## 📐 Arquitetura & Estrutura de Diretórios

A base de código segue rigorosamente os princípios de Clean Code e Domain-Driven design patterns voltados a serviços web. Cada diretório possui uma responsabilidade única e isolada[cite: 1]:

```text
src/
├── 📂 config/         # Configurações globais (Conexão com banco de dados, variáveis de ambiente)
├── 📂 controllers/    # Camada de Apresentação (Gerencia requisições HTTP, status codes e respostas)
├── 📂 middlewares/    # Interceptadores de ciclo de vida (Guardas de autenticação JWT e tratamento global de erros)
├── 📂 models/         # Definições estruturais de dados e mapeamento relacional
├── 📂 repositories/   # Camada de Persistência (Consultas SQL diretas e abstração de acesso ao banco)
├── 📂 routes/         # Roteadores modulares para mapeamento de endpoints da API
├── 📂 services/       # Camada de Regra de Negócio (Lógica pura isolada de frameworks e protocolos)
├── 📂 utils/          # Classes utilitárias e gerador de erros operacionais personalizados (AppError)
├── 📄 app.js          # Configuração centralizada do Express, middlewares globais e rotas principais
└── 📄 server.js       # Inicializador do processo de escuta e bootstrap do servidor Node.js
