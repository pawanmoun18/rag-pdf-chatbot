import * as dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

dotenv.config();

async function queryRAG() {

    const question = "What is Node.js?";

    // ✅ Embeddings
    const embeddings = new HuggingFaceInferenceEmbeddings({
        apiKey: process.env.HUGGINGFACE_API_KEY,
        model: "sentence-transformers/all-MiniLM-L6-v2",
    });

    // ✅ Pinecone
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: index,
    });

    // ✅ Retrieve top 3 relevant chunks
    const docs = await vectorStore.similaritySearch(question, 3);

    console.log("\n--- Retrieved Context ---\n");

    docs.forEach((doc, i) => {
        console.log(`Chunk ${i + 1}:\n${doc.pageContent}\n`);
    });

    // ✅ IMPROVED ANSWER GENERATION (NO LLM)
    console.log("\n--- Final Answer ---\n");

    // Step 1: take best chunk
    const bestChunk = docs[0].pageContent;

    // Step 2: clean + extract relevant sentences
    const answer = bestChunk
        .replace(/\n/g, " ") // remove line breaks
        .split(".")
        .filter(sentence =>
            sentence.toLowerCase().includes("node") ||
            sentence.toLowerCase().includes("javascript")
        )
        .slice(0, 2) // take top 2 sentences
        .join(". ") + ".";

    console.log(answer);

    // ✅ SHOW SOURCES (INTERVIEW BONUS)
    console.log("\n--- Sources ---\n");

    docs.forEach((doc, i) => {
        console.log(`Source ${i + 1}:`, doc.metadata?.source || "PDF Document");
    });
}

queryRAG();