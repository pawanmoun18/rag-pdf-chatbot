import * as dotenv from 'dotenv';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
dotenv.config({ path: path.join(__dirname, '.env') });

async function indexing() {

    const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
    const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

    if (!PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
        console.error("❌ Missing .env variables");
        return;
    }

    // Load PDF
   const PDF_PATH = path.resolve(__dirname, 'Node.pdf');
    const loader = new PDFLoader(PDF_PATH);
    const docs = await loader.load();

    // Split
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const chunks = await splitter.splitDocuments(docs);

    console.log("Docs:", docs.length);
    console.log("Chunks:", chunks.length);

    // Embeddings (FREE)
    const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HUGGINGFACE_API_KEY,
  model: "sentence-transformers/all-MiniLM-L6-v2",
});

    const test = await embeddings.embedQuery("hello");
    console.log("Embedding dim:", test.length); // should be 384

    // Pinecone
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pinecone.Index(PINECONE_INDEX_NAME);

    // Upload
    await PineconeStore.fromDocuments(chunks, embeddings, {
        pineconeIndex: index,
    });

    console.log("✅ Done!");
}

indexing();
