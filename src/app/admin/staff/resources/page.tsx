'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  FaBus,
  FaBoxes,
  FaUserTie,
  FaMapMarkerAlt,
  FaSearch,
  FaFilter,
  FaTimes,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaClock,
  FaExclamationTriangle,
  FaTruckLoading,
  FaWarehouse,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaIdCard,
  FaPhone,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaInfoCircle,
  FaArrowRight,
  FaSync,
  FaUsers
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo } from '@/lib/toast';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

interface InventoryItem {
  id: number;
  stock_name: string;
  staff_type: string;
  initial_quantity: number;
  current_quantity: number;
  status: 'Good' | 'Low' | 'Critical Low' | 'Out of Stock' | 'Unknown';
  last_updated: string;
  logs: Array<{
    id: number;
    staff_name: string;
    staff_id: string;
    action: string;
    quantity_changed: number;
    timestamp: string;
  }>;
}

interface StaffMember {
  id: number;
  staff_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

interface BulkAddItem {
  stock_name: string;
  quantity: number;
}

interface BulkAddRequest {
  staff_type: string;
  items: BulkAddItem[];
}

interface InventoryPaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface InventorySummary {
  total: number;
  good: number;
  low: number;
  critical: number;
  out_of_stock: number;
  total_quantity: number;
}

type ViewMode = 'inventory' | 'transport' | 'staff';

export default function ResourcesTransportPage () {
  const { theme } = useTheme();
   const searchParams = useSearchParams();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'inventory_school_scope' });
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedStaffType, setSelectedStaffType] = useState<string>('all');
  const [showRedirectBackButton, setShowRedirectBackButton] = useState(false);
  const [isUrlFilterReady, setIsUrlFilterReady] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [itemToDelete, setItemToDelete] = useState<number | null>(null);
const [deleting, setDeleting] = useState(false);
  const [inventoryPagination, setInventoryPagination] = useState<InventoryPaginationMeta>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false
  });
  const [inventorySummary, setInventorySummary] = useState<InventorySummary>({
    total: 0,
    good: 0,
    low: 0,
    critical: 0,
    out_of_stock: 0,
    total_quantity: 0
  });


  // Add inventory form
   const [inventoryForm, setInventoryForm] = useState({
    stock_name: '',
    staff_type: 'external_staff',
    initial_quantity: 0,
    current_quantity: 0
  });

  // Bulk add form
  const [bulkAddForm, setBulkAddForm] = useState<BulkAddRequest>({
    staff_type: 'external_staff',
    items: [{ stock_name: '', quantity: 1 }]
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    item_id: 0,
    stock_name: '',
    staff_type: '',
    add_stock: 0
  });

  const itemsPerPage = 10;



  // Theme classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'indigo') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    const gradients = {
      red: theme === 'dark' ? 'from-gray-800 to-red-900/10' : 'from-white to-red-50',
      emerald: theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50',
      blue: theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50',
      amber: theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50',
      indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50',
    };

    return combine(baseClasses, 'bg-gradient-to-br', gradients[color as keyof typeof gradients] || gradients.indigo);
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border outline-none transition-all w-full',
    theme === 'dark' ? '[color-scheme:dark]' : '[color-scheme:light]',
    'text-xs sm:text-sm',
    '!bg-[var(--color-bg-card)]',
    '!text-[var(--color-text-primary)]',
    'border-[var(--color-border-secondary)]',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    '[&>option]:bg-[var(--color-bg-card)] [&>option]:text-[var(--color-text-primary)]',
    'hover:border-[var(--color-border-strong)]',
    'focus:ring-2 focus:ring-indigo-500',
    'focus:border-[var(--color-accent-primary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
      : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const initialLoadDone = useRef(false);
  
  // Fetch inventory from admin API
const fetchInventory = useCallback(async (
    staffType?: string,
    searchOverride?: string,
    pageOverride?: number
  ) => {
    setLoading(true);
    try {
      const effectiveSearch = searchOverride !== undefined ? searchOverride : searchTerm;
      const effectivePage = pageOverride !== undefined ? pageOverride : currentPage;
      const response = await adminApi.inventory.listPaginated({
        staff_type: staffType && staffType !== 'all' ? staffType : undefined,
        search: effectiveSearch || undefined,
        page: effectivePage,
        page_size: itemsPerPage,
        ...schoolScope.scopeParams,
      });
      const data = response.data;
      if (data.data) {
        const inventoryWithLogs = data.data.map((item: any) => ({
          ...item,
          logs: item.logs || []
        }));
        setInventory(inventoryWithLogs);
        if (data.pagination) {
          const serverPage = Number(data.pagination.page || effectivePage);
          setInventoryPagination({
            page: serverPage,
            page_size: Number(data.pagination.page_size || itemsPerPage),
            total: Number(data.pagination.total || 0),
            total_pages: Number(data.pagination.total_pages || 1),
            has_next: Boolean(data.pagination.has_next),
            has_previous: Boolean(data.pagination.has_previous)
          });
          if (serverPage !== effectivePage) {
            setCurrentPage(serverPage);
          }
        }
        if (data.summary) {
          setInventorySummary({
            total: Number(data.summary.total || 0),
            good: Number(data.summary.good || 0),
            low: Number(data.summary.low || 0),
            critical: Number(data.summary.critical || 0),
            out_of_stock: Number(data.summary.out_of_stock || 0),
            total_quantity: Number(data.summary.total_quantity || 0)
          });
        }
      } else {
        setInventory([]);
        setInventoryPagination({
          page: effectivePage,
          page_size: itemsPerPage,
          total: 0,
          total_pages: 1,
          has_next: false,
          has_previous: false
        });
        setInventorySummary({
          total: 0,
          good: 0,
          low: 0,
          critical: 0,
          out_of_stock: 0,
          total_quantity: 0
        });
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toastError('Network error while fetching inventory');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage, schoolScope.selectedSchoolId]);

  // Fetch staff list
  const fetchStaffList = useCallback(async () => {
    try {
      const response = await adminApi.staff.list(schoolScope.scopeParams);
      const data = response.data;
      setStaffList(data?.data || data || []);
    } catch (error) {
      console.error('Error fetching staff list:', error);
      toastError('Failed to fetch staff list');
    }
  }, [schoolScope.selectedSchoolId]);

  useEffect(() => {
    const searchParam = searchParams.get('search') || '';
    const staffTypeParam = searchParams.get('staffType');
    const redirectedFrom = searchParams.get('redirectedFrom');

    const normalizedStaffType = (staffTypeParam || 'all')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    const validStaffTypes = new Set([
      'all',
      'admin_staff',
      'finance_staff',
      'it_staff',
      'operations_staff',
      'transport_staff',
      'external_staff'
    ]);

    setSearchTerm(searchParam);
    setSelectedStaffType(validStaffTypes.has(normalizedStaffType) ? normalizedStaffType : 'all');
    setCurrentPage(1);
    setViewMode('inventory');
    setShowRedirectBackButton(redirectedFrom === 'staff-directory');
    setIsUrlFilterReady(true);
  }, [searchParams]);

  const handleRedirectBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/admin/staff/directory';
  };

  // Add single inventory item
  const addInventoryItem = async () => {
    try {
      const response = await adminApi.inventory.createBulk({
        staff_type: inventoryForm.staff_type,
        items: [{
          stock_name: inventoryForm.stock_name,
          quantity: inventoryForm.initial_quantity,
        }],
        ...schoolScope.scopeParams,
      });
      const data = response.data;

      if (response.status === 200) {
        toastSuccess(data.message || 'Inventory item added successfully');
        setShowAddInventoryModal(false);
        setInventoryForm({
          stock_name: '',
          staff_type: 'external_staff',
          initial_quantity: 0,
          current_quantity: 0
        });
        fetchInventory();
      } else {
        toastError(data.error || 'Failed to add inventory item');
      }
    } catch (error) {
      console.error('Error adding inventory:', error);
      toastError('Network error');
    }
  };

  // Bulk add inventory items
  const bulkAddInventoryItems = async () => {
    try {
      const response = await adminApi.inventory.createBulk({
        ...bulkAddForm,
        ...schoolScope.scopeParams,
      });
      const data = response.data;

      if (response.status === 200) {
        toastSuccess(data.message || 'Inventory items added successfully');
        setShowBulkAddModal(false);
        setBulkAddForm({
          staff_type: 'external_staff',
          items: [{ stock_name: '', quantity: 1 }]
        });
        fetchInventory();
      } else {
        toastError(data.error || 'Failed to add inventory items');
      }
    } catch (error) {
      console.error('Error bulk adding inventory:', error);
      toastError('Network error');
    }
  };

  // Edit inventory item
  const editInventoryItem = async () => {
    try {
      const response = await adminApi.inventory.update({
        item_id: editForm.item_id,
        stock_name: editForm.stock_name,
        add_stock: editForm.add_stock || undefined,
        ...schoolScope.scopeParams,
      });
      const data = response.data;

      if (response.status === 200) {
        toastSuccess(data.message || 'Inventory item updated successfully');
        setShowEditModal(false);
        setEditForm({
          item_id: 0,
          stock_name: '',
          staff_type: '',
          add_stock: 0
        });
        fetchInventory();
      } else {
        toastError(data.error || 'Failed to update inventory item');
      }
    } catch (error) {
      console.error('Error editing inventory:', error);
      toastError('Network error');
    }
  };

  // Delete inventory item
  const deleteInventoryItem = async (itemId: number) => {
  setItemToDelete(itemId);
  setShowDeleteConfirm(true);
};

const handleConfirmedDelete = async () => {
  if (!itemToDelete) return;
  
  setDeleting(true);
  try {
    const response = await adminApi.inventory.delete(itemToDelete, schoolScope.scopeParams);
    const data = response.data;

    if (response.status === 200) {
      toastSuccess(data.message || 'Inventory item deleted successfully');
      fetchInventory();
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } else {
      toastError(data.error || 'Failed to delete inventory item');
    }
  } catch (error) {
    console.error('Error deleting inventory:', error);
    toastError('Network error');
  } finally {
    setDeleting(false);
  }
};
  // Initialize edit form
  const handleEditClick = (item: InventoryItem) => {
    setEditForm({
      item_id: item.id,
      stock_name: item.stock_name,
      staff_type: item.staff_type,
      add_stock: 0
    });
    setShowEditModal(true);
  };

  // Add more items to bulk add form
  const addBulkItemField = () => {
    setBulkAddForm({
      ...bulkAddForm,
      items: [...bulkAddForm.items, { stock_name: '', quantity: 1 }]
    });
  };

  // Remove item from bulk add form
  const removeBulkItemField = (index: number) => {
    const newItems = bulkAddForm.items.filter((_, i) => i !== index);
    setBulkAddForm({ ...bulkAddForm, items: newItems });
  };

  // Update bulk item field
  const updateBulkItemField = (index: number, field: keyof BulkAddItem, value: string | number) => {
    const newItems = [...bulkAddForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setBulkAddForm({ ...bulkAddForm, items: newItems });
  };

  useEffect(() => {
    fetchStaffList();
    initialLoadDone.current = true;
    setCurrentPage(1);
    setSelectedItem(null);
    setShowAddInventoryModal(false);
    setShowBulkAddModal(false);
    setShowEditModal(false);
  }, [fetchStaffList, schoolScope.selectedSchoolId]);

  // Fetch inventory when view mode or staff type changes, but not on every render
  useEffect(() => {
    if (viewMode === 'inventory' && initialLoadDone.current && isUrlFilterReady) {
      fetchInventory(selectedStaffType);
    }
  }, [viewMode, selectedStaffType, currentPage, searchTerm, fetchInventory, isUrlFilterReady, schoolScope.selectedSchoolId]);

  // Filter staff based on search term
  const filteredStaff = staffList.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.staff_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = inventoryPagination.total_pages || 1;
  const activePage = inventoryPagination.page || currentPage;
  const indexOfFirstItem = inventoryPagination.total > 0 ? ((activePage - 1) * itemsPerPage) + 1 : 0;
  const indexOfLastItem = inventoryPagination.total > 0 ? ((activePage - 1) * itemsPerPage) + inventory.length : 0;
  const currentInventory = inventory;

  const staffItemsPerPage = 10;
  const staffTotalPages = Math.ceil(filteredStaff.length / staffItemsPerPage);
  const staffIndexOfLastItem = currentPage * staffItemsPerPage;
  const staffIndexOfFirstItem = staffIndexOfLastItem - staffItemsPerPage;
  const currentStaff = filteredStaff.slice(staffIndexOfFirstItem, staffIndexOfLastItem);

  // Statistics
  const inventoryStats = {
    total: inventorySummary.total,
    good: inventorySummary.good,
    low: inventorySummary.low,
    critical: inventorySummary.critical,
    outOfStock: inventorySummary.out_of_stock,
    totalQuantity: inventorySummary.total_quantity
  };

  const staffStats = {
    total: staffList.length,
    admin: staffList.filter(staff => staff.role === 'admin_staff').length,
    finance: staffList.filter(staff => staff.role === 'finance_staff').length,
    it: staffList.filter(staff => staff.role === 'it_staff').length,
    operations: staffList.filter(staff => staff.role === 'operations_staff').length,
    transport: staffList.filter(staff => staff.role === 'transport_staff').length,
    external: staffList.filter(staff => staff.role === 'external_staff').length
  };

  const getStatusBadgeClass = (status: string) => {
    const classes = {
      'Good': theme === 'dark' 
        ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' 
        : 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Low': theme === 'dark' 
        ? 'bg-amber-900/30 text-amber-300 border-amber-800' 
        : 'bg-amber-100 text-amber-700 border-amber-200',
      'Critical Low': theme === 'dark' 
        ? 'bg-red-900/30 text-red-300 border-red-800' 
        : 'bg-red-100 text-red-700 border-red-200',
      'Out of Stock': theme === 'dark' 
        ? 'bg-gray-900/30 text-gray-300 border-gray-800' 
        : 'bg-gray-100 text-gray-700 border-gray-200',
      'Unknown': theme === 'dark' 
        ? 'bg-gray-900/30 text-gray-300 border-gray-800' 
        : 'bg-gray-100 text-gray-700 border-gray-200',
    };

    return combine(
      'px-3 py-1.5 text-xs font-medium rounded-full border',
      classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-700'
    );
  };

  const viewInventoryDetails = (item: InventoryItem) => {
    setSelectedItem(item);
  };

  const exportInventoryReport = async () => {
    try {
      const headers = ['Item Name', 'Staff Type', 'Initial Quantity', 'Current Quantity', 'Status', 'Last Updated'];
      const allItems: InventoryItem[] = [];
      let page = 1;
      let hasMore = true;
      const exportPageSize = 200;

      while (hasMore) {
        const response = await adminApi.inventory.listPaginated({
          staff_type: selectedStaffType && selectedStaffType !== 'all' ? selectedStaffType : undefined,
          search: searchTerm || undefined,
          page,
          page_size: exportPageSize,
          ...schoolScope.scopeParams,
        });

        const data = response.data || {};
        const pageItems = Array.isArray(data.data) ? data.data : [];
        const normalized = pageItems.map((item: any) => ({
          ...item,
          logs: item.logs || [],
        }));
        allItems.push(...normalized);

        const hasNextFromPagination = Boolean(data?.pagination?.has_next);
        const nextPage = Number(data?.pagination?.page || page) + 1;
        if (hasNextFromPagination) {
          page = nextPage;
        } else {
          hasMore = false;
        }
      }

      if (allItems.length === 0) {
        toastInfo('No inventory data to export');
        return;
      }

      const csvData = allItems.map(item => [
        item.stock_name,
        item.staff_type,
        item.initial_quantity,
        item.current_quantity,
        item.status,
        new Date(item.last_updated).toLocaleDateString()
      ]);
      
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toastSuccess(`Inventory report exported successfully! (${allItems.length} items)`);
    } catch (error) {
      console.error('Error exporting inventory CSV:', error);
      toastError('Failed to export inventory report');
    }
  };

  const formatStaffType = (staffType: string) => {
    return staffType.replace('_staff', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const STAFF_TYPE_OPTIONS = [
    { value: 'all', label: 'All Departments' },
    { value: 'admin_staff', label: 'Admin Staff' },
    { value: 'finance_staff', label: 'Finance Staff' },
    { value: 'it_staff', label: 'IT Staff' },
    { value: 'operations_staff', label: 'Operations Staff' },
    { value: 'transport_staff', label: 'Transport Staff' },
    { value: 'external_staff', label: 'External Staff' },
  ];

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1920px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center justify-between w-full lg:w-auto">
              <div className="flex items-center gap-2 sm:gap-3 sm:space-x-1">
                <div className={combine(
                  "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                  theme === 'dark' 
                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700" 
                    : "bg-gradient-to-br from-indigo-500 to-indigo-600"
                )}>
                  <FaBoxes className="text-xl sm:text-2xl text-white" />
                </div>
                <div>
                  <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold leading-tight", get('text', 'primary'))}>
                    Staff Inventory Management
                  </h1>
                  <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                    Manage inventory items for different staff departments
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex w-full lg:w-auto flex-wrap items-center gap-2 sm:gap-3">
              <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
              {showRedirectBackButton && (
                <button
                  onClick={handleRedirectBack}
                  className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
                >
                  <span>Back</span>
                </button>
              )}
              <button
                onClick={exportInventoryReport}
                className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
              >
                <FaDownload className="text-xs" />
                <span>Export Report</span>
              </button>
              
              <button
                onClick={() => setShowBulkAddModal(true)}
                className={combine(getPrimaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
              >
                <FaPlus className="text-xs" />
                <span>Bulk Add</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <div className={getCardGradientClass('indigo')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Items</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{inventoryStats.total}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaBoxes className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('text', 'tertiary'))}>
                Inventory items
              </div>
            </div>
            
            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Good Stock</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{inventoryStats.good}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FaWarehouse className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'success'))}>
                {inventoryStats.total > 0 ? Math.round((inventoryStats.good / inventoryStats.total) * 100) : 0}% of items
              </div>
            </div>
            
            <div className={getCardGradientClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Low Stock</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{inventoryStats.low}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaExclamationTriangle className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'warning'))}>
                Needs attention
              </div>
            </div>
            
            <div className={getCardGradientClass('red')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Critical</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{inventoryStats.critical}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                )}>
                  <FaExclamationTriangle className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'error'))}>
                Urgent restocking needed
              </div>
            </div>
            
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Quantity</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {inventoryStats.totalQuantity.toLocaleString()}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaTruckLoading className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'primary'))}>
                Total stock count
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={getCardGradientClass('indigo')}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <FaSearch className={combine(
                "absolute left-4 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm",
                get('icon', 'secondary')
              )} />
              <input
                type="text"
                placeholder="Search inventory items or staff names..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={getInputClass()}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>
          <div>
            <select
              value={selectedStaffType}
              onChange={(e) => {
                setSelectedStaffType(e.target.value);
                setCurrentPage(1);
              }}
              className={getInputClass()}
            >
              {STAFF_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button
              onClick={() => fetchInventory(selectedStaffType)}
              className={combine(getSecondaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
            >
              <FaSync className="text-xs sm:text-sm" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStaffType('all');
                setCurrentPage(1);
              }}
              className={combine(getSecondaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
            >
              <FaTimes className="text-xs sm:text-sm" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

        {/* Inventory View */}
        <div className={getCardGradientClass()}>
          <div className={combine("p-4 border-b", get('border', 'primary'))}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
              <div>
                <h3 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>Staff Inventory</h3>
                <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                  View and manage inventory items for staff departments
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className={combine("text-xs", get('text', 'tertiary'))}>
                  Showing {indexOfFirstItem} to {indexOfLastItem} of {inventoryPagination.total} items
                </div>
                <button
                  onClick={() => setShowAddInventoryModal(true)}
                  className={combine(getPrimaryButtonClass(), "flex items-center space-x-2")}
                >
                  <FaPlus className="text-xs sm:text-sm" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="text-center">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaBoxes className="h-8 w-8 text-indigo-600 animate-pulse" />
                    </div>
                  </div>
                  <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading inventory...</p>
                  <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing inventory records</p>
                </div>
              </div>
            ) : currentInventory.length === 0 ? (
              <div className="p-8 text-center">
                <div className={combine(
                  "inline-block p-3 rounded-full mb-3",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaBoxes className={combine(
                    "text-xl",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
                  )} />
                </div>
                <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No inventory items found</h3>
                <p className={combine("text-xs sm:text-sm mb-4", get('text', 'secondary'))}>
                  {searchTerm || selectedStaffType !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Add inventory items to get started'}
                </p>
                {!searchTerm && selectedStaffType === 'all' && (
                  <button
                    onClick={() => setShowAddInventoryModal(true)}
                    className={combine(getPrimaryButtonClass(), "mt-2")}
                  >
                    Add First Item
                  </button>
                )}
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={combine("bg-[var(--color-bg-secondary)]", get('border', 'primary'))}>
                    <tr>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Item Details
                      </th>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Department
                      </th>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Quantity
                      </th>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Status
                      </th>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Last Updated
                      </th>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={combine("divide-y", get('border', 'primary'))}>
                    {currentInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--color-bg-hover)]">
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <div className="font-medium text-xs sm:text-sm">{item.stock_name}</div>
                          <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                            ID: {item.id}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <span className={combine(
                            "px-3 py-1.5 text-xs font-medium rounded-full border",
                            theme === 'dark' 
                              ? 'bg-blue-900/30 text-blue-300 border-blue-800' 
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                          )}>
                            {formatStaffType(item.staff_type)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <div className="text-xs sm:text-sm">
                            <span className={combine("font-bold", get('text', 'primary'))}>
                              {item.current_quantity}
                            </span>
                            <span className={combine("text-xs ml-2", get('text', 'tertiary'))}>
                              / {item.initial_quantity}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                            <div 
                              className={combine(
                                "h-1.5 rounded-full",
                                item.current_quantity / item.initial_quantity > 0.5 
                                  ? 'bg-emerald-500' 
                                  : item.current_quantity / item.initial_quantity > 0.2 
                                  ? 'bg-amber-500' 
                                  : 'bg-red-500'
                              )}
                              style={{ width: `${Math.min(100, (item.current_quantity / item.initial_quantity) * 100)}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <span className={getStatusBadgeClass(item.status)}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <div className="text-xs sm:text-sm">
                            {new Date(item.last_updated).toLocaleDateString()}
                          </div>
                          <div className={combine("text-xs", get('text', 'tertiary'))}>
                            {new Date(item.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditClick(item)}
                              className={combine(
                                "px-3 py-1.5 text-xs rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
                                theme === 'dark'
                                  ? 'bg-amber-900/30 text-amber-300 hover:bg-amber-800/30'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              )}
                            >
                              <FaEdit className="inline mr-1" /> Add
                            </button>
                            <button
                              onClick={() => viewInventoryDetails(item)}
                              className={combine(
                                "px-3 py-1.5 text-xs rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
                                theme === 'dark'
                                  ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              )}
                            >
                              <FaInfoCircle className="inline mr-1" /> Logs
                            </button>
                            <button
  onClick={() => deleteInventoryItem(item.id)}
  className={combine(
    "px-3 py-1.5 text-xs rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
    theme === 'dark'
      ? 'bg-red-900/30 text-red-300 hover:bg-red-800/30'
      : 'bg-red-100 text-red-700 hover:bg-red-200'
  )}
>
  <FaTrash className="inline mr-1" />
</button>

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={combine("px-3 sm:px-4 py-2.5 sm:py-3 border-t", get('border', 'primary'))}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                      <p className={combine("text-xs", get('text', 'tertiary'))}>
                        Page {activePage} of {totalPages}
                      </p>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={!inventoryPagination.has_previous}
                          className={combine(
                            "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm",
                            getSecondaryButtonClass()
                          )}
                        >
                          <FaChevronLeft className="text-xs" />
                        </button>
                        
                        <div className="flex space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (activePage <= 3) {
                              pageNum = i + 1;
                            } else if (activePage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = activePage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={combine(
                                  "px-3 py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                  activePage === pageNum
                                    ? getPrimaryButtonClass()
                                    : getSecondaryButtonClass()
                                )}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={!inventoryPagination.has_next}
                          className={combine(
                            "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm",
                            getSecondaryButtonClass()
                          )}
                        >
                          <FaChevronRight className="text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Inventory Modal */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('emerald'),
            "max-w-md w-full shadow-2xl"
          )}>
            <div className="flex justify-between items-center mb-4 sm:mb-5">
              <h2 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>Add Inventory Item</h2>
              <button onClick={() => {
                setShowAddInventoryModal(false);
                setInventoryForm({
                  stock_name: '',
                  staff_type: 'external_staff',
                  initial_quantity: 0,
                  current_quantity: 0
                });
              }} className={combine(
                "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary') + " text-xs sm:text-sm"
              )}>
                <FaTimes className="text-xs sm:text-sm" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Item Name *</label>
                <input
                  type="text"
                  value={inventoryForm.stock_name}
                  onChange={(e) => setInventoryForm({...inventoryForm, stock_name: e.target.value})}
                  placeholder="Enter item name"
                  className={getInputClass()}
                  required
                />
              </div>

              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Department *</label>
                <select
                  value={inventoryForm.staff_type}
                  onChange={(e) => setInventoryForm({...inventoryForm, staff_type: e.target.value})}
                  className={getInputClass()}
                  required
                >
                  <option value="admin_staff">Admin Staff</option>
                  <option value="finance_staff">Finance Staff</option>
                  <option value="it_staff">IT Staff</option>
                  <option value="operations_staff">Operations Staff</option>
                  <option value="transport_staff">Transport Staff</option>
                  <option value="external_staff">External Staff</option>
                </select>
              </div>

              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Initial Quantity *</label>
                <input
                  type="number"
                  value={inventoryForm.initial_quantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setInventoryForm({
                      ...inventoryForm,
                      initial_quantity: value,
                      current_quantity: value
                    });
                  }}
                  placeholder="Initial stock"
                  className={getInputClass()}
                  required
                  min="0"
                />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowAddInventoryModal(false);
                    setInventoryForm({
                      stock_name: '',
                      staff_type: 'external_staff',
                      initial_quantity: 0,
                      current_quantity: 0
                    });
                  }}
                  className={combine(getSecondaryButtonClass(), "flex-1 text-xs sm:text-sm")}
                >
                  Cancel
                </button>
                <button
                  onClick={addInventoryItem}
                  disabled={!inventoryForm.stock_name || !inventoryForm.initial_quantity}
                  className={combine(
                    getPrimaryButtonClass(),
                    "flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                  )}
                >
                  <FaPlus className="text-xs sm:text-sm" /> Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('blue'),
            "max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          )}>
            <div className="flex justify-between items-center mb-4 sm:mb-5">
              <h2 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>Bulk Add Inventory Items</h2>
              <button onClick={() => {
                setShowBulkAddModal(false);
                setBulkAddForm({
                  staff_type: 'external_staff',
                  items: [{ stock_name: '', quantity: 1 }]
                });
              }} className={combine(
                "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary') + " text-xs sm:text-sm"
              )}>
                <FaTimes className="text-xs sm:text-sm" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Department *</label>
                <select
                  value={bulkAddForm.staff_type}
                  onChange={(e) => setBulkAddForm({...bulkAddForm, staff_type: e.target.value})}
                  className={getInputClass()}
                  required
                >
                  <option value="admin_staff">Admin Staff</option>
                  <option value="finance_staff">Finance Staff</option>
                  <option value="it_staff">IT Staff</option>
                  <option value="operations_staff">Operations Staff</option>
                  <option value="transport_staff">Transport Staff</option>
                  <option value="external_staff">External Staff</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className={combine("block text-xs sm:text-sm font-medium", get('text', 'primary'))}>Items to Add *</label>
                  <button
                    type="button"
                    onClick={addBulkItemField}
                    className={combine(getSecondaryButtonClass(), "text-xs py-1.5 px-3")}
                  >
                    <FaPlus className="inline mr-1" /> Add Row
                  </button>
                </div>
                
                <div className="space-y-3">
                  {bulkAddForm.items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.stock_name}
                          onChange={(e) => updateBulkItemField(index, 'stock_name', e.target.value)}
                          placeholder="Item name"
                          className={getInputClass()}
                          required
                        />
                      </div>
                      <div className="w-full sm:w-32">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateBulkItemField(index, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="Quantity"
                          className={getInputClass()}
                          required
                          min="1"
                        />
                      </div>
                      {bulkAddForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBulkItemField(index)}
                          className={combine(
                            "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                            get('icon', 'accent')
                          )}
                        >
                          <FaTimes className="text-xs sm:text-sm" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowBulkAddModal(false);
                    setBulkAddForm({
                      staff_type: 'external_staff',
                      items: [{ stock_name: '', quantity: 1 }]
                    });
                  }}
                  className={combine(getSecondaryButtonClass(), "flex-1 text-xs sm:text-sm")}
                >
                  Cancel
                </button>
                <button
                  onClick={bulkAddInventoryItems}
                  disabled={bulkAddForm.items.some(item => !item.stock_name || item.quantity < 1)}
                  className={combine(
                    getPrimaryButtonClass(),
                    "flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                  )}
                >
                  <FaPlus className="text-xs sm:text-sm" /> Add {bulkAddForm.items.length} Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inventory Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('amber'),
            "max-w-md w-full shadow-2xl"
          )}>
            <div className="flex justify-between items-center mb-4 sm:mb-5">
              <h2 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>Edit Inventory Item</h2>
              <button onClick={() => setShowEditModal(false)} className={combine(
                "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary') + " text-xs sm:text-sm"
              )}>
                <FaTimes className="text-xs sm:text-sm" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Item Name</label>
                <input
                  type="text"
                  value={editForm.stock_name}
                  onChange={(e) => setEditForm({...editForm, stock_name: e.target.value})}
                  placeholder="Enter item name"
                  className={getInputClass()}
                  required
                />
              </div>

              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Add Stock (Optional)</label>
                <input
                  type="number"
                  value={editForm.add_stock}
                  onChange={(e) => setEditForm({...editForm, add_stock: parseInt(e.target.value) || 0})}
                  placeholder="Enter quantity to add"
                  className={getInputClass()}
                  min="0"
                />
                <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                  Enter quantity to restock. Leave 0 to only update item name.
                </p>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowEditModal(false)}
                  className={combine(getSecondaryButtonClass(), "flex-1 text-xs sm:text-sm")}
                >
                  Cancel
                </button>
                <button
                  onClick={editInventoryItem}
                  disabled={!editForm.stock_name}
                  className={combine(
                    getPrimaryButtonClass(),
                    "flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                  )}
                >
                  <FaEdit className="text-xs sm:text-sm" /> Update Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass(),
            "max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          )}>
            <div className="flex justify-between items-center mb-4 sm:mb-5">
              <div>
                <h2 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>{selectedItem.stock_name}</h2>
                <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                  Inventory ID: {selectedItem.id} • Department: {formatStaffType(selectedItem.staff_type)}
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} className={combine(
                "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary') + " text-xs sm:text-sm"
              )}>
                <FaTimes className="text-xs sm:text-sm" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
                <div className={combine("p-3 sm:p-4 rounded-lg sm:rounded-xl", get('bg', 'secondary'))}>
                  <p className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>Current Quantity</p>
                  <p className={combine("font-medium text-base sm:text-lg", get('text', 'primary'))}>
                    {selectedItem.current_quantity}
                  </p>
                </div>
                <div className={combine("p-3 sm:p-4 rounded-lg sm:rounded-xl", get('bg', 'secondary'))}>
                  <p className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>Initial Quantity</p>
                  <p className={combine("font-medium text-base sm:text-lg", get('text', 'primary'))}>
                    {selectedItem.initial_quantity}
                  </p>
                </div>
                <div className={combine("p-3 sm:p-4 rounded-lg sm:rounded-xl", get('bg', 'secondary'))}>
                  <p className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>Stock Level</p>
                  <p className={combine("font-medium text-base sm:text-lg", get('text', 'primary'))}>
                    {Math.round((selectedItem.current_quantity / selectedItem.initial_quantity) * 100)}%
                  </p>
                </div>
                <div className={combine("p-3 sm:p-4 rounded-lg sm:rounded-xl", get('bg', 'secondary'))}>
                  <p className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>Status</p>
                  <span className={getStatusBadgeClass(selectedItem.status)}>
                    {selectedItem.status}
                  </span>
                </div>
              </div>

              <div>
                <h3 className={combine("text-xs sm:text-sm font-medium mb-3", get('text', 'primary'))}>Inventory Logs</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedItem.logs.length === 0 ? (
                    <p className={combine("text-center py-4 text-xs sm:text-sm", get('text', 'tertiary'))}>No logs available</p>
                  ) : (
                    selectedItem.logs.map((log) => (
                      <div key={log.id} className={combine("p-3 sm:p-4 rounded-lg sm:rounded-xl", get('bg', 'secondary'))}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-xs sm:text-sm">
                              {log.staff_name || 'Admin'}
                            </div>
                            <div className={combine("text-xs", get('text', 'tertiary'))}>
                              {log.staff_id || 'System'} • {log.action.replace('_', ' ')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={combine(
                              "text-xs sm:text-sm font-bold",
                              log.quantity_changed > 0 ? get('accent', 'success') : get('accent', 'error')
                            )}>
                              {log.quantity_changed > 0 ? '+' : ''}{log.quantity_changed}
                            </div>
                            <div className={combine("text-xs", get('text', 'tertiary'))}>
                              {new Date(log.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {showDeleteConfirm && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in backdrop-blur-sm">
    <div className={combine(
      getCardGradientClass('red'),
      "max-w-md w-full shadow-2xl"
    )}>
      <div className="text-center">
        <div className={combine(
          "mx-auto flex items-center justify-center h-10 sm:h-12 w-10 sm:w-12 rounded-full mb-3",
          theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
        )}>
          <FaTrash className={combine(
            "h-4 sm:h-5 w-4 sm:w-5",
            theme === 'dark' ? 'text-red-400' : 'text-red-600'
          )} />
        </div>
        <h3 className={combine("text-base sm:text-lg font-bold mb-1.5", get('text', 'primary'))}>
          Delete Inventory Item
        </h3>
        <p className={combine("text-xs sm:text-sm mb-4", get('text', 'secondary'))}>
          Are you sure you want to delete this inventory item? This action cannot be undone and will remove all associated logs.
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setShowDeleteConfirm(false);
              setItemToDelete(null);
            }}
            className={combine(getSecondaryButtonClass(), "text-xs sm:text-sm flex-1")}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmedDelete}
            disabled={deleting}
            className={combine(
              getPrimaryButtonClass(),
              "text-xs sm:text-sm flex-1",
              theme === 'dark'
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
            )}
          >
            {deleting ? (
              <div className="flex items-center justify-center">
                <div className={combine(
                  "animate-spin h-4 w-4 border-2 rounded-full mr-2",
                  "border-white border-t-transparent"
                )}></div>
                <span>Deleting...</span>
              </div>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};
