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
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Multer for multiple PDF uploads
const upload = multer({ dest: "uploads/" });

// Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Embeddings
const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2",
});

// Pinecone
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// ✅ Upload + Index Multiple PDFs
app.post("/upload", upload.array("pdf", 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        let allDocs = [];

        for (const file of req.files) {
            const loader = new PDFLoader(file.path);
            const docs = await loader.load();
            allDocs = allDocs.concat(docs);
            fs.unlinkSync(file.path); // delete temp file after loading
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const chunks = await splitter.splitDocuments(allDocs);

        await PineconeStore.fromDocuments(chunks, embeddings, {
            pineconeIndex: index,
        });

        res.json({ 
            message: `✅ ${req.files.length} PDF(s) indexed successfully! ${chunks.length} chunks uploaded.` 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to index PDF" });
    }
});

// ✅ Query Route
app.post("/query", async (req, res) => {
    try {
        const question = req.body.question;

        if (!question) {
            return res.status(400).json({ error: "Question is required" });
        }

        // Retrieve top 5 chunks from Pinecone
        const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex: index,
        });

        const docs = await vectorStore.similaritySearch(question, 5);

        if (docs.length === 0) {
            return res.json({ 
                answer: "I could not find any relevant information in the uploaded PDFs.", 
                sources: [] 
            });
        }

        // Build context
        const context = docs.map(d => d.pageContent).join("\n\n");

        // Send to Groq LLM
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful assistant. Answer the user's question based ONLY on the context provided below. If the answer is not in the context, say "I could not find this information in the provided PDF."
                    
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

        // Sources
        const sources = docs.map((d, i) => ({
            id: i + 1,
            text: d.pageContent.substring(0, 150) + "..."
        }));

        res.json({ answer, sources });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});