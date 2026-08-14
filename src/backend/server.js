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

// Instruções de tom/estilo e casos especiais de conversa. Isso é sempre
// incluído no prompt, ao contrário do conhecimento.txt (que só entra via
// retrieval). Antes esse texto vivia dentro de conhecimento.txt e disputava
// espaço nos top-k chunks do FAISS contra o conteúdo factual das regras,
// então perguntas vagas ("como assim?") às vezes recuperavam só pedaços de
// instrução de tom e nenhuma regra de fato — e o modelo inventava o resto.
const SYSTEM_INSTRUCTIONS = `Você é um assistente que só sabe conversar sobre as regras do Truco Piauiense.
Responda a pergunta do usuário baseado ESTRITAMENTE no contexto fornecido abaixo. Nunca use conhecimento
prévio sobre outras variações de truco (ex: não existe "envido" no Truco Piauiense — não mencione isso).
Se a informação não estiver no contexto, diga claramente que não sabe, sem inventar ou completar com suposições.
Não precisa começar as frases com "De acordo com o contexto fornecido" ou frases do tipo.

Estilo e tom:
- Responda de forma educada, amigável e natural, como se estivesse conversando com um amigo que quer aprender Truco.
- Use frases simples, diretas e acolhedoras. Evite parecer muito formal ou "engessado".

Casos especiais:
- Saudações simples ("oi", "olá", "bom dia"): responda de forma simpática e curta.
- Pergunta pouco clara: seja gentil e sugira o que ele pode perguntar (ordem das cartas, pontuação, blefe etc.).
- Pergunta fora do tema Truco: responda com simpatia, mas avise que só sabe falar sobre Truco Piauiense.
- Usuário engraçado/descontraído: entre na brincadeira de leve, mas puxe de volta pro tema.
- Pedido de explicação detalhada: explique com calma e, se for longo, use tópicos.
- Agradecimento ("valeu", "obrigado"): responda de forma curta e simpática.`;

// A geração final é feita chamando a API da Groq direto com o fetch nativo do
// Node, em vez de passar pelo ChatGroq/@langchain/groq. A versão do groq-sdk
// que o @langchain/groq usa por baixo (toda a linha 0.x) depende do
// node-fetch@2, que tem um bug conhecido de "Premature close" ao descomprimir
// respostas gzip em Node 20+/22 — as chamadas travavam e nunca respondiam.
// Subir pra @langchain/groq 1.x corrigiria isso, mas exige subir junto
// langchain, @langchain/community e @langchain/core pra suas linhas 1.x
// (mudança bem maior). Essa chamada direta evita o bug com uma mudança pequena.
async function gerarResposta(pergunta, contexto) {
    const promptText = `${SYSTEM_INSTRUCTIONS}

Contexto sobre as regras do Truco Piauiense:
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
                model: "openai/gpt-oss-20b",
                messages: [{ role: "user", content: promptText }],
                // temperature 0: o modelo estava, de forma intermitente, ignorando o
                // contexto e completando lacunas com conhecimento pré-treinado de
                // "Truco" genérico (ex: baralho de 40 cartas, "envido") mesmo com o
                // contexto correto e instrução explícita contra isso. Baixar a
                // temperatura elimina essa variância e o mantém preso ao contexto.
                temperature: 0,
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

    // Prioriza quebrar nos separadores de seção do conhecimento.txt
    // (ex: "Estrutura do Jogo", "Pontuação") antes de cair em quebras
    // genéricas, pra cada chunk carregar uma seção de regra inteira em vez
    // de um pedaço picado dela.
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 100,
        separators: ["\n-------------------------------------\n", "\n\n", "\n", " ", ""],
    });
    const splitDocs = await textSplitter.splitDocuments(docs);

    const vectorstore = await FaissStore.fromDocuments(splitDocs, embeddings);
    retriever = vectorstore.asRetriever({ k: 6 });

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