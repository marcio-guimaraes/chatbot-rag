# 🤖 Chatbot Inteligente com RAG e Groq

Este projeto implementa um **chatbot inteligente** utilizando **RAG (Retrieval-Augmented Generation)** e **Groq** para respostas rápidas e contextualizadas. Ele combina um backend robusto e um frontend amigável para interação com o usuário.

---

## ✨ Funcionalidades

* Interface web moderna com **React** e **TypeScript**
* **RAG**: Busca informações em uma base local (`data/conhecimento.txt`) para enriquecer respostas
* **Groq**: LLM de alta velocidade para respostas contextualizadas
* Backend e frontend desacoplados, rodando simultaneamente
* Atualização fácil da base de conhecimento

---

## 🛠️ Tecnologias Utilizadas

| Camada         | Tecnologias                                              |
| -------------- | -------------------------------------------------------- |
| **Backend**    | Node.js, Express, LangChain.js, Groq, FAISS (em memória) |
| **Frontend**   | React, TypeScript, Vite, SWC                             |
| **Embeddings** | Hugging Face Inference API                               |

---

## 🚀 Como Rodar o Projeto Localmente

### 📋 Pré-requisitos

* **Node.js** ≥ 20 → [Download Node.js](https://nodejs.org/)
  Verifique a versão:

  ```bash
  node -v
  ```

* **Git** → [Download Git](https://git-scm.com/)

---

### 1️⃣ Clonar o Repositório

```bash
git clone https://github.com/marcio-guimaraes/chatbot-rag.git
cd chatbot-rag
```

---

### 2️⃣ Configurar Chaves de API

Crie um arquivo `.env` na raiz do projeto com:

```env
GROQ_API_KEY=gsk_SUA_CHAVE_DA_GROQ_AQUI
HUGGINGFACE_API_KEY=hf_SUA_CHAVE_DO_HUGGING_FACE_AQUI
```

**Como obter as chaves:**

* **Groq:**
  [console.groq.com/keys](https://console.groq.com/keys) → "+ Create API Key" → nomeie → copie a chave.

* **Hugging Face:**
  [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → "+ New token" → nomeie → role *write* → copie a chave (`hf_...`).

---

### 3️⃣ Instalar e Rodar o Backend

* **Instalar dependências do backend:**

```bash
npm install --legacy-peer-deps
```

> ⚠️ Usamos `--legacy-peer-deps` para evitar conflitos de versão do LangChain.

* **Rodar backend:**

```bash
node src/backend/server.js
```

Aguarde:
`✅ Sistema RAG pronto e indexado!`
Deixe este terminal aberto.

---

### 4️⃣ Instalar e Rodar o Frontend

Abra um **novo terminal**:

* **Instalar dependências do frontend:**

```bash
cd src/frontend
npm install
```

* **Rodar frontend:**

```bash
npm run dev
```

O terminal mostrará a URL do frontend (geralmente `http://localhost:5173`).
Acesse no navegador.

---

### 5️⃣ Adicionar ou Atualizar Conhecimento

* Edite o arquivo `data/conhecimento.txt`.
* Salve o arquivo.
* Reinicie o backend para reindexar:

```bash
node src/backend/server.js
```

---

## 📄 Estrutura do Projeto

```plaintext
chatbot-rag/
├─ data/
│  └─ conhecimento.txt     # Base de conhecimento
├─ src/
│  ├─ backend/
│  │  └─ server.js         # Backend Node.js + RAG
│  └─ frontend/            # Frontend React + Vite
├─ .env                    # Chaves de API
└─ README.md
```

---

## ✅ Observações

* Backend e frontend devem rodar simultaneamente para o chatbot funcionar.
* Atualizações na base de conhecimento exigem reinício do backend.
* Certifique-se de que as chaves de API estão corretas e ativas.
