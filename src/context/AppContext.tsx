import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Item, 
  Category, 
  Tag, 
  Sale, 
  Customer, 
  CustomerRequest,
  CustomerRequestStatus,
  User, 
  UserRole,
  ActivityLog, 
  BusinessSettings, 
  ItemStatus, 
  ItemCondition 
} from '../types';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_CUSTOMERS, 
  INITIAL_ITEMS, 
  INITIAL_SALES, 
  INITIAL_SETTINGS, 
  INITIAL_TAGS, 
  INITIAL_USERS, 
  INITIAL_ACTIVITY_LOGS 
} from '../data/initialData';
import { localDataSync } from '../data/storage';
import { deleteSupabaseRecord, hasSupabase, loadSupabaseCollection, upsertSupabaseRecord } from '../data/supabaseSync';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (username: string, pin: string) => { success: boolean; message: string };
  logout: () => void;
  
  // Items
  items: Item[];
  activeItems: Item[];
  recycleBinItems: Item[];
  addItem: (itemData: Omit<Item, 'id' | 'code' | 'dateAdded' | 'status'> & { customCode?: string }) => Item;
  updateItem: (id: string, updates: Partial<Item>) => void;
  deleteItem: (id: string) => { success: boolean; message: string };
  restoreItem: (id: string) => void;
  permanentlyDeleteItem: (id: string) => void;
  markItemAsSold: (
    itemId: string, 
    soldPrice: number, 
    customerName: string, 
    customerPhone: string, 
    note?: string
  ) => { success: boolean; message: string; sale?: Sale };
  toggleReserveItem: (itemId: string) => void;
  generateNextItemCode: (categoryId: string) => string;
  getItemByCode: (code: string) => Item | undefined;

  // Categories
  categories: Category[];
  addCategory: (name: string, prefix?: string, description?: string) => string;
  generateCategoryCode: (name: string, preferredPrefix?: string) => string;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  addSubcategory: (categoryId: string, name: string) => string;
  addItemType: (categoryId: string, subcategoryId: string, name: string) => string;
  deleteCategory: (id: string) => void;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => void;
  deleteItemType: (categoryId: string, subcategoryId: string, typeId: string) => void;

  // Tags
  tags: Tag[];
  addTag: (name: string, color: string, description?: string) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;

  // Sales
  sales: Sale[];

  // Customers
  customers: Customer[];
  customerRequests: CustomerRequest[];
  addCustomerRequest: (request: Omit<CustomerRequest, 'id' | 'requestDate' | 'status'>) => void;
  updateCustomerRequest: (id: string, updates: Partial<Pick<CustomerRequest, 'status' | 'customerName' | 'customerPhone' | 'itemName' | 'quantity' | 'notes'>>) => void;
  deleteCustomerRequest: (id: string) => void;
  addOrUpdateCustomer: (name: string, phone: string, itemCode: string, amount: number, note?: string) => void;
  updateCustomerNotes: (id: string, notes: string) => void;

  // Users & Staff
  users: User[];
  addUser: (name: string, username: string, password: string, role: UserRole, phone?: string) => { success: boolean; message: string };
  updateUser: (id: string, updates: Partial<User>) => void;
  toggleUserStatus: (id: string) => void;
  deleteUser: (id: string) => void;

  // Activity Logs
  activityLogs: ActivityLog[];
  logAction: (action: string, details: string, itemCode?: string) => void;

  // Settings
  settings: BusinessSettings;
  updateSettings: (updates: Partial<BusinessSettings>) => void;

  // Modals & Navigation Helpers
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedItemForDetail: Item | null;
  setSelectedItemForDetail: (item: Item | null) => void;
  isAddItemOpen: boolean;
  setIsAddItemOpen: (open: boolean) => void;
  isQRScannerOpen: boolean;
  setIsQRScannerOpen: (open: boolean) => void;
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;
  isRecycleBinOpen: boolean;
  setIsRecycleBinOpen: (open: boolean) => void;
  isGoogleSheetsModalOpen: boolean;
  setIsGoogleSheetsModalOpen: (open: boolean) => void;
  selectedItemForSale: Item | null;
  setSelectedItemForSale: (item: Item | null) => void;
  
  // Label Printing Selection
  selectedLabelItemCodes: string[];
  toggleLabelSelection: (code: string) => void;
  selectAllLabels: (codes: string[]) => void;
  clearLabelSelection: () => void;

  // Helpers
  getStockAge: (dateStr: string) => number;
  formatCurrency: (amount: number) => string;
  resetAllDataToDefault: () => void;
  exportToCSV: (type: 'items' | 'sales' | 'customers') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load from localStorage or seed
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (!localStorage.getItem('wdj_admin_pin')) {
      localStorage.setItem('wdj_admin_pin', '1234');
    }
    const saved = localStorage.getItem('wdj_current_user');
    return localStorage.getItem('wdj_admin_authenticated') === 'true' && saved
      ? { ...JSON.parse(saved), name: 'WDJLANKA Admin', username: 'wdjlanka' }
      : null;
  });

  const [items, setItems] = useState<Item[]>(() => {
    return localDataSync.load('wdj_items_v2', INITIAL_ITEMS);
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('wdj_categories_v2');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [tags, setTags] = useState<Tag[]>(() => {
    const saved = localStorage.getItem('wdj_tags_v2');
    return saved ? JSON.parse(saved) : INITIAL_TAGS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    return localDataSync.load('wdj_sales_v2', INITIAL_SALES);
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    return localDataSync.load('wdj_customers_v2', INITIAL_CUSTOMERS);
  });

  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>(() => {
    return localDataSync.load('wdj_customer_requests_v1', []);
  });
  const [supabaseHydrated, setSupabaseHydrated] = useState(!hasSupabase());

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('wdj_users_v2');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('wdj_logs_v2');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITY_LOGS;
  });

  const [settings, setSettings] = useState<BusinessSettings>(() => {
    const saved = localStorage.getItem('wdj_settings_v2');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // UI state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [selectedItemForSale, setSelectedItemForSale] = useState<Item | null>(null);
  const [selectedLabelItemCodes, setSelectedLabelItemCodes] = useState<string[]>(['B001', 'B002', 'M001', 'M003', 'H001', 'E001']);

  // Sync to localStorage
  useEffect(() => {
    if (!hasSupabase()) return;
    let cancelled = false;
    Promise.all([
      loadSupabaseCollection<Item>('items'),
      loadSupabaseCollection<Category>('categories'),
      loadSupabaseCollection<Sale>('sales'),
      loadSupabaseCollection<Customer>('customers'),
      loadSupabaseCollection<CustomerRequest>('customer_requests'),
    ]).then(([cloudItems, cloudCategories, cloudSales, cloudCustomers, cloudRequests]) => {
      if (cancelled) return;
      if (cloudItems) setItems(cloudItems);
      if (cloudCategories) setCategories(cloudCategories);
      if (cloudSales) setSales(cloudSales);
      if (cloudCustomers) setCustomers(cloudCustomers);
      if (cloudRequests) setCustomerRequests(cloudRequests);
      setSupabaseHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('wdj_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('wdj_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!hasSupabase()) localDataSync.save('wdj_items_v2', items);
    if (supabaseHydrated) items.forEach((item) => void upsertSupabaseRecord('items', item));
  }, [items, supabaseHydrated]);

  useEffect(() => {
    if (!hasSupabase()) localStorage.setItem('wdj_categories_v2', JSON.stringify(categories));
    if (supabaseHydrated) categories.forEach((category) => void upsertSupabaseRecord('categories', category));
  }, [categories, supabaseHydrated]);

  useEffect(() => {
    localStorage.setItem('wdj_tags_v2', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    if (!hasSupabase()) localDataSync.save('wdj_sales_v2', sales);
    if (supabaseHydrated) sales.forEach((sale) => void upsertSupabaseRecord('sales', sale));
  }, [sales, supabaseHydrated]);

  useEffect(() => {
    if (!hasSupabase()) localDataSync.save('wdj_customers_v2', customers);
    if (supabaseHydrated) customers.forEach((customer) => void upsertSupabaseRecord('customers', customer));
  }, [customers, supabaseHydrated]);

  useEffect(() => {
    if (!hasSupabase()) localDataSync.save('wdj_customer_requests_v1', customerRequests);
    if (supabaseHydrated) customerRequests.forEach((request) => void upsertSupabaseRecord('customer_requests', request));
  }, [customerRequests, supabaseHydrated]);

  useEffect(() => {
    localStorage.setItem('wdj_users_v2', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('wdj_logs_v2', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem('wdj_settings_v2', JSON.stringify(settings));
  }, [settings]);

  // Derived item lists
  const activeItems = useMemo(() => items.filter(i => i.status !== 'DELETED'), [items]);
  const recycleBinItems = useMemo(() => items.filter(i => i.status === 'DELETED'), [items]);

  // Stock age helper (in days)
  const getStockAge = (dateStr: string): number => {
    try {
      const added = new Date(dateStr).getTime();
      const now = new Date().getTime();
      const diffMs = now - added;
      const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      return days;
    } catch {
      return 0;
    }
  };

  const formatCurrency = (amount: number): string => {
    return `${settings.currency} ${amount.toLocaleString('en-LK')}`;
  };

  // Activity logger
  const logAction = (action: string, details: string, itemCode?: string) => {
    const now = new Date();
    const newLog: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'System User',
      role: currentUser?.role || 'EMPLOYEE',
      action,
      itemCode,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      details,
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  // Code generation algorithm: finds highest number for prefix and increments
  const generateNextItemCode = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    const prefix = category?.prefix?.toUpperCase() || 'O';
    
    // Find all existing codes with this prefix across all items
    const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
    let maxNum = 0;
    
    items.forEach(item => {
      const match = item.code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  const getItemByCode = (code: string): Item | undefined => {
    if (!code) return undefined;
    const cleanCode = code.trim().toUpperCase();
    return items.find(i => i.code.toUpperCase() === cleanCode && i.status !== 'DELETED');
  };

  // Add Item
  const addItem = (itemData: Omit<Item, 'id' | 'code' | 'dateAdded' | 'status'> & { customCode?: string }): Item => {
    const code = itemData.customCode?.trim().toUpperCase() || generateNextItemCode(itemData.categoryId);
    const now = new Date().toISOString().split('T')[0];
    
    const newItem: Item = {
      ...itemData,
      id: `item-${Date.now()}`,
      code,
      status: 'AVAILABLE',
      dateAdded: now,
    };

    setItems(prev => [newItem, ...prev]);
    logAction('Item Added', `Registered item ${newItem.name} with code ${newItem.code} (Rs. ${newItem.sellingPrice.toLocaleString()})`, newItem.code);
    return newItem;
  };

  // Update Item
  const updateItem = (id: string, updates: Partial<Item>) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates, dateUpdated: new Date().toISOString().split('T')[0] };
        return updated;
      }
      return item;
    }));
    const target = items.find(i => i.id === id);
    if (target) {
      logAction('Item Updated', `Updated details for ${target.code} - ${target.name}`, target.code);
    }
  };

  // Delete Item (Move to Recycle Bin)
  const deleteItem = (id: string): { success: boolean; message: string } => {
    const target = items.find(i => i.id === id);
    if (!target) return { success: false, message: 'Item not found' };

    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'DELETED',
          previousStatus: item.status,
          deletedAt: new Date().toISOString(),
        };
      }
      return item;
    }));

    logAction('Item Moved to Recycle Bin', `Moved item ${target.code} (${target.name}) to recycle bin`, target.code);
    return { success: true, message: `Item ${target.code} moved to Recycle Bin` };
  };

  // Restore Item
  const restoreItem = (id: string) => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: item.previousStatus || 'AVAILABLE',
          deletedAt: undefined,
          previousStatus: undefined,
        };
      }
      return item;
    }));

    logAction('Item Restored', `Restored item ${target.code} from Recycle Bin`, target.code);
  };

  // Permanently Delete Item
  const permanentlyDeleteItem = (id: string) => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    setItems(prev => prev.filter(item => item.id !== id));
    void deleteSupabaseRecord('items', id);
    logAction('Permanent Delete', `Permanently deleted item ${target.code} (${target.name}) from database`, target.code);
  };

  // Toggle reserve status
  const toggleReserveItem = (itemId: string) => {
    const target = items.find(i => i.id === itemId);
    if (!target) return;

    if (target.status === 'AVAILABLE') {
      updateItem(itemId, { status: 'RESERVED' });
      logAction('Item Reserved', `Item ${target.code} was marked as RESERVED`, target.code);
    } else if (target.status === 'RESERVED') {
      updateItem(itemId, { status: 'AVAILABLE' });
      logAction('Reservation Cleared', `Item ${target.code} reservation was cleared to AVAILABLE`, target.code);
    }
  };

  // Mark as Sold (Core Business Function)
  const markItemAsSold = (
    itemId: string,
    soldPrice: number,
    customerName: string,
    customerPhone: string,
    note?: string
  ): { success: boolean; message: string; sale?: Sale } => {
    const target = items.find(i => i.id === itemId);
    if (!target) return { success: false, message: 'Item not found.' };

    if (target.status === 'SOLD') {
      return { success: false, message: 'This item is already marked as SOLD.' };
    }

    const discount = Math.max(0, target.sellingPrice - soldPrice);
    
    // Strict maximum discount guard
    if (discount > target.maxDiscount) {
      return { 
        success: false, 
        message: `Discount Rs. ${discount.toLocaleString()} exceeds maximum permitted discount of Rs. ${target.maxDiscount.toLocaleString()}!` 
      };
    }

    const profit = soldPrice - target.costPrice;
    const nowIso = new Date().toISOString();

    // Create a stable walk-in profile when customer details are skipped.
    const cleanCustomerName = customerName.trim();
    const cleanCustomerPhone = customerPhone.trim();
    const isWalkIn = !cleanCustomerName && !cleanCustomerPhone;
    const dateCode = nowIso.slice(0, 10).replace(/-/g, '');
    const sequence = customers.filter(c => (c.customerCode || c.id).startsWith(`CUS-${dateCode}-`)).length + 1;
    const customerCode = isWalkIn ? `CUS-${dateCode}-${String(sequence).padStart(3, '0')}` : undefined;
    const resolvedCustomerName = cleanCustomerName || `Walk-in Customer ${customerCode}`;
    const resolvedCustomerPhone = cleanCustomerPhone || 'N/A';
    let customerId = customerCode || `cust-${Date.now()}`;
    const existingCust = cleanCustomerPhone
      ? customers.find(c => c.phone.replace(/\s+/g, '') === cleanCustomerPhone.replace(/\s+/g, ''))
      : undefined;
    if (existingCust) {
      customerId = existingCust.id;
      setCustomers(prev => prev.map(c => {
        if (c.id === existingCust.id) {
          return {
            ...c,
            purchases: [...c.purchases, target.code],
            totalSpent: c.totalSpent + soldPrice,
            notes: note ? `${c.notes || ''} | ${note}` : c.notes,
          };
        }
        return c;
      }));
    } else {
      const newCust: Customer = {
        id: customerId,
        customerCode,
        name: resolvedCustomerName,
        phone: resolvedCustomerPhone,
        notes: note,
        dateAdded: nowIso.split('T')[0],
        purchases: [target.code],
        totalSpent: soldPrice,
      };
      setCustomers(prev => [newCust, ...prev]);
    }

    // Create Sale record (Permanent historical sales record per Section 41)
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      itemId: target.id,
      itemCode: target.code,
      itemName: target.name,
      categoryId: target.categoryId,
      categoryName: target.categoryName,
      originalPrice: target.sellingPrice,
      soldPrice,
      discount,
      cost: target.costPrice,
      profit,
      customerId,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      employeeId: currentUser?.id || 'emp-anon',
      employeeName: currentUser?.name || 'Employee',
      saleDate: nowIso,
      note,
    };

    setSales(prev => [newSale, ...prev]);

    // Update item status
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'SOLD',
          soldDate: nowIso.split('T')[0],
          soldPrice,
          soldDiscount: discount,
          soldCustomerId: customerId,
          soldCustomerName: resolvedCustomerName,
          soldCustomerPhone: resolvedCustomerPhone,
          soldEmployeeId: currentUser?.id || 'emp-anon',
          soldEmployeeName: currentUser?.name || 'Employee',
          soldNote: note,
        };
      }
      return item;
    }));

    logAction(
      'Item Sold',
      `Sold ${target.code} (${target.name}) for Rs. ${soldPrice.toLocaleString()} (Discount: Rs. ${discount.toLocaleString()}) to ${resolvedCustomerName} (${resolvedCustomerPhone})`,
      target.code
    );

    return { 
      success: true, 
      message: `Item ${target.code} marked as SOLD successfully!`,
      sale: newSale 
    };
  };

  // Category management
  const generateCategoryCode = (name: string, preferredPrefix?: string): string => {
    const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
    const baseCode = preferredPrefix?.trim().toUpperCase() || (words.length > 1 ? words.map(word => word.slice(0, 3)).join('-') : (words[0] || 'CAT').slice(0, 3));
    const usedCodes = new Set(categories.map(category => category.prefix));
    let generatedCode = baseCode;
    let suffix = 1;
    while (usedCodes.has(generatedCode)) {
      generatedCode = `${baseCode}-${String(suffix).padStart(3, '0')}`;
      suffix += 1;
    }
    return generatedCode;
  };

  const addCategory = (name: string, prefix?: string, description?: string) => {
    const id = `cat-${Date.now()}`;
    const generatedCode = generateCategoryCode(name, prefix);
    const newCat: Category = {
      id,
      name,
      prefix: generatedCode,
      description,
      subcategories: [],
    };
    setCategories(prev => [...prev, newCat]);
    logAction('Category Added', `Created new category: ${name} (Prefix: ${newCat.prefix})`);
    return id;
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const addSubcategory = (categoryId: string, name: string) => {
    const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'SUB';
    const id = `SUB-${slug}-${Date.now().toString().slice(-3)}`;
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          subcategories: [
            ...cat.subcategories,
            { id, name, itemTypes: [] }
          ]
        };
      }
      return cat;
    }));
    return id;
  };

  const addItemType = (categoryId: string, subcategoryId: string, name: string) => {
    const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'TYPE';
    const id = `TYPE-${slug}-${Date.now().toString().slice(-3)}`;
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          subcategories: cat.subcategories.map(sub => {
            if (sub.id === subcategoryId) {
              return {
                ...sub,
                itemTypes: [...sub.itemTypes, { id, name }]
              };
            }
            return sub;
          })
        };
      }
      return cat;
    }));
    return id;
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    void deleteSupabaseRecord('categories', id);
  };

  const deleteSubcategory = (categoryId: string, subcategoryId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          subcategories: cat.subcategories.filter(s => s.id !== subcategoryId)
        };
      }
      return cat;
    }));
  };

  const deleteItemType = (categoryId: string, subcategoryId: string, typeId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          subcategories: cat.subcategories.map(sub => {
            if (sub.id === subcategoryId) {
              return {
                ...sub,
                itemTypes: sub.itemTypes.filter(t => t.id !== typeId)
              };
            }
            return sub;
          })
        };
      }
      return cat;
    }));
  };

  // Tags
  const addTag = (name: string, color: string, description?: string) => {
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name,
      color,
      description,
      isActive: true,
    };
    setTags(prev => [...prev, newTag]);
    logAction('Tag Created', `Created tag: ${name}`);
  };

  const updateTag = (id: string, updates: Partial<Tag>) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTag = (id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  };

  // Customers
  const addOrUpdateCustomer = (name: string, phone: string, itemCode: string, amount: number, note?: string) => {
    // Already handled in markItemAsSold, but available for direct customer editing
    const existing = customers.find(c => c.phone === phone);
    if (existing) {
      setCustomers(prev => prev.map(c => c.id === existing.id ? {
        ...c,
        name,
        notes: note || c.notes,
        purchases: [...c.purchases, itemCode],
        totalSpent: c.totalSpent + amount
      } : c));
    }
  };

  const updateCustomerNotes = (id: string, notes: string) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, notes } : c));
  };

  const addCustomerRequest = (request: Omit<CustomerRequest, 'id' | 'requestDate' | 'status'>) => {
    const newRequest: CustomerRequest = {
      ...request,
      id: `request-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'PENDING',
    };
    setCustomerRequests(prev => [newRequest, ...prev]);
    logAction('Customer Request Added', `Request for ${newRequest.itemName} from ${newRequest.customerName}`);
  };

  const updateCustomerRequest = (id: string, updates: Partial<Pick<CustomerRequest, 'status' | 'customerName' | 'customerPhone' | 'itemName' | 'quantity' | 'notes'>>) => {
    setCustomerRequests(prev => prev.map(request => request.id === id ? { ...request, ...updates } : request));
  };

  const deleteCustomerRequest = (id: string) => {
    setCustomerRequests(prev => prev.filter(request => request.id !== id));
    void deleteSupabaseRecord('customer_requests', id);
  };

  // Users
  const addUser = (name: string, username: string, password: string, role: UserRole, phone?: string) => {
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Username already exists' };
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      username,
      password,
      role,
      status: 'ACTIVE',
      dateCreated: new Date().toISOString().split('T')[0],
      phone,
    };
    setUsers(prev => [...prev, newUser]);
    logAction('User Created', `Created ${role} account for ${name} (@${username})`);
    return { success: true, message: `Account created for ${name}` };
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    logAction('User Updated', `Updated user credentials / profile`);
  };

  const toggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // Settings
  const updateSettings = (updates: Partial<BusinessSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    logAction('Settings Updated', 'Updated business configurations / preferences');
  };

  // Auth
  const login = (username: string, pin: string): { success: boolean; message: string } => {
    const storedPin = localStorage.getItem('wdj_admin_pin') || '1234';
    if (username.trim().toLowerCase() !== 'wdjlanka' || pin !== storedPin) {
      return { success: false, message: 'Invalid Username or PIN. Access Denied.' };
    }
    const adminUser = { ...INITIAL_USERS[0], name: 'WDJLANKA Admin', username: 'wdjlanka' };
    localStorage.setItem('wdj_admin_authenticated', 'true');
    window.setTimeout(() => {
      setCurrentUser(adminUser);
      logAction('User Login', `${adminUser.name} logged into the system`);
    }, 450);
    return { success: true, message: 'Authenticating... Welcome to WDJLANKA!' };
  };

  const logout = () => {
    if (currentUser) {
      logAction('User Logout', `${currentUser.name} logged out`);
    }
    localStorage.removeItem('wdj_admin_authenticated');
    setCurrentUser(null);
  };

  // Labels selection
  const toggleLabelSelection = (code: string) => {
    setSelectedLabelItemCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const selectAllLabels = (codes: string[]) => {
    setSelectedLabelItemCodes(codes);
  };

  const clearLabelSelection = () => {
    setSelectedLabelItemCodes([]);
  };

  // Reset to initial seed
  const resetAllDataToDefault = () => {
    setItems(INITIAL_ITEMS);
    setCategories(INITIAL_CATEGORIES);
    setTags(INITIAL_TAGS);
    setSales(INITIAL_SALES);
    setCustomers(INITIAL_CUSTOMERS);
    setCustomerRequests([]);
    setUsers(INITIAL_USERS);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    setSettings(INITIAL_SETTINGS);
    setCurrentUser(INITIAL_USERS[0]);
    localStorage.clear();
  };

  // Export CSV
  const exportToCSV = (type: 'items' | 'sales' | 'customers') => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (type === 'items') {
      headers = ['Item Code', 'Item Name', 'Category', 'Subcategory', 'Brand', 'Model', 'Condition', 'Cost (Rs)', 'Selling Price (Rs)', 'Max Discount (Rs)', 'Status', 'Date Added'];
      rows = activeItems.map(i => [
        i.code,
        `"${i.name.replace(/"/g, '""')}"`,
        i.categoryName,
        i.subcategoryName || '',
        i.brand,
        i.model,
        i.condition,
        currentUser?.role === 'ADMIN' ? i.costPrice.toString() : 'RESTRICTED',
        i.sellingPrice.toString(),
        i.maxDiscount.toString(),
        i.status,
        i.dateAdded,
      ]);
    } else if (type === 'sales') {
      headers = ['Sale ID', 'Item Code', 'Item Name', 'Sold Price (Rs)', 'Original Price (Rs)', 'Discount (Rs)', 'Cost (Rs)', 'Profit (Rs)', 'Customer Name', 'Customer Phone', 'Employee', 'Sale Date'];
      rows = sales.map(s => [
        s.id,
        s.itemCode,
        `"${s.itemName.replace(/"/g, '""')}"`,
        s.soldPrice.toString(),
        s.originalPrice.toString(),
        s.discount.toString(),
        currentUser?.role === 'ADMIN' ? s.cost.toString() : 'RESTRICTED',
        currentUser?.role === 'ADMIN' ? s.profit.toString() : 'RESTRICTED',
        `"${s.customerName.replace(/"/g, '""')}"`,
        s.customerPhone,
        s.employeeName,
        s.saleDate,
      ]);
    } else if (type === 'customers') {
      headers = ['Customer ID', 'Name', 'Phone', 'Total Spent (Rs)', 'Total Purchases', 'Purchased Items', 'Date Added'];
      rows = customers.map(c => [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        c.phone,
        c.totalSpent.toString(),
        c.purchases.length.toString(),
        c.purchases.join('; '),
        c.dateAdded,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WDJLANKA_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        login,
        logout,
        items,
        activeItems,
        recycleBinItems,
        addItem,
        updateItem,
        deleteItem,
        restoreItem,
        permanentlyDeleteItem,
        markItemAsSold,
        toggleReserveItem,
        generateNextItemCode,
        getItemByCode,
        categories,
        addCategory,
        generateCategoryCode,
        updateCategory,
        addSubcategory,
        addItemType,
        deleteCategory,
        deleteSubcategory,
        deleteItemType,
        tags,
        addTag,
        updateTag,
        deleteTag,
        sales,
        customers,
        customerRequests,
        addCustomerRequest,
        updateCustomerRequest,
        deleteCustomerRequest,
        addOrUpdateCustomer,
        updateCustomerNotes,
        users,
        addUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
        activityLogs,
        logAction,
        settings,
        updateSettings,
        activeTab,
        setActiveTab,
        selectedItemForDetail,
        setSelectedItemForDetail,
        isAddItemOpen,
        setIsAddItemOpen,
        isQRScannerOpen,
        setIsQRScannerOpen,
        isGlobalSearchOpen,
        setIsGlobalSearchOpen,
        isRecycleBinOpen,
        setIsRecycleBinOpen,
        isGoogleSheetsModalOpen,
        setIsGoogleSheetsModalOpen,
        selectedItemForSale,
        setSelectedItemForSale,
        selectedLabelItemCodes,
        toggleLabelSelection,
        selectAllLabels,
        clearLabelSelection,
        getStockAge,
        formatCurrency,
        resetAllDataToDefault,
        exportToCSV,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
