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
  const [sessionId, setSessionId] = useState("");
  const [activeTab, setActiveTab] = useState("pdf"); // pdf | text | url
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");

  // ✅ Upload PDF
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
      if (data.sessionId) setSessionId(data.sessionId);
    } catch (err) {
      setUploadMsg("❌ Error uploading PDF");
    }

    setUploading(false);
  };

  // ✅ Upload Text
  const uploadText = async () => {
    if (!textInput.trim()) return;

    setUploading(true);
    setUploadMsg("");

    try {
      const res = await fetch(`${BACKEND_URL}/upload-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput, sessionId }),
      });

      const data = await res.json();
      setUploadMsg(data.message || data.error);
      if (data.sessionId) setSessionId(data.sessionId);
      setUploadedFiles((prev) => [...prev, "Pasted Text"]);
      setTextInput("");
    } catch (err) {
      setUploadMsg("❌ Error uploading text");
    }

    setUploading(false);
  };

  // ✅ Upload URL
  const uploadURL = async () => {
    if (!urlInput.trim()) return;

    setUploading(true);
    setUploadMsg("");

    try {
      const res = await fetch(`${BACKEND_URL}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput, sessionId }),
      });

      const data = await res.json();
      setUploadMsg(data.message || data.error);
      if (data.sessionId) setSessionId(data.sessionId);
      setUploadedFiles((prev) => [...prev, urlInput]);
      setUrlInput("");
    } catch (err) {
      setUploadMsg("❌ Error scraping URL");
    }

    setUploading(false);
  };

  // ✅ Ask Question
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
        body: JSON.stringify({ question: userQuestion, sessionId }),
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
          <h1 className="text-xl font-bold">RAG Chatbot</h1>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          {["pdf", "text", "url"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold uppercase transition ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {tab === "pdf" ? "📄 PDF" : tab === "text" ? "📝 Text" : "🌐 URL"}
            </button>
          ))}
        </div>

        {/* PDF Tab */}
        {activeTab === "pdf" && (
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-3">Upload PDF files</p>
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
          </div>
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <p className="text-xs text-slate-400">Paste any text</p>
            <textarea
              className="w-full h-32 bg-slate-700 text-white text-xs rounded-lg p-2 outline-none resize-none placeholder-slate-500"
              placeholder="Paste your text here..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
            <button
              onClick={uploadText}
              disabled={uploading || !textInput.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg text-sm font-medium transition"
            >
              {uploading ? "⏳ Indexing..." : "📝 Index Text"}
            </button>
          </div>
        )}

        {/* URL Tab */}
        {activeTab === "url" && (
          <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <p className="text-xs text-slate-400">Scrape a website</p>
            <input
              type="text"
              className="w-full bg-slate-700 text-white text-xs rounded-lg p-2 outline-none placeholder-slate-500"
              placeholder="https://example.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button
              onClick={uploadURL}
              disabled={uploading || !urlInput.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg text-sm font-medium transition"
            >
              {uploading ? "⏳ Scraping..." : "🌐 Scrape & Index"}
            </button>
          </div>
        )}

        {/* Upload Message */}
        {uploadMsg && (
          <p className={`text-xs px-2 ${uploadMsg.includes("❌") ? "text-red-400" : "text-green-400"}`}>
            {uploadMsg}
          </p>
        )}

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-300 mb-2">Indexed Sources</p>
            <ul className="space-y-1">
              {uploadedFiles.map((name, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-center gap-1 truncate">
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

        <div className="flex-1 overflow-y-auto space-y-4">

          {chatHistory.length === 0 && !loading && !answer && (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
              <span className="text-6xl mb-4">🤖</span>
              <h2 className="text-2xl font-bold text-white mb-2">Ask anything</h2>
              <p className="text-sm">Upload a PDF, paste text, or scrape a website — then ask questions</p>
            </div>
          )}

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
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-blue-400">Chunk {s.id}</p>
                    <p className="text-xs text-slate-500 truncate max-w-32">📄 {s.source}</p>
                  </div>
                  <p className="text-xs text-slate-400">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-3 bg-slate-700 rounded-xl p-3">
          <input
            type="text"
            placeholder="Ask something from your content..."
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