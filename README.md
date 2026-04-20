# RAG PDF Chatbot 📄

A full-stack AI chatbot that lets you upload multiple PDFs and ask questions about them using Retrieval Augmented Generation (RAG).

## 🔗 Live Demo
[Click here to try it](https://rag-pdf-chatbot-3jzv-mu.vercel.app)

## 🛠️ Tech Stack
- **Frontend:** React.js, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Vector Database:** Pinecone
- **Embeddings:** HuggingFace (sentence-transformers/all-MiniLM-L6-v2)
- **LLM:** Groq (Llama 3.1)
- **PDF Processing:** LangChain

## ✨ Features
- Upload multiple PDFs at once
- Semantic search using vector embeddings
- AI generated answers using Llama 3.1
- Source citations showing which chunks were used
- Chat history
- Hallucination guard (says "not found" if answer not in PDF)

## 🏗️ Architecture
1. PDF uploaded → split into chunks → embedded using HuggingFace
2. Chunks stored in Pinecone vector database
3. User question → embedded → similarity search in Pinecone
4. Top 5 relevant chunks sent to Groq LLM as context
5. LLM generates answer based only on retrieved context

## 🚀 Run Locally
```bash
# Backend
npm install
node server.js

# Frontend
cd rag-ui
npm install
npm start
```

## 🔑 Environment Variables
```
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
HUGGINGFACE_API_KEY=
GROQ_API_KEY=
```
