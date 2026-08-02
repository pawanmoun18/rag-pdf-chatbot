import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import Groq from "groq-sdk";
import multer from "multer";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import * as cheerio from "cheerio";
import axios from "axios";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const upload = multer({ dest: "uploads/" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2",
});

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// ✅ Ping route
app.get("/ping", (req, res) => {
    res.json({ status: "awake" });
});

// ✅ Helper — chunk and index any text
async function indexText(text, source, sessionId) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const docs = [new Document({ 
        pageContent: text, 
        metadata: { source } 
    })];

    const chunks = await splitter.splitDocuments(docs);

    await PineconeStore.fromDocuments(chunks, embeddings, {
        pineconeIndex: index,
        namespace: sessionId,
    });

    return chunks.length;
}

// ✅ Route 1 — Upload PDF
app.post("/upload", upload.array("pdf", 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        const sessionId = Date.now().toString();
        let allDocs = [];

        for (const file of req.files) {
            const loader = new PDFLoader(file.path);
            const docs = await loader.load();
            allDocs = allDocs.concat(docs);
            fs.unlinkSync(file.path);
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const chunks = await splitter.splitDocuments(allDocs);

        await PineconeStore.fromDocuments(chunks, embeddings, {
            pineconeIndex: index,
            namespace: sessionId,
        });

        res.json({ 
            message: `✅ ${req.files.length} PDF(s) indexed successfully! ${chunks.length} chunks uploaded.`,
            sessionId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to index PDF" });
    }
});

// ✅ Route 2 — Upload Raw Text
app.post("/upload-text", async (req, res) => {
    try {
        const { text, sessionId: existingSessionId } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: "Text is required" });
        }

        const sessionId = existingSessionId || Date.now().toString();
        const chunkCount = await indexText(text, "pasted-text", sessionId);

        res.json({
            message: `✅ Text indexed successfully! ${chunkCount} chunks uploaded.`,
            sessionId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to index text" });
    }
});

// ✅ Route 3 — Upload Website URL
app.post("/upload-url", async (req, res) => {
    try {
        const { url, sessionId: existingSessionId } = req.body;

        if (!url || url.trim().length === 0) {
            return res.status(400).json({ error: "URL is required" });
        }

        console.log(`🌐 Scraping: ${url}`);

        // Scrape website
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; RAGBot/1.0)"
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);

        // Remove script, style, nav, footer tags
        $("script, style, nav, footer, header, iframe").remove();

        // Extract clean text
        const text = $("body").text()
            .replace(/\s+/g, " ")
            .trim();

        if (text.length < 100) {
            return res.status(400).json({ error: "Could not extract enough text from this URL" });
        }

        const sessionId = existingSessionId || Date.now().toString();
        const chunkCount = await indexText(text, url, sessionId);

        res.json({
            message: `✅ Website indexed successfully! ${chunkCount} chunks from ${url}`,
            sessionId
        });

    } catch (err) {
        console.error(err);
        if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
            return res.status(400).json({ error: "Could not reach this URL. Make sure it's accessible." });
        }
        res.status(500).json({ error: "Failed to scrape website" });
    }
});

// ✅ Route 4 — Query
app.post("/query", async (req, res) => {
    try {
        const { question, sessionId } = req.body;

        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        if (!sessionId) {
            return res.status(400).json({ error: "Please upload a PDF, text, or URL first." });
        }

        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex: index,
            namespace: sessionId,
        });

        const docs = await vectorStore.similaritySearch(question, 5);

        if (docs.length === 0) {
            return res.json({ 
                answer: "I could not find any relevant information in the uploaded content.", 
                sources: [] 
            });
        }

        const context = docs.map(d => d.pageContent).join("\n\n");

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant. Answer the user's question based ONLY on the context provided below. If the answer is not in the context, say "I could not find this information in the provided content."
                    
Context:
${context}`
                },
                {
                    role: "user",
                    content: question
                }
            ]
        });

        const answer = completion.choices[0].message.content;

        const sources = docs.map((d, i) => ({
            id: i + 1,
            text: d.pageContent.substring(0, 150) + "...",
            source: d.metadata?.source || "Unknown",
            page: d.metadata?.loc?.pageNumber || "N/A"
        }));

        res.json({ answer, sources });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
});