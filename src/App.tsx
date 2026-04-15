import { useEffect, useState } from "react";
import type { Documents } from "./model/Document";

// החליפי את הכתובת הזו ב-IP שמופיע ב-Task ב-AWS
const API_BASE_URL = "http://[YOUR_AWS_PUBLIC_IP]:3000";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Documents[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // פונקציה למשיכת מסמכים
  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/documents`);
      const data = await res.json();
      setDocuments(data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // 1️⃣ בקשת presign מהשרת שלנו ב-AWS
      const presignRes = await fetch(`${API_BASE_URL}/documents/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      const { uploadUrl, key } = await presignRes.json();

      // 2️⃣ העלאה ישירה ל-S3 (משתמש ב-URL המלא שחזר מהשרת)
      await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      // 3️⃣ שמירת metadata ב-DB דרך השרת ב-AWS
      await fetch(`${API_BASE_URL}/documents`, {
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
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>DocBox</h1>
      <h2 style={{ backgroundColor: "lightgray", padding: "10px" }}>
        יום נעים, אפשר להתחיל להעלות מסמכים
      </h2>
      
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>

      <hr />

      <h2>Documents List</h2>
      {loadingDocs ? <p>Loading documents...</p> : null}
      
      <ul>
        {documents.map((doc) => (
          <li key={doc.id} style={{ marginBottom: "10px" }}>
            <span style={{ marginRight: "15px" }}>{doc.title}</span>

            <button
              onClick={async () => {
                const res = await fetch(`${API_BASE_URL}/documents/${doc.id}/download`);
                const data = await res.json();
                window.open(data.url, "_blank");
              }}
            >
              Download
            </button>

            <button
              style={{ marginLeft: "5px", color: "red" }}
              onClick={async () => {
                await fetch(`${API_BASE_URL}/documents/${doc.id}`, {
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