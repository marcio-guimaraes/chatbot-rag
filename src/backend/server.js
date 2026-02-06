require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { createStuffDocumentsChain } = require("langchain/chains/combine_documents");
const { createRetrievalChain } = require("langchain/chains/retrieval");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { TextLoader } = require("langchain/document_loaders/fs/text");

const app = express();
app.use(cors());
const PORT = 3000;

const model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-3-flash-preview",
    temperature: 0
});

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-embedding-001"
});

let retrievalChain;

async function setupRAG() {
    const loader = new TextLoader("data/conhecimento.txt");
    const docs = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 50,
    });
    const splitDocs = await textSplitter.splitDocuments(docs);

    const vectorstore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
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

app.get('/', (req, res) => {
    res.send('Servidor do Chatbot RAG está no ar!');
});

app.get('/chat', async (req, res) => {
    const userQuestion = req.query.question;

    if (!userQuestion) {
        return res.status(400).json({ error: "A pergunta é obrigatória." });
    }

    if (!retrievalChain) {
        return res.status(503).json({ error: "O sistema RAG ainda não está pronto." });
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

async function startServer() {
    console.log("Iniciando o sistema RAG...");
    await setupRAG();
    
    app.listen(PORT, () => {
        console.log(`Servidor pronto e rodando na porta ${PORT}`);
    });
}

startServer();