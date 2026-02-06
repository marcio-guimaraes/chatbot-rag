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
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
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
    const loader = new DirectoryLoader(
        "data",
        {
            ".pdf": (path) => new PDFLoader(path),
            ".txt": (path) => new TextLoader(path),
        }
    );

    const docs = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100,
    });
    
    const splitDocs = await textSplitter.splitDocuments(docs);

    const vectorstore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
    const retriever = vectorstore.asRetriever();

        const prompt = ChatPromptTemplate.fromTemplate(`
        Você é um assistente especializado em assuntos burocráticos, administrativos e de documentação da Universidade de Brasília (UnB).

        Seu papel é ajudar o usuário com informações sobre:
        - matrícula, trancamento e desligamento
        - estágios, bolsas e auxílios
        - documentos acadêmicos (histórico, declaração, atestado, etc.)
        - sistemas institucionais (SIGAA, SEI, SSO, etc.)
        - editais, prazos e procedimentos administrativos
        - normas e rotinas acadêmicas da UnB

        Responda **exclusivamente** com base no contexto fornecido.
        Se a resposta não estiver explicitamente no contexto, diga claramente que você não sabe a resposta com base nas informações disponíveis.

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

    console.log("✅ Sistema RAG atualizado: PDFs e TXTs indexados!");
}

app.get('/', (req, res) => {
    res.send('Servidor do Chatbot RAG (PDF Ready) está no ar!');
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
        const result = await retrievalChain.invoke({ input: userQuestion });
        res.json({ answer: result.answer });
    } catch (error) {
        console.error("Erro:", error);
        res.status(500).json({ error: "Falha ao gerar a resposta." });
    }
});

async function startServer() {
    await setupRAG();
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}

startServer();