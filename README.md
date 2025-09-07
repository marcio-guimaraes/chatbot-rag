# 🤖 Chatbot Inteligente com RAG e Groq

Este projeto implementa um **chatbot inteligente** utilizando **RAG (Retrieval-Augmented Generation)** e **Groq** para respostas rápidas e contextualizadas. Ele combina um backend robusto e um frontend amigável para interação com o usuário.

---

## ✨ Funcionalidades

- Interface web moderna com **React** e **TypeScript**
- **RAG**: Busca informações em uma base local (`data/conhecimento.txt`) para enriquecer respostas
- **Groq**: LLM de alta velocidade para respostas contextualizadas
- Backend e frontend desacoplados, rodando simultaneamente
- Atualização fácil da base de conhecimento

---

## 🛠️ Tecnologias Utilizadas

| Camada      | Tecnologias                                                                 |
|-------------|-----------------------------------------------------------------------------|
| **Backend** | Node.js, Express, LangChain.js, Groq, FAISS (em memória)                    |
| **Frontend**| React, TypeScript, Vite, SWC                                                |
| **Embeddings** | Hugging Face Inference API                                              |

---

## 🚀 Como Rodar o Projeto Localmente

### 📋 Pré-requisitos

1. **Configurar Chaves de API**

   Crie um arquivo `.env` na raiz do projeto com:

   ```env
   GROQ_API_KEY=gsk_SUA_CHAVE_DA_GROQ_AQUI
   HUGGINGFACE_API_KEY=hf_SUA_CHAVE_DO_HUGGING_FACE_AQUI
   ```

   **Como obter as chaves:**

   - **Groq:**  
     Acesse [console.groq.com/keys](https://console.groq.com/keys)  
     Clique em "+ Create API Key", nomeie e copie a chave gerada.

   - **Hugging Face:**  
     Acesse [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)  
     Clique em "+ New token", nomeie, selecione *write* e copie a chave (começa com `hf_...`).

2. **Instalar Dependências**

   - **Backend (raiz do projeto):**
     ```bash
     npm install --legacy-peer-deps
     ```
     > Usamos `--legacy-peer-deps` para evitar conflitos de versão do LangChain.

   - **Frontend:**
     ```bash
     cd src/frontend
     npm install
     ```

3. **Rodar a Aplicação**

   Abra dois terminais:

   - **Terminal 1 – Backend**
     ```bash
     cd chatbot-rag
     node src/backend/server.js
     ```
     Aguarde a mensagem:  
     `✅ Sistema RAG pronto e indexado!`  
     Deixe este terminal aberto.

   - **Terminal 2 – Frontend**
     ```bash
     cd src/frontend
     npm run dev
     ```
     O terminal mostrará a URL do frontend (geralmente `http://localhost:5173`).  
     Acesse no navegador.

4. **Adicionar ou Atualizar Conhecimento**

   - Edite o arquivo `data/conhecimento.txt` conforme desejar.
   - Salve o arquivo.
   - Reinicie o backend para reindexar:
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

- Backend e frontend devem rodar simultaneamente para o chatbot funcionar.
- Atualizações na base de conhecimento exigem reinício do backend.
- Certifique-se de que as chaves de API estão corretas e ativas.

---
