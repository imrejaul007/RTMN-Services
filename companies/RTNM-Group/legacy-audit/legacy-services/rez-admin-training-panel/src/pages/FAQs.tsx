import { useState, useEffect } from 'react';
import { Plus, Search, Upload, Download, X, Tag, Folder, ChevronDown, ChevronUp } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import apiService from '../services/api';
import type { FAQ, FAQCategory } from '../types';

interface FAQFormData {
  question: string;
  answer: string;
  category: string;
  tags: string[];
  status: 'active' | 'inactive';
}

export function FAQs() {
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const [faqForm, setFaqForm] = useState<FAQFormData>({
    question: '',
    answer: '',
    category: '',
    tags: [],
    status: 'active',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });

  const [bulkImportText, setBulkImportText] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [faqsData, categoriesData] = await Promise.all([
        apiService.getFAQs(),
        apiService.getFAQCategories(),
      ]);
      setFAQs(faqsData.data);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
      // Mock data for demonstration
      setFAQs(mockFAQs);
      setCategories(mockCategories);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFAQ = () => {
    setModalType('add');
    setSelectedFAQ(null);
    setFaqForm({
      question: '',
      answer: '',
      category: categories[0]?.name || '',
      tags: [],
      status: 'active',
    });
    setShowModal(true);
  };

  const handleEditFAQ = (faq: FAQ) => {
    setModalType('edit');
    setSelectedFAQ(faq);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags,
      status: faq.status,
    });
    setShowModal(true);
  };

  const handleDeleteFAQ = async (faq: FAQ) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      try {
        await apiService.deleteFAQ(faq.id);
        setFAQs((prev) => prev.filter((f) => f.id !== faq.id));
      } catch (error) {
        console.error('Failed to delete FAQ:', error);
        setFAQs((prev) => prev.filter((f) => f.id !== faq.id));
      }
    }
  };

  const handleSubmitFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'add') {
        const newFAQ = await apiService.createFAQ(faqForm);
        setFAQs((prev) => [...prev, newFAQ]);
      } else if (selectedFAQ) {
        const updated = await apiService.updateFAQ(selectedFAQ.id, faqForm);
        setFAQs((prev) => prev.map((f) => (f.id === selectedFAQ.id ? updated : f)));
      }
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save FAQ:', error);
      // Mock save
      const newFAQ: FAQ = {
        id: selectedFAQ?.id || Date.now().toString(),
        ...faqForm,
        createdAt: selectedFAQ?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (modalType === 'add') {
        setFAQs((prev) => [...prev, newFAQ]);
      } else {
        setFAQs((prev) => prev.map((f) => (f.id === selectedFAQ?.id ? newFAQ : f)));
      }
      setShowModal(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCategory = await apiService.createFAQCategory(categoryForm);
      setCategories((prev) => [...prev, newCategory]);
      setCategoryForm({ name: '', description: '' });
      setShowCategoryModal(false);
    } catch (error) {
      console.error('Failed to add category:', error);
      const newCategory: FAQCategory = {
        id: Date.now().toString(),
        ...categoryForm,
        faqCount: 0,
      };
      setCategories((prev) => [...prev, newCategory]);
      setCategoryForm({ name: '', description: '' });
      setShowCategoryModal(false);
    }
  };

  const handleBulkImport = async () => {
    try {
      // Parse the CSV-like text input
      const lines = bulkImportText.trim().split('\n');
      const faqsToImport = lines.map((line) => {
        const [question, answer, category] = line.split('|').map((s) => s.trim());
        return { question, answer, category: category || 'General', tags: [], status: 'active' as const };
      });

      const result = await apiService.bulkImportFAQs(faqsToImport);
      alert(`Imported ${result.imported} FAQs. ${result.failed} failed.`);
      setBulkImportText('');
      setShowBulkModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to import FAQs:', error);
      // Mock import
      const lines = bulkImportText.trim().split('\n').filter((l) => l.includes('|'));
      alert(`Imported ${lines.length} FAQs successfully!`);
      setBulkImportText('');
      setShowBulkModal(false);
    }
  };

  const handleExportFAQs = () => {
    const csvContent = [
      ['Question', 'Answer', 'Category', 'Tags', 'Status'].join(','),
      ...faqs.map((faq) => [
        `"${faq.question.replace(/"/g, '""')}"`,
        `"${faq.answer.replace(/"/g, '""')}"`,
        faq.category,
        `"${faq.tags.join(';')}"`,
        faq.status,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faqs-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addTag = () => {
    if (tagInput.trim() && !faqForm.tags.includes(tagInput.trim())) {
      setFaqForm((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFaqForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const columns: Column<FAQ>[] = [
    {
      key: 'question',
      header: 'Question',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{item.question}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">{item.answer}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (item) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {item.category}
        </span>
      ),
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {tag}
            </span>
          ))}
          {item.tags.length > 2 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              +{item.tags.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            item.status === 'active'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
          }`}
        >
          {item.status}
        </span>
      ),
    },
  ];

  // Mock data
  const mockFAQs: FAQ[] = [
    { id: '1', question: 'How do I reset my password?', answer: 'Click on "Forgot Password" on the login page and follow the instructions sent to your email.', category: 'Account', tags: ['password', 'login', 'account'], createdAt: '2024-01-15', updatedAt: '2024-01-20', status: 'active' },
    { id: '2', question: 'What payment methods are accepted?', answer: 'We accept all major credit cards, PayPal, and Apple Pay.', category: 'Billing', tags: ['payment', 'billing'], createdAt: '2024-01-12', updatedAt: '2024-01-18', status: 'active' },
    { id: '3', question: 'How long does delivery take?', answer: 'Standard delivery takes 30-45 minutes. Express delivery is available for select areas.', category: 'Orders', tags: ['delivery', 'shipping'], createdAt: '2024-01-10', updatedAt: '2024-01-15', status: 'active' },
    { id: '4', question: 'Can I modify my order after placing it?', answer: 'You can modify your order within 5 minutes of placing it, before the restaurant starts preparing.', category: 'Orders', tags: ['modify', 'cancel'], createdAt: '2024-01-08', updatedAt: '2024-01-14', status: 'active' },
    { id: '5', question: 'How do I contact customer support?', answer: 'You can reach our support team via chat, email at support@rez.com, or phone at 1-800-REZ-HELP.', category: 'Support', tags: ['support', 'contact'], createdAt: '2024-01-05', updatedAt: '2024-01-12', status: 'inactive' },
  ];

  const mockCategories: FAQCategory[] = [
    { id: '1', name: 'Account', description: 'Account related questions', faqCount: 12 },
    { id: '2', name: 'Billing', description: 'Payment and billing questions', faqCount: 8 },
    { id: '3', name: 'Orders', description: 'Order management questions', faqCount: 15 },
    { id: '4', name: 'Support', description: 'Customer support questions', faqCount: 6 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FAQs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage frequently asked questions and categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </button>
          <button
            onClick={handleExportFAQs}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={handleAddFAQ}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add FAQ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Categories</h3>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2">
              <button className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600">
                <span>All FAQs</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700">
                  {faqs.length}
                </span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-200 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    <span>{cat.name}</span>
                  </div>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {cat.faqCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FAQs Table */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-gray-700">
            <DataTable
              data={faqs}
              columns={columns}
              keyExtractor={(item) => item.id}
              loading={loading}
              searchable
              searchPlaceholder="Search FAQs..."
              filterable
              filters={categories.map((c) => ({ label: c.name, value: c.name }))}
              onEdit={handleEditFAQ}
              onDelete={handleDeleteFAQ}
              onView={(faq) => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
              emptyMessage="No FAQs found. Add your first FAQ to get started."
            />
          </div>
        </div>
      </div>

      {/* FAQ Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-dark-200 rounded-xl shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {modalType === 'add' ? 'Add' : 'Edit'} FAQ
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitFAQ} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Question
                  </label>
                  <input
                    type="text"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Answer
                  </label>
                  <textarea
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={faqForm.category}
                      onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={faqForm.status}
                      onChange={(e) => setFaqForm({ ...faqForm, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add a tag"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-100 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {faqForm.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {modalType === 'add' ? 'Add FAQ' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowCategoryModal(false)} />
            <div className="relative w-full max-w-md bg-white dark:bg-dark-200 rounded-xl shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Category</h2>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAddCategory} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Add Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowBulkModal(false)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-dark-200 rounded-xl shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bulk Import FAQs</h2>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Enter one FAQ per line using the format: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">question | answer | category</code>
                </p>
                <textarea
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder={'How do I reset password? | Click forgot password link | Account\nWhat are the payment options? | We accept cards and PayPal | Billing'}
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={!bulkImportText.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Import FAQs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FAQs;
