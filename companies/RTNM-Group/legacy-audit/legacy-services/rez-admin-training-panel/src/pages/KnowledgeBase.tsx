import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Eye, X, Building2 } from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import apiService from '../services/api';
import type { KnowledgeEntry, Merchant } from '../types';

type TabType = 'entries' | 'merchants';

interface EntryFormData {
  title: string;
  content: string;
  category: string;
  source: string;
  merchantId?: string;
  status: 'active' | 'inactive';
}

interface MerchantFormData {
  name: string;
  description: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  categories: string[];
  status: 'active' | 'inactive';
}

export function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState<TabType>('entries');
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);

  const [entryForm, setEntryForm] = useState<EntryFormData>({
    title: '',
    content: '',
    category: '',
    source: '',
    status: 'active',
  });

  const [merchantForm, setMerchantForm] = useState<MerchantFormData>({
    name: '',
    description: '',
    categories: [],
    status: 'active',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'entries') {
        const data = await apiService.getKnowledgeEntries();
        setEntries(data.data);
      } else {
        const data = await apiService.getMerchants();
        setMerchants(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      // Use mock data for demonstration
      setEntries(mockEntries);
      setMerchants(mockMerchants);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = () => {
    setModalType('add');
    setEntryForm({
      title: '',
      content: '',
      category: '',
      source: '',
      status: 'active',
    });
    setShowModal(true);
  };

  const handleEditEntry = (entry: KnowledgeEntry) => {
    setModalType('edit');
    setSelectedEntry(entry);
    setEntryForm({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      source: entry.source,
      status: entry.status,
    });
    setShowModal(true);
  };

  const handleDeleteEntry = async (entry: KnowledgeEntry) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        await apiService.deleteKnowledgeEntry(entry.id);
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      } catch (error) {
        console.error('Failed to delete entry:', error);
      }
    }
  };

  const handleAddMerchant = () => {
    setModalType('add');
    setMerchantForm({
      name: '',
      description: '',
      categories: [],
      status: 'active',
    });
    setShowModal(true);
  };

  const handleEditMerchant = (merchant: Merchant) => {
    setModalType('edit');
    setSelectedMerchant(merchant);
    setMerchantForm({
      name: merchant.name,
      description: merchant.description,
      website: merchant.website,
      contactEmail: merchant.contactEmail,
      contactPhone: merchant.contactPhone,
      address: merchant.address,
      categories: merchant.categories,
      status: merchant.status,
    });
    setShowModal(true);
  };

  const handleDeleteMerchant = async (merchant: Merchant) => {
    if (confirm('Are you sure you want to delete this merchant?')) {
      try {
        await apiService.deleteMerchant(merchant.id);
        setMerchants((prev) => prev.filter((m) => m.id !== merchant.id));
      } catch (error) {
        console.error('Failed to delete merchant:', error);
      }
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'add') {
        const newEntry = await apiService.createKnowledgeEntry(entryForm);
        setEntries((prev) => [...prev, newEntry]);
      } else if (selectedEntry) {
        const updated = await apiService.updateKnowledgeEntry(selectedEntry.id, entryForm);
        setEntries((prev) => prev.map((e) => (e.id === selectedEntry.id ? updated : e)));
      }
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save entry:', error);
      // Mock save for demonstration
      const newEntry: KnowledgeEntry = {
        id: Date.now().toString(),
        ...entryForm,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (modalType === 'add') {
        setEntries((prev) => [...prev, newEntry]);
      } else {
        setEntries((prev) => prev.map((e) => (e.id === selectedEntry?.id ? { ...e, ...entryForm } : e)));
      }
      setShowModal(false);
    }
  };

  const handleSubmitMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'add') {
        const newMerchant = await apiService.createMerchant(merchantForm);
        setMerchants((prev) => [...prev, newMerchant]);
      } else if (selectedMerchant) {
        const updated = await apiService.updateMerchant(selectedMerchant.id, merchantForm);
        setMerchants((prev) => prev.map((m) => (m.id === selectedMerchant.id ? updated : m)));
      }
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save merchant:', error);
      // Mock save for demonstration
      const newMerchant: Merchant = {
        id: Date.now().toString(),
        ...merchantForm,
      };
      if (modalType === 'add') {
        setMerchants((prev) => [...prev, newMerchant]);
      } else {
        setMerchants((prev) => prev.map((m) => (m.id === selectedMerchant?.id ? { ...m, ...merchantForm } : m)));
      }
      setShowModal(false);
    }
  };

  const entryColumns: Column<KnowledgeEntry>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{item.content}</p>
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
      key: 'source',
      header: 'Source',
      render: (item) => <span className="text-gray-600 dark:text-gray-400">{item.source}</span>,
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
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      render: (item) => new Date(item.updatedAt).toLocaleDateString(),
    },
  ];

  const merchantColumns: Column<Merchant>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'categories',
      header: 'Categories',
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.categories.slice(0, 2).map((cat) => (
            <span key={cat} className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
              {cat}
            </span>
          ))}
          {item.categories.length > 2 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
              +{item.categories.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'contactEmail',
      header: 'Contact',
      render: (item) => (
        <span className="text-gray-600 dark:text-gray-400">{item.contactEmail || 'N/A'}</span>
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
  const mockEntries: KnowledgeEntry[] = [
    { id: '1', title: 'Menu Guidelines', content: 'How to format restaurant menus for AI processing', category: 'Documentation', source: 'Internal', status: 'active', createdAt: '2024-01-15', updatedAt: '2024-01-20' },
    { id: '2', title: 'Order Status Flow', content: 'Understanding order lifecycle states', category: 'Business Logic', source: 'API Docs', status: 'active', createdAt: '2024-01-10', updatedAt: '2024-01-18' },
    { id: '3', title: 'Payment Methods', content: 'Supported payment options and processing', category: 'Payments', source: 'Finance Team', status: 'active', createdAt: '2024-01-08', updatedAt: '2024-01-15' },
    { id: '4', title: 'Delivery Zones', content: 'Service area definitions and coverage', category: 'Logistics', source: 'Operations', status: 'inactive', createdAt: '2024-01-05', updatedAt: '2024-01-12' },
  ];

  const mockMerchants: Merchant[] = [
    { id: '1', name: 'Pizza Palace', description: 'Authentic Italian pizzeria', contactEmail: 'contact@pizzapalace.com', categories: ['Italian', 'Pizza', 'Pasta'], status: 'active' },
    { id: '2', name: 'Burger Barn', description: 'Gourmet burgers and sides', contactEmail: 'info@burgerbarn.com', categories: ['American', 'Burgers', 'Fast Food'], status: 'active' },
    { id: '3', name: 'Sushi Supreme', description: 'Fresh Japanese cuisine', contactEmail: 'order@sushisupreme.com', categories: ['Japanese', 'Sushi', 'Asian'], status: 'active' },
    { id: '4', name: 'Taco Town', description: 'Authentic Mexican street food', contactEmail: 'hello@tacotown.com', categories: ['Mexican', 'Tacos', 'Latin'], status: 'inactive' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage merchant information and training content
          </p>
        </div>
        <button
          onClick={activeTab === 'entries' ? handleAddEntry : handleAddMerchant}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add {activeTab === 'entries' ? 'Entry' : 'Merchant'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('entries')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'entries'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Knowledge Entries
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'merchants'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Merchants
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'entries' ? (
        <DataTable
          data={entries}
          columns={entryColumns}
          keyExtractor={(item) => item.id}
          loading={loading}
          searchable
          searchPlaceholder="Search knowledge entries..."
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
          onView={(item) => console.log('View entry:', item)}
          emptyMessage="No knowledge entries found"
        />
      ) : (
        <DataTable
          data={merchants}
          columns={merchantColumns}
          keyExtractor={(item) => item.id}
          loading={loading}
          searchable
          searchPlaceholder="Search merchants..."
          onEdit={handleEditMerchant}
          onDelete={handleDeleteMerchant}
          onView={(item) => console.log('View merchant:', item)}
          emptyMessage="No merchants found"
        />
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-dark-200 rounded-xl shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {modalType === 'add' ? 'Add' : 'Edit'} {activeTab === 'entries' ? 'Knowledge Entry' : 'Merchant'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={activeTab === 'entries' ? handleSubmitEntry : handleSubmitMerchant} className="p-6 space-y-4">
                {activeTab === 'entries' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={entryForm.title}
                        onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content
                      </label>
                      <textarea
                        value={entryForm.content}
                        onChange={(e) => setEntryForm({ ...entryForm, content: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Category
                        </label>
                        <input
                          type="text"
                          value={entryForm.category}
                          onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Source
                        </label>
                        <input
                          type="text"
                          value={entryForm.source}
                          onChange={(e) => setEntryForm({ ...entryForm, source: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <select
                        value={entryForm.status}
                        onChange={(e) => setEntryForm({ ...entryForm, status: e.target.value as 'active' | 'inactive' })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Merchant Name
                      </label>
                      <input
                        type="text"
                        value={merchantForm.name}
                        onChange={(e) => setMerchantForm({ ...merchantForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={merchantForm.description}
                        onChange={(e) => setMerchantForm({ ...merchantForm, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Website
                        </label>
                        <input
                          type="url"
                          value={merchantForm.website || ''}
                          onChange={(e) => setMerchantForm({ ...merchantForm, website: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          value={merchantForm.contactEmail || ''}
                          onChange={(e) => setMerchantForm({ ...merchantForm, contactEmail: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={merchantForm.contactPhone || ''}
                          onChange={(e) => setMerchantForm({ ...merchantForm, contactPhone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          value={merchantForm.status}
                          onChange={(e) => setMerchantForm({ ...merchantForm, status: e.target.value as 'active' | 'inactive' })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Categories (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={merchantForm.categories.join(', ')}
                        onChange={(e) => setMerchantForm({ ...merchantForm, categories: e.target.value.split(',').map((c) => c.trim()).filter(Boolean) })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        placeholder="Italian, Pizza, Pasta"
                      />
                    </div>
                  </>
                )}

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
                    {modalType === 'add' ? 'Add' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBase;
