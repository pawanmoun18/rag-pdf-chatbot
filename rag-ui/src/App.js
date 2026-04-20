import { useState } from "react";

const BACKEND_URL = "https://rag-pdf-chatbot-backend-h27h.onrender.com";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);

  const uploadPDF = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadMsg("");

    const formData = new FormData();
    files.forEach((file) => formData.append("pdf", file));

    try {
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadMsg(data.message || data.error);
      setUploadedFiles((prev) => [...prev, ...files.map((f) => f.name)]);
    } catch (err) {
      setUploadMsg("❌ Error uploading PDF");
    }

    setUploading(false);
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    const userQuestion = question;
    setLoading(true);
    setAnswer("");
    setSources([]);
    setQuestion("");

    try {
      const res = await fetch(`${BACKEND_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuestion }),
      });

      const data = await res.json();
      setAnswer(data.answer);
      setSources(data.sources || []);

      setChatHistory((prev) => [
        ...prev,
        { question: userQuestion, answer: data.answer },
      ]);
    } catch (err) {
      setAnswer("❌ Error connecting to backend");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex">

      {/* Sidebar */}
      <div className="w-72 bg-slate-950 text-white flex flex-col p-5 gap-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📄</span>
          <h1 className="text-xl font-bold">RAG PDF Chatbot</h1>
        </div>

        {/* Upload Section */}
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-300 mb-3">Upload PDFs</p>
          <label className="cursor-pointer block w-full text-center py-2 px-3 bg-blue-600 hover:bg-blue-700 transition rounded-lg text-sm font-medium">
            {uploading ? "⏳ Indexing..." : "＋ Choose Files"}
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={uploadPDF}
              className="hidden"
            />
          </label>

          {uploadMsg && (
            <p className={`mt-2 text-xs ${uploadMsg.includes("❌") ? "text-red-400" : "text-green-400"}`}>
              {uploadMsg}
            </p>
          )}
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-300 mb-2">Uploaded Files</p>
            <ul className="space-y-1">
              {uploadedFiles.map((name, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="text-green-400">✓</span> {name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4 flex-1 overflow-y-auto">
            <p className="text-sm font-semibold text-slate-300 mb-2">History</p>
            <ul className="space-y-2">
              {chatHistory.map((item, i) => (
                <li key={i} className="text-xs text-slate-400 truncate">
                  💬 {item.question}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-6 gap-4">

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4">

          {/* Welcome Message */}
          {chatHistory.length === 0 && !loading && !answer && (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
              <span className="text-6xl mb-4">📄</span>
              <h2 className="text-2xl font-bold text-white mb-2">Ask your PDFs anything</h2>
              <p className="text-sm">Upload one or more PDFs and start asking questions</p>
            </div>
          )}

          {/* Chat History Messages */}
          {chatHistory.map((item, i) => (
            <div key={i} className="space-y-3">
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-xl text-sm">
                  {item.question}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-xl text-sm whitespace-pre-wrap">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 text-slate-400 rounded-2xl rounded-tl-sm px-4 py-3 text-sm animate-pulse">
                ⏳ Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Sources */}
        {sources.length > 0 && (
          <div className="bg-slate-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-300 mb-2">📚 Sources</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sources.map((s) => (
                <div key={s.id} className="bg-slate-800 rounded-lg p-2">
                  <p className="text-xs font-semibold text-blue-400 mb-1">Chunk {s.id}</p>
                  <p className="text-xs text-slate-400">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-3 bg-slate-700 rounded-xl p-3">
          <input
            type="text"
            placeholder="Ask something from your PDFs..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askQuestion()}
            className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-sm"
          />
          <button
            onClick={askQuestion}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;