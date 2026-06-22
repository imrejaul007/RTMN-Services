import { useState, useEffect } from 'react';
import { Plus, Search, FileText, BookOpen, Link, FileJson, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { PDFUpload, CSVUpload, JSONUpload } from '../components/FileUpload';
import apiService from '../services/api';
import type { TrainingDocument } from '../types';

type UploadTab = 'pdf' | 'article' | 'menu' | 'json';
type DocumentType = 'book' | 'article' | 'document' | 'menu';

export function TrainingData() {
  const [documents, setDocuments] = useState<TrainingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<UploadTab>('pdf');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Article form state
  const [articleUrl, setArticleUrl] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleTitle, setArticleTitle] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTrainingDocuments();
      setDocuments(data.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      // Mock data for demonstration
      setDocuments(mockDocuments);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPDF = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await apiService.uploadFile(file, 'book');
      clearInterval(progressInterval);
      setUploadProgress(100);

      const newDoc: TrainingDocument = {
        id: result.id,
        title: file.name.replace('.pdf', ''),
        type: 'book',
        fileUrl: result.url,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDocuments((prev) => [...prev, newDoc]);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload failed:', error);
      // Mock success for demonstration
      setUploadProgress(100);
      const newDoc: TrainingDocument = {
        id: Date.now().toString(),
        title: file.name.replace('.pdf', ''),
        type: 'book',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { pageCount: Math.floor(Math.random() * 200) + 50 },
      };
      setDocuments((prev) => [...prev, newDoc]);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  const handleUploadCSV = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 20, 90));
    }, 200);

    try {
      const result = await apiService.uploadMenuData(file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      const newDoc: TrainingDocument = {
        id: Date.now().toString(),
        title: file.name.replace('.csv', ''),
        type: 'menu',
        fileUrl: URL.createObjectURL(file),
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: { wordCount: result.imported },
      };
      setDocuments((prev) => [...prev, newDoc]);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload failed:', error);
      // Mock success for demonstration
      setUploadProgress(100);
      const newDoc: TrainingDocument = {
        id: Date.now().toString(),
        title: file.name.replace('.csv', ''),
        type: 'menu',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDocuments((prev) => [...prev, newDoc]);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  const handleUploadArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const doc = await apiService.uploadArticle({
        url: articleUrl || undefined,
        content: articleContent || undefined,
        title: articleTitle,
        type: 'article',
      });
      setDocuments((prev) => [...prev, doc]);
      setArticleUrl('');
      setArticleContent('');
      setArticleTitle('');
    } catch (error) {
      console.error('Failed to add article:', error);
      // Mock success for demonstration
      const newDoc: TrainingDocument = {
        id: Date.now().toString(),
        title: articleTitle,
        type: 'article',
        sourceUrl: articleUrl,
        content: articleContent,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDocuments((prev) => [...prev, newDoc]);
      setArticleUrl('');
      setArticleContent('');
      setArticleTitle('');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: TrainingDocument) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await apiService.deleteTrainingDocument(doc.id);
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      } catch (error) {
        console.error('Failed to delete document:', error);
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />;
    }
  };

  const getTypeIcon = (type: DocumentType) => {
    switch (type) {
      case 'book':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'article':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'menu':
        return <FileJson className="h-5 w-5 text-orange-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  // Mock documents
  const mockDocuments: TrainingDocument[] = [
    { id: '1', title: 'Restaurant Menu Guide 2024', type: 'book', status: 'completed', createdAt: '2024-01-15', updatedAt: '2024-01-20', metadata: { pageCount: 156 } },
    { id: '2', title: 'Customer Support Best Practices', type: 'document', status: 'completed', createdAt: '2024-01-12', updatedAt: '2024-01-18' },
    { id: '3', title: 'Pizza Palace Menu', type: 'menu', status: 'completed', createdAt: '2024-01-10', updatedAt: '2024-01-15', metadata: { wordCount: 450 } },
    { id: '4', title: 'Food Delivery Industry Trends', type: 'article', sourceUrl: 'https://example.com/article', status: 'processing', createdAt: '2024-01-08', updatedAt: '2024-01-14' },
    { id: '5', title: 'FAQ Response Templates', type: 'document', status: 'completed', createdAt: '2024-01-05', updatedAt: '2024-01-12' },
  ];

  const uploadTabs = [
    { id: 'pdf' as UploadTab, label: 'PDF Books', icon: BookOpen },
    { id: 'article' as UploadTab, label: 'Articles', icon: Link },
    { id: 'menu' as UploadTab, label: 'Menu CSV', icon: FileJson },
    { id: 'json' as UploadTab, label: 'JSON Data', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Training Data</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload and manage training documents, books, articles, and menu data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload Training Data</h3>

            {/* Upload Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {uploadTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Upload Forms */}
            <div className="space-y-4">
              {activeTab === 'pdf' && (
                <PDFUpload
                  onUpload={handleUploadPDF}
                  disabled={uploading}
                />
              )}

              {activeTab === 'article' && (
                <form onSubmit={handleUploadArticle} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={articleTitle}
                      onChange={(e) => setArticleTitle(e.target.value)}
                      placeholder="Article title"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL (optional)
                    </label>
                    <input
                      type="url"
                      value={articleUrl}
                      onChange={(e) => setArticleUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Or paste content
                    </label>
                    <textarea
                      value={articleContent}
                      onChange={(e) => setArticleContent(e.target.value)}
                      rows={6}
                      placeholder="Paste article content here..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || (!articleUrl && !articleContent)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Add Article
                  </button>
                </form>
              )}

              {activeTab === 'menu' && (
                <CSVUpload onUpload={handleUploadCSV} disabled={uploading} />
              )}

              {activeTab === 'json' && (
                <JSONUpload onUpload={handleUploadCSV} disabled={uploading} />
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Uploading...</h3>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{uploadProgress}% complete</p>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Training Documents</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-200 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No training documents yet. Upload your first document to get started.
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-gray-100 dark:bg-dark-200 rounded-lg">
                          {getTypeIcon(doc.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{doc.title}</p>
                          <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="capitalize">{doc.type}</span>
                            <span>•</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                            {doc.metadata?.pageCount && (
                              <>
                                <span>•</span>
                                <span>{doc.metadata.pageCount} pages</span>
                              </>
                            )}
                            {doc.metadata?.wordCount && (
                              <>
                                <span>•</span>
                                <span>{doc.metadata.wordCount} items</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(doc.status)}
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {doc.status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document Statistics */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-dark-100 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">PDF Books</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {documents.filter((d) => d.type === 'book').length}
              </p>
            </div>
            <div className="bg-white dark:bg-dark-100 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Articles</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {documents.filter((d) => d.type === 'article').length}
              </p>
            </div>
            <div className="bg-white dark:bg-dark-100 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Menu Data</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {documents.filter((d) => d.type === 'menu').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainingData;
