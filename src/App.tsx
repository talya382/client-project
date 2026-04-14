import { useEffect, useState } from "react";
import type { Documents } from "./model/Document";



function App() {
  const [file, setFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Documents[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    const res = await fetch("/documents");
    const data = await res.json();
    setDocuments(data);
    setLoadingDocs(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    // 1️⃣ בקשת presign
    const presignRes = await fetch("/documents/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });

    const { uploadUrl, key } = await presignRes.json();
    console.log(uploadUrl, key);




    // 2️⃣ העלאה ישירה ל-S3
    await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });



    // 3️⃣ שמירת metadata ב-DB
    await fetch("/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: file.name,
        key,
        contentType: file.type,
        size: file.size,
      }),
    });

    setFile(null);
    await fetchDocuments();
    setLoading(false);
  };
  return (
    <div style={{ padding: 40 }}>
      <h1>DocBox</h1>
      <h2 style={{ backgroundColor: "lightgray" }}> יום נעים, אפשר להתחיל לעלות מסכמכים</h2>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>

      <hr />

      <h2>Documents</h2>
      {loadingDocs ? "Loading..." : null}
      <ul>
        {documents.map((doc) => (
          <li key={doc.id}>
            {doc.title}

            <button
              onClick={async () => {
                const res = await fetch(`/documents/${doc.id}/download`);
                const data = await res.json();
                window.open(data.url, "_blank");
              }}
            >
              Download
            </button>
            <button
              onClick={async () => {
                await fetch(`/documents/${doc.id}`, {
                  method: "DELETE",
                });
                fetchDocuments();
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;