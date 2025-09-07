// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// --- Importações das Bibliotecas ---
const express = require('express');
const cors = require('cors');
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { ChatGroq } = require("@langchain/groq");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { createStuffDocumentsChain } = require("langchain/chains/combine_documents");
const { createRetrievalChain } = require("langchain/chains/retrieval");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");

// --- Inicializações ---
const app = express();
app.use(cors()); 
const PORT = 3000;

const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant",
});

const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2",
});

// --- Lógica Principal do RAG ---
let retrievalChain;

async function setupRAG() {
    const loader = new TextLoader("data/conhecimento.txt");
    const docs = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 50,
    });
    const splitDocs = await textSplitter.splitDocuments(docs);

    const vectorstore = await FaissStore.fromDocuments(splitDocs, embeddings);
    const retriever = vectorstore.asRetriever();

    const prompt = ChatPromptTemplate.fromTemplate(`
        Você é um assistente prestativo. Responda a pergunta do usuário baseado apenas no contexto fornecido.
        Se a informação não estiver no contexto, diga que você não sabe a resposta.

        Contexto:
        {context}

        Pergunta:
        {input}
    `);

    const combineDocsChain = await createStuffDocumentsChain({
        llm: model,
        prompt: prompt,
        outputParser: new StringOutputParser(),
    });

    retrievalChain = await createRetrievalChain({
        retriever,
        combineDocsChain,
    });

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

    if (!retrievalChain) {
        return res.status(503).json({ error: "O sistema RAG ainda não está pronto. Tente novamente em alguns instantes." });
    }

    try {
        console.log(`Recebida a pergunta: ${userQuestion}`);
        const result = await retrievalChain.invoke({ input: userQuestion });
        console.log("Resposta gerada:", result.answer);
        res.json({ answer: result.answer });
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
    app.listen(PORT, () => {
        console.log(`Servidor pronto e rodando na porta ${PORT}`);
    });
}

// Chama a função para iniciar tudo na ordem correta
startServer();