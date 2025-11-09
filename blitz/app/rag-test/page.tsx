'use client';

import { useState } from 'react';

export default function RAGTestPage() {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [ingestResult, setIngestResult] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleIngest = async () => {
    setLoading(true);
    setIngestResult(null);
    try {
      const response = await fetch('/api/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          metadata: { category, source: 'web-ui' },
        }),
      });
      const data = await response.json();
      setIngestResult(data);
    } catch (error: any) {
      setIngestResult({ error: error.message });
    }
    setLoading(false);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setIngestResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', category || 'uploaded-document');
      formData.append('source', selectedFile.name);

      const response = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setIngestResult(data);
    } catch (error: any) {
      setIngestResult({ error: error.message });
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (fileType === 'txt' || fileType === 'pdf') {
        setSelectedFile(file);
      } else {
        alert('Please select a .txt or .pdf file');
        e.target.value = '';
      }
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearchResults(null);
    try {
      // Use the new answer endpoint for concise responses
      const response = await fetch('/api/rag/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setSearchResults(data);
    } catch (error: any) {
      setSearchResults({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">RAG System Test</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Ingest Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📝 Ingest Document</h2>
            
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setUploadMode('text')}
                className={`flex-1 py-2 px-4 rounded ${
                  uploadMode === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                ✍️ Text Input
              </button>
              <button
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-2 px-4 rounded ${
                  uploadMode === 'file'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                📁 File Upload
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., return-policy, shipping-policy"
                  className="w-full p-2 border rounded"
                />
              </div>

              {uploadMode === 'text' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Content</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter your company policy or information..."
                      rows={8}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  <button
                    onClick={handleIngest}
                    disabled={loading || !content}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Processing...' : 'Ingest Document'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Upload File (.txt or .pdf)
                    </label>
                    <input
                      type="file"
                      accept=".txt,.pdf"
                      onChange={handleFileChange}
                      className="w-full p-2 border rounded"
                    />
                    {selectedFile && (
                      <div className="mt-2 text-sm text-gray-600">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleFileUpload}
                    disabled={loading || !selectedFile}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Uploading...' : 'Upload & Ingest'}
                  </button>
                </>
              )}

              {ingestResult && (
                <div className={`p-4 rounded-lg border-l-4 ${
                  ingestResult.success 
                    ? 'bg-green-50 border-green-500' 
                    : 'bg-red-50 border-red-500'
                }`}>
                  {ingestResult.success ? (
                    <div>
                      <p className="text-green-800 font-semibold mb-2">✓ Successfully Ingested!</p>
                      <div className="space-y-1 text-sm text-green-700">
                        <p>📦 Chunks Created: <span className="font-bold">{ingestResult.chunksCreated}</span></p>
                        {ingestResult.fileName && (
                          <p>📄 File: {ingestResult.fileName}</p>
                        )}
                        {ingestResult.contentLength && (
                          <p>📏 Content Length: {ingestResult.contentLength.toLocaleString()} characters</p>
                        )}
                        <p className="text-xs text-green-600 mt-2">
                          {ingestResult.message || 'Document is now searchable!'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-red-800 font-semibold mb-2">❌ Error</p>
                      <p className="text-sm text-red-700">{ingestResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🔍 Search Documents</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Query</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={loading || !query}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>

              {searchResults && (
                <div className="space-y-4">
                  {searchResults.success && searchResults.answer ? (
                    <>
                      {/* Main Answer Card */}
                      <div className="bg-gradient-to-br from-blue-50 to-white border-l-4 border-blue-500 rounded-lg p-6 shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center">
                            <span className="text-lg">💡</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-blue-600">
                              Answer
                            </div>
                            {searchResults.confidence && (
                              <div className="text-xs text-gray-500">
                                {searchResults.confidence}% Confidence
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-800 text-base leading-relaxed">
                          {searchResults.answer}
                        </p>
                        
                        {searchResults.sources && searchResults.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-500">Sources:</span>
                              {searchResults.sources.map((source: any, i: number) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                                  {source.category?.replace(/-/g, ' ')} ({source.similarity}%)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : searchResults.error ? (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                      <p className="text-red-700 font-semibold">❌ Error</p>
                      <p className="text-red-600 text-sm mt-1">{searchResults.error}</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                      <p className="text-yellow-800 font-semibold">⚠️ No Results</p>
                      <p className="text-yellow-700 text-sm mt-1">
                        No matching documents found. Try rephrasing your query or ingesting more content.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Examples */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">💡 Quick Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setCategory('return-policy');
                setContent(`Return Policy - Complete Guide

Our company offers a comprehensive 30-day return policy for all products purchased through our website or retail stores. This policy is designed to ensure customer satisfaction and provide flexibility in your shopping experience.

Eligibility Criteria:
Items must be returned within 30 days of the original purchase date. Products must be in their original condition, unused, and with all original tags and packaging intact. The original receipt or proof of purchase must be provided. Items purchased during promotional sales are also eligible for returns under the same conditions.

Return Process:
To initiate a return, customers can either visit any of our retail locations or request a return authorization through our website. For online returns, log into your account, navigate to order history, and select the items you wish to return. You will receive a prepaid return shipping label via email within 24 hours.

Refund Timeline:
Once we receive your returned item, our quality assurance team will inspect it within 2-3 business days. If the return meets our criteria, a full refund will be processed to your original payment method. Please allow 5-7 business days for the refund to appear in your account, depending on your financial institution.

Exceptions and Special Cases:
Certain items are non-returnable, including personalized or custom-made products, intimate apparel, and perishable goods. Electronics must be returned in their original sealed packaging. If the packaging has been opened, a 15% restocking fee may apply. Sale items marked as "Final Sale" cannot be returned or exchanged.

Exchange Policy:
If you prefer an exchange rather than a refund, we offer free exchanges for different sizes or colors of the same product. Exchanges are processed immediately upon receipt of the original item, and the new item ships within 1-2 business days.

Damaged or Defective Items:
If you receive a damaged or defective product, please contact our customer service team within 48 hours of delivery. We will arrange for a free return pickup and expedite a replacement or full refund, including original shipping costs. Photos of the damage may be requested for our records.

International Returns:
For international orders, the same 30-day return policy applies. However, customers are responsible for return shipping costs, and refunds will not include original international shipping fees. We recommend using a trackable shipping method for international returns.`);
              }}
              className="p-4 border rounded hover:bg-gray-50 text-left"
            >
              <div className="font-semibold">Return Policy (Long)</div>
              <div className="text-sm text-gray-600">Multi-chunk example</div>
            </button>

            <button
              onClick={() => {
                setCategory('shipping-policy');
                setContent('We offer free shipping on orders over $50. Standard shipping takes 3-5 business days. Express shipping (1-2 days) is available for $15.');
              }}
              className="p-4 border rounded hover:bg-gray-50 text-left"
            >
              <div className="font-semibold">Shipping Policy</div>
              <div className="text-sm text-gray-600">Sample shipping info</div>
            </button>

            <button
              onClick={() => {
                setQuery('How long do I have to return something?');
              }}
              className="p-4 border rounded hover:bg-gray-50 text-left"
            >
              <div className="font-semibold">Sample Query</div>
              <div className="text-sm text-gray-600">Test search query</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
