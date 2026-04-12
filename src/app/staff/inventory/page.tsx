// app/staff/inventory/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  FaBox,
  FaShoppingCart,
  FaHistory,
  FaExclamationTriangle,
  FaCheckCircle,
  FaFilter,
  FaSearch,
  FaArrowLeft,
  FaSync,
  FaPlus,
  FaMinus,
  FaTrash,
  FaBoxOpen,
  FaClipboardList,
  FaBan,
  FaExclamationCircle,
  FaUndo
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';
import { staffApi } from '@/lib/api';

interface InventoryItem {
  id: number;
  stock_name: string;
  available: number;
  status: string;
  category?: string;
  min_quantity?: number;
}

interface InventoryHistory {
  log_id: number;
  item_name: string;
  action: string;
  time: string;
  description: string;
}

type ConsumptionAction = 'used' | 'damaged';

export default function StaffInventoryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<InventoryHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [consumingItem, setConsumingItem] = useState<number | null>(null);
  const [consumingAction, setConsumingAction] = useState<ConsumptionAction>('used');
  const [undoingLogId, setUndoingLogId] = useState<number | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Load inventory data
  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiResponse = await staffApi.inventory.actions();
      const response = apiResponse.data?.data || apiResponse.data;
      setInventory(response.inventory || []);
      setHistory(response.my_recent_history || []);

      if (response.inventory?.length > 0) {
        toastSuccess(`Loaded ${response.inventory.length} inventory items successfully!`);
      } else {
        toastInfo('No inventory items found.');
      }

    } catch (err: any) {
      console.error('Error loading inventory data:', err);
      const errorMsg = err.message || 'Failed to load inventory data';
      setError(errorMsg);
      toastError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Consume item
  const consumeItem = async (itemId: number, action: ConsumptionAction) => {
    try {
      setConsumingItem(itemId);

      const apiResponse = await staffApi.inventory.consume({
        item_id: itemId,
        action,
      });
      const response = apiResponse.data?.data || apiResponse.data;

      if (response.status === 200) {
        const message = response.message || `Item marked as ${action} successfully`;
        toastSuccess(message);
        loadInventoryData(); // Refresh data
      }
    } catch (err: any) {
      console.error('Error consuming item:', err);
      const errorMsg = `Failed to mark item: ${err.message || 'Unknown error'}`;
      toastError(errorMsg);
    } finally {
      setConsumingItem(null);
      setShowActionModal(false);
      setSelectedItem(null);
    }
  };

  // Undo consumption action
  const undoConsumption = async (logId: number) => {
    if (!confirm('Are you sure you want to undo this action?')) return;

    try {
      setUndoingLogId(logId);

      const apiResponse = await staffApi.inventory.undo({ log_id: logId });
      const response = apiResponse.data?.data || apiResponse.data;

      if (response.status === 200) {
        const message = response.message || 'Action undone successfully';
        toastSuccess(message);
        loadInventoryData(); // Refresh data
      }
    } catch (err: any) {
      console.error('Error undoing action:', err);
      const errorMsg = `Failed to undo action: ${err.message || 'Unknown error'}`;
      toastError(errorMsg);
    } finally {
      setUndoingLogId(null);
    }
  };

  // Open action modal
  const openActionModal = (item: InventoryItem) => {
    if (item.available <= 0) {
      toastWarning('Stock is 0. Cannot use.');
      return;
    }
    setSelectedItem(item);
    setConsumingAction('used');
    setShowActionModal(true);
  };

  useEffect(() => {
    
        loadInventoryData();
      
  }, []);

  // Filter inventory items
  const filteredItems = inventory.filter(item => {
    const matchesSearch = item.stock_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.category?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(inventory.map(item => item.category).filter(Boolean))) as string[]];

  // Calculate stats
  const stats = {
    totalItems: inventory.length,
    lowStock: inventory.filter(item => item.status === 'Low').length,
    outOfStock: inventory.filter(item => item.available === 0).length,
    goodStock: inventory.filter(item => item.status === 'Good').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/staff')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Inventory Management
          </h1>
        </div>
        <button
          onClick={loadInventoryData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <LoadingSpinner size="sm" /> : <FaSync />} Refresh
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                {stats.totalItems}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FaBox className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Good Stock</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                {stats.goodStock}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FaCheckCircle className="text-green-600 dark:text-green-400 text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {stats.lowStock}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FaExclamationTriangle className="text-amber-600 dark:text-amber-400 text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                {stats.outOfStock}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <FaBoxOpen className="text-red-600 dark:text-red-400 text-xl" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* FILTERS AND SEARCH */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items by name or category..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  toastInfo('Filters cleared');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* INVENTORY ITEMS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FaBox className="text-blue-600" />
            Inventory Items ({filteredItems.length})
          </h2>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <FaExclamationTriangle className="text-4xl mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Error Loading Inventory</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadInventoryData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      item.status === 'Good' 
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : item.status === 'Low'
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <FaBox className={`${
                        item.status === 'Good' 
                          ? 'text-green-600 dark:text-green-400'
                          : item.status === 'Low'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white">
                        {item.stock_name}
                      </h3>
                      {item.category && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.category}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    item.status === 'Good' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : item.status === 'Low'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Available Quantity</p>
                    <p className={`text-2xl font-bold ${
                      item.available > 10
                        ? 'text-green-600 dark:text-green-400'
                        : item.available > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {item.available}
                    </p>
                    {item.min_quantity && item.available <= item.min_quantity && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Below minimum ({item.min_quantity})
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openActionModal(item)}
                        disabled={item.available <= 0 || consumingItem === item.id}
                        className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                          item.available <= 0
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : consumingItem === item.id
                            ? 'bg-blue-700 text-white cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {consumingItem === item.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <FaMinus /> Record Usage
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                      Click to record item usage or damage
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <FaBox className="text-4xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Items Found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              No inventory items match your search criteria.
            </p>
          </div>
        )}
      </div>

      {/* RECENT ACTIVITY */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FaHistory className="text-purple-600" />
            My Recent Activity
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your recent consumption actions
          </p>
        </div>

        {history.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.map((record, index) => (
              <motion.div
                key={record.log_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      record.action === 'used'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                      {record.action === 'used' ? (
                        <FaMinus className="text-red-600 dark:text-red-400" />
                      ) : (
                        <FaExclamationTriangle className="text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 dark:text-white">
                        {record.description}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(record.time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      record.action === 'used'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {record.action}
                    </span>
                    <button
                      onClick={() => undoConsumption(record.log_id)}
                      disabled={undoingLogId === record.log_id}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Undo this action"
                    >
                      {undoingLogId === record.log_id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      ) : (
                        <FaUndo />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <FaHistory className="text-3xl text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No recent activity found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your consumption actions will appear here
            </p>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              setSelectedCategory('all');
              toastInfo('Showing all categories');
            }}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FaBox className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">View All Items</p>
          </button>

          <button
            onClick={() => {
              const lowStockItems = inventory.filter(item => item.status === 'Low');
              if (lowStockItems.length > 0) {
                const itemNames = lowStockItems.map(item => item.stock_name).join(', ');
                toastWarning(`Low stock items: ${itemNames}`);
              } else {
                toastInfo('No low stock items');
              }
            }}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-center"
          >
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FaExclamationTriangle className="text-amber-600 dark:text-amber-400 text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Check Low Stock</p>
          </button>

          <button
            onClick={() => {
              window.print();
              toastInfo('Opening print dialog...');
            }}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-center"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FaClipboardList className="text-purple-600 dark:text-purple-400 text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Print Inventory</p>
          </button>
        </div>
      </div>

      {/* ACTION MODAL */}
      {showActionModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              Record Item Usage
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Select action for <strong>{selectedItem.stock_name}</strong> (Available: {selectedItem.available})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Action
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConsumingAction('used')}
                    className={`p-3 border rounded-lg flex flex-col items-center justify-center transition-colors ${
                      consumingAction === 'used'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FaMinus className={`text-xl mb-2 ${
                      consumingAction === 'used' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      consumingAction === 'used' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'
                    }`}>
                      Used
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Normal consumption</span>
                  </button>

                  <button
                    onClick={() => setConsumingAction('damaged')}
                    className={`p-3 border rounded-lg flex flex-col items-center justify-center transition-colors ${
                      consumingAction === 'damaged'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FaExclamationTriangle className={`text-xl mb-2 ${
                      consumingAction === 'damaged' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      consumingAction === 'damaged' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-white'
                    }`}>
                      Damaged
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Item is damaged</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowActionModal(false);
                      setSelectedItem(null);
                      toastInfo('Action cancelled');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => consumeItem(selectedItem.id, consumingAction)}
                    disabled={consumingItem === selectedItem.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {consumingItem === selectedItem.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        Confirm {consumingAction === 'used' ? 'Usage' : 'Damage'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ERROR MODAL */}
      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <FaExclamationCircle className="text-red-600 dark:text-red-400 text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Error</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
