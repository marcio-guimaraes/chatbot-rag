// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// --- Importações das Bibliotecas ---
const express = require('express');
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");

// --- Inicializações ---
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1'; // acessível apenas localmente na VPS (ex: pelo truco-backend)

const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2",
});

// A geração final é feita chamando a API da Groq direto com o fetch nativo do
// Node, em vez de passar pelo ChatGroq/@langchain/groq. A versão do groq-sdk
// que o @langchain/groq usa por baixo (toda a linha 0.x) depende do
// node-fetch@2, que tem um bug conhecido de "Premature close" ao descomprimir
// respostas gzip em Node 20+/22 — as chamadas travavam e nunca respondiam.
// Subir pra @langchain/groq 1.x corrigiria isso, mas exige subir junto
// langchain, @langchain/community e @langchain/core pra suas linhas 1.x
// (mudança bem maior). Essa chamada direta evita o bug com uma mudança pequena.
async function gerarResposta(pergunta, contexto) {
    const promptText = `Você é um assistente prestativo. Responda a pergunta do usuário baseado apenas no contexto fornecido.
Se a informação não estiver no contexto, diga que você não sabe a resposta.

Contexto:
${contexto}

Pergunta:
${pergunta}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: promptText }],
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Groq respondeu ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } finally {
        clearTimeout(timeout);
    }
}

// --- Lógica Principal do RAG ---
let retriever;

async function setupRAG() {
    const loader = new TextLoader("data/conhecimento.txt");
    const docs = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 50,
    });
    const splitDocs = await textSplitter.splitDocuments(docs);

    const vectorstore = await FaissStore.fromDocuments(splitDocs, embeddings);
    retriever = vectorstore.asRetriever();

    console.log("✅ Sistema RAG pronto e indexado!");
}

// --- Rotas da API ---
app.get('/', (req, res) => {
    res.send('Servidor do Chatbot RAG está no ar!');
});

app.get('/chat', async (req, res) => {
    const userQuestion = req.query.question;

    if (!userQuestion) {
        return res.status(400).json({ error: "A pergunta é obrigatória. Use o formato: /chat?question=SuaPergunta" });
    }

    if (!retriever) {
        return res.status(503).json({ error: "O sistema RAG ainda não está pronto. Tente novamente em alguns instantes." });
    }

    try {
        console.log(`Recebida a pergunta: ${userQuestion}`);
        const docsRelevantes = await retriever.invoke(userQuestion);
        const contexto = docsRelevantes.map((doc) => doc.pageContent).join("\n\n");
        const answer = await gerarResposta(userQuestion, contexto);
        console.log("Resposta gerada:", answer);
        res.json({ answer });
    } catch (error) {
        console.error("Erro ao processar a pergunta:", error);
        res.status(500).json({ error: "Falha ao gerar a resposta." });
    }
});

// --- Inicia o Servidor ---
async function startServer() {
    console.log("Iniciando o sistema RAG... Isso pode levar alguns segundos.");
    // 1. Espera o RAG ficar pronto
    await setupRAG();
    
    // 2. SÓ ENTÃO, inicia o servidor
    app.listen(PORT, HOST, () => {
        console.log(`Servidor pronto e rodando em http://${HOST}:${PORT}`);
    });
}

// Chama a função para iniciar tudo na ordem correta
startServer();