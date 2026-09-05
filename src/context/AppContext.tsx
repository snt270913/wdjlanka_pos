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
  , CartLine
} from '../types';
import { 
  INITIAL_CATEGORIES, 
  DEFAULT_TAGLINE,
  INITIAL_SETTINGS, 
  INITIAL_TAGS, 
  INITIAL_USERS, 
  INITIAL_ACTIVITY_LOGS 
} from '../data/initialData';
import { clearSupabaseCollection, deleteSupabaseRecord, hasSupabase, loadSupabaseCollection, insertSupabaseRecord, updateSupabaseRecord } from '../data/supabaseSync';

interface AppContextType {
  currentUser: User | null;
  isDarkMode: boolean;
  setIsDarkMode: (enabled: boolean) => void;
  setCurrentUser: (user: User | null) => void;
  login: (username: string, pin: string) => { success: boolean; message: string };
  logout: () => void;
  
  // Items
  items: Item[];
  activeItems: Item[];
  recycleBinItems: Item[];
  addItem: (itemData: Omit<Item, 'id' | 'code' | 'dateAdded' | 'status'> & { customCode?: string }) => Promise<Item>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<{ success: boolean; message: string }>;
  restoreItem: (id: string) => Promise<void>;
  permanentlyDeleteItem: (id: string) => Promise<void>;
  markItemAsSold: (
    itemId: string, 
    soldPrice: number, 
    customerName: string, 
    customerPhone: string, 
    note?: string
  ) => Promise<{ success: boolean; message: string; sale?: Sale }>;
  cart: CartLine[];
  isCartOpen: boolean;
  addItemToCart: (item: Item) => void;
  updateCartLine: (itemId: string, updates: Partial<Pick<CartLine, 'quantity' | 'discount'>>) => void;
  removeCartLine: (itemId: string) => void;
  clearCart: () => void;
  checkoutCart: (customerName: string, customerPhone: string, note?: string) => Promise<{ success: boolean; message: string; sales: Sale[] }>;
  toggleReserveItem: (itemId: string) => Promise<void>;
  generateNextItemCode: (categoryId: string) => string;
  getItemByCode: (code: string) => Item | undefined;

  // Categories
  categories: Category[];
  addCategory: (name: string, prefix?: string, description?: string) => Promise<string>;
  generateCategoryCode: (name: string, preferredPrefix?: string) => string;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  addSubcategory: (categoryId: string, name: string) => Promise<string>;
  addItemType: (categoryId: string, subcategoryId: string, name: string) => Promise<string>;
  deleteCategory: (id: string) => Promise<void>;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => Promise<void>;
  deleteItemType: (categoryId: string, subcategoryId: string, typeId: string) => Promise<void>;

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
  addOrUpdateCustomer: (name: string, phone: string, itemCode: string, amount: number, note?: string) => Promise<void>;
  updateCustomerNotes: (id: string, notes: string) => Promise<void>;

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
  setSelectedLabelItemCodes: React.Dispatch<React.SetStateAction<string[]>>;
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
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('wdj_dark_mode') === 'true');
  // Authentication preferences remain local; operational records are never seeded.
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (!localStorage.getItem('wdj_admin_pin')) {
      localStorage.setItem('wdj_admin_pin', '1234');
    }
    const saved = localStorage.getItem('wdj_current_user');
    return localStorage.getItem('wdj_admin_authenticated') === 'true' && saved
      ? { ...JSON.parse(saved), username: 'wdjlanka' }
      : null;
  });

  const [items, setItems] = useState<Item[]>(() => {
    return [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    return [];
  });

  const [tags, setTags] = useState<Tag[]>(() => {
    const saved = localStorage.getItem('wdj_tags_v2');
    return saved ? JSON.parse(saved) : INITIAL_TAGS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    return [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    return [];
  });

  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>(() => {
    return [];
  });

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
    return saved ? { ...JSON.parse(saved), tagline: DEFAULT_TAGLINE } : INITIAL_SETTINGS;
  });

  // UI state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [selectedItemForSale, setSelectedItemForSaleState] = useState<Item | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedLabelItemCodes, setSelectedLabelItemCodes] = useState<string[]>(['B001', 'B002', 'M001', 'M003', 'H001', 'E001']);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('wdj_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Load operational records exclusively from Supabase.
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
      setItems((cloudItems || []).map(item => ({ ...item, quantity: item.quantity ?? 1 })));
      setCategories(cloudCategories || []);
      setSales(cloudSales || []);
      setCustomers(cloudCustomers || []);
      setCustomerRequests(cloudRequests || []);
    }).catch(error => {
      if (!cancelled) console.error('Unable to hydrate POS data from Supabase', error);
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

  const addItemToCart = (item: Item) => {
    if (item.status !== 'AVAILABLE' || (item.quantity ?? 1) < 1) return;
    setCart(prev => {
      const existing = prev.find(line => line.item.id === item.id);
      if (existing) {
        return prev.map(line => line.item.id === item.id
          ? { ...line, quantity: Math.min(line.quantity + 1, item.quantity ?? 1) }
          : line);
      }
      return [...prev, { item, quantity: 1, discount: 0 }];
    });
    setSelectedItemForSaleState(item);
    setIsCartOpen(true);
  };

  const updateCartLine = (itemId: string, updates: Partial<Pick<CartLine, 'quantity' | 'discount'>>) => {
    setCart(prev => prev.map(line => line.item.id === itemId
      ? { ...line, ...updates, quantity: Math.max(1, Math.min(updates.quantity ?? line.quantity, line.item.quantity ?? 1)), discount: Math.max(0, updates.discount ?? line.discount) }
      : line));
  };

  const removeCartLine = (itemId: string) => setCart(prev => prev.filter(line => line.item.id !== itemId));
  const clearCart = () => {
    setCart([]);
    setSelectedItemForSaleState(null);
    setIsCartOpen(false);
  };

  const setSelectedItemForSale = (item: Item | null) => {
    if (!item) {
      setSelectedItemForSaleState(null);
      setIsCartOpen(false);
      return;
    }
    addItemToCart(item);
  };

  // Add Item
  const addItem = async (itemData: Omit<Item, 'id' | 'code' | 'dateAdded' | 'status'> & { customCode?: string }): Promise<Item> => {
    const code = itemData.customCode?.trim().toUpperCase() || generateNextItemCode(itemData.categoryId);
    const now = new Date().toISOString().split('T')[0];
    
    const newItem: Item = {
      ...itemData,
      id: `item-${Date.now()}`,
      code,
      status: 'AVAILABLE',
      dateAdded: now,
    };

    await insertSupabaseRecord('items', newItem);
    setItems(prev => [newItem, ...prev]);
    logAction('Item Added', `Registered item ${newItem.name} with code ${newItem.code} (Rs. ${newItem.sellingPrice.toLocaleString()})`, newItem.code);
    return newItem;
  };

  // Update Item
  const updateItem = async (id: string, updates: Partial<Item>): Promise<void> => {
    const target = items.find(i => i.id === id);
    if (!target) return;
    const updated = { ...target, ...updates, dateUpdated: new Date().toISOString().split('T')[0] };
    await updateSupabaseRecord('items', updated);
    setItems(prev => prev.map(item => item.id === id ? updated : item));
    logAction('Item Updated', `Updated details for ${target.code} - ${target.name}`, target.code);
  };

  // Delete Item (Move to Recycle Bin)
  const deleteItem = async (id: string): Promise<{ success: boolean; message: string }> => {
    const target = items.find(i => i.id === id);
    if (!target) return { success: false, message: 'Item not found' };

    const deletedItem = { ...target, status: 'DELETED' as const, previousStatus: target.status, deletedAt: new Date().toISOString() };
    await updateSupabaseRecord('items', deletedItem);
    setItems(prev => prev.map(item => item.id === id ? deletedItem : item));

    logAction('Item Moved to Recycle Bin', `Moved item ${target.code} (${target.name}) to recycle bin`, target.code);
    return { success: true, message: `Item ${target.code} moved to Recycle Bin` };
  };

  // Restore Item
  const restoreItem = async (id: string): Promise<void> => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    const restoredItem = { ...target, status: target.previousStatus || 'AVAILABLE', deletedAt: undefined, previousStatus: undefined };
    await updateSupabaseRecord('items', restoredItem);
    setItems(prev => prev.map(item => item.id === id ? restoredItem : item));

    logAction('Item Restored', `Restored item ${target.code} from Recycle Bin`, target.code);
  };

  // Permanently Delete Item
  const permanentlyDeleteItem = async (id: string): Promise<void> => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    await deleteSupabaseRecord('items', id);
    setItems(prev => prev.filter(item => item.id !== id));
    logAction('Permanent Delete', `Permanently deleted item ${target.code} (${target.name}) from database`, target.code);
  };

  // Toggle reserve status
  const toggleReserveItem = async (itemId: string): Promise<void> => {
    const target = items.find(i => i.id === itemId);
    if (!target) return;

    if (target.status === 'AVAILABLE') {
      await updateItem(itemId, { status: 'RESERVED' });
      logAction('Item Reserved', `Item ${target.code} was marked as RESERVED`, target.code);
    } else if (target.status === 'RESERVED') {
      await updateItem(itemId, { status: 'AVAILABLE' });
      logAction('Reservation Cleared', `Item ${target.code} reservation was cleared to AVAILABLE`, target.code);
    }
  };

  // Mark as Sold (Core Business Function)
  const markItemAsSold = async (
    itemId: string,
    soldPrice: number,
    customerName: string,
    customerPhone: string,
    note?: string
  ): Promise<{ success: boolean; message: string; sale?: Sale }> => {
    const target = items.find(i => i.id === itemId);
    if (!target) return { success: false, message: 'Item not found.' };

    if (target.status === 'SOLD') {
      return { success: false, message: 'This item is already marked as SOLD.' };
    }

    const discount = Math.max(0, target.sellingPrice - soldPrice);
    
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
    let nextCustomer: Customer;
    if (existingCust) {
      customerId = existingCust.id;
      nextCustomer = {
        ...existingCust,
        purchases: [...existingCust.purchases, target.code],
        totalSpent: existingCust.totalSpent + soldPrice,
        notes: note ? `${existingCust.notes || ''} | ${note}` : existingCust.notes,
      };
    } else {
      nextCustomer = {
        id: customerId,
        customerCode,
        name: resolvedCustomerName,
        phone: resolvedCustomerPhone,
        notes: note,
        dateAdded: nowIso.split('T')[0],
        purchases: [target.code],
        totalSpent: soldPrice,
      };
    }
    if (existingCust) await updateSupabaseRecord('customers', nextCustomer);
    else await insertSupabaseRecord('customers', nextCustomer);

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

    const soldItem: Item = {
      ...target,
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
    await insertSupabaseRecord('sales', newSale);
    await updateSupabaseRecord('items', soldItem);
    setCustomers(prev => existingCust ? prev.map(c => c.id === existingCust.id ? nextCustomer : c) : [nextCustomer, ...prev]);
    setSales(prev => [newSale, ...prev]);
    setItems(prev => prev.map(item => item.id === itemId ? soldItem : item));

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

  const checkoutCart = async (customerName: string, customerPhone: string, note?: string): Promise<{ success: boolean; message: string; sales: Sale[] }> => {
    if (cart.length === 0) return { success: false, message: 'Your cart is empty.', sales: [] };
    const currentCart = cart.map(line => {
      const currentItem = items.find(item => item.id === line.item.id);
      return currentItem ? { ...line, item: currentItem } : line;
    });
    const unavailableLine = currentCart.find(line => !line.item || line.item.status !== 'AVAILABLE' || line.quantity > (line.item.quantity ?? 1));
    if (unavailableLine) {
      return { success: false, message: `${unavailableLine.item.code} no longer has enough available stock.`, sales: [] };
    }
    const nowIso = new Date().toISOString();
    const cleanCustomerName = customerName.trim();
    const cleanCustomerPhone = customerPhone.trim();
    const isWalkIn = !cleanCustomerName && !cleanCustomerPhone;
    const dateCode = nowIso.slice(0, 10).replace(/-/g, '');
    const sequence = customers.filter(c => (c.customerCode || c.id).startsWith(`CUS-${dateCode}-`)).length + 1;
    const customerCode = isWalkIn ? `CUS-${dateCode}-${String(sequence).padStart(3, '0')}` : undefined;
    const resolvedCustomerName = cleanCustomerName || `Walk-in Customer ${customerCode}`;
    const resolvedCustomerPhone = cleanCustomerPhone || 'N/A';
    const existingCustomer = cleanCustomerPhone
      ? customers.find(c => c.phone.replace(/\s+/g, '') === cleanCustomerPhone.replace(/\s+/g, ''))
      : undefined;
    const customerId = existingCustomer?.id || customerCode || `cust-${Date.now()}`;
    const totalPaid = currentCart.reduce((sum, line) => sum + line.item.sellingPrice * line.quantity - line.discount, 0);
    const purchasedCodes = currentCart.flatMap(line => Array.from({ length: line.quantity }, () => line.item.code));
    const nextCustomer: Customer = existingCustomer
      ? { ...existingCustomer, purchases: [...existingCustomer.purchases, ...purchasedCodes], totalSpent: existingCustomer.totalSpent + totalPaid, notes: note ? `${existingCustomer.notes || ''} | ${note}` : existingCustomer.notes }
      : { id: customerId, customerCode, name: resolvedCustomerName, phone: resolvedCustomerPhone, notes: note, dateAdded: nowIso.split('T')[0], purchases: purchasedCodes, totalSpent: totalPaid };
    const salesToSave: Sale[] = currentCart.map((line, index) => {
      const originalPrice = line.item.sellingPrice * line.quantity;
      const soldPrice = Math.max(0, originalPrice - line.discount);
      return {
        id: `sale-${Date.now()}-${index}`,
        itemId: line.item.id,
        itemCode: line.item.code,
        itemName: line.item.name,
        categoryId: line.item.categoryId,
        categoryName: line.item.categoryName,
        originalPrice,
        soldPrice,
        discount: line.discount,
        quantity: line.quantity,
        cost: line.item.costPrice * line.quantity,
        profit: soldPrice - line.item.costPrice * line.quantity,
        customerId,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        employeeId: currentUser?.id || 'emp-anon',
        employeeName: currentUser?.name || 'Employee',
        saleDate: nowIso,
        note,
      };
    });
    const updatedItems = currentCart.map(line => {
      const remaining = Math.max(0, (line.item.quantity ?? 1) - line.quantity);
      return { ...line.item, quantity: remaining, status: remaining === 0 ? 'SOLD' as const : line.item.status, soldDate: remaining === 0 ? nowIso.split('T')[0] : line.item.soldDate, soldPrice: remaining === 0 ? line.item.sellingPrice - line.discount : line.item.soldPrice, soldDiscount: remaining === 0 ? line.discount : line.item.soldDiscount, soldCustomerId: remaining === 0 ? customerId : line.item.soldCustomerId, soldCustomerName: remaining === 0 ? resolvedCustomerName : line.item.soldCustomerName, soldEmployeeId: remaining === 0 ? currentUser?.id || 'emp-anon' : line.item.soldEmployeeId, soldEmployeeName: remaining === 0 ? currentUser?.name || 'Employee' : line.item.soldEmployeeName, soldNote: remaining === 0 ? note : line.item.soldNote };
    });
    if (existingCustomer) await updateSupabaseRecord('customers', nextCustomer);
    else await insertSupabaseRecord('customers', nextCustomer);
    for (const sale of salesToSave) await insertSupabaseRecord('sales', sale);
    for (const updatedItem of updatedItems) await updateSupabaseRecord('items', updatedItem);
    setCustomers(prev => existingCustomer ? prev.map(customer => customer.id === existingCustomer.id ? nextCustomer : customer) : [nextCustomer, ...prev]);
    setSales(prev => [...salesToSave, ...prev]);
    setItems(prev => prev.map(item => updatedItems.find(updated => updated.id === item.id) || item));
    setCart([]);
    setSelectedItemForSaleState(null);
    setIsCartOpen(false);
    return { success: true, message: `${salesToSave.length} item${salesToSave.length === 1 ? '' : 's'} sold successfully.`, sales: salesToSave };
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

  const addCategory = async (name: string, prefix?: string, description?: string): Promise<string> => {
    const id = `cat-${Date.now()}`;
    const generatedCode = generateCategoryCode(name, prefix);
    const newCat: Category = {
      id,
      name,
      prefix: generatedCode,
      description,
      subcategories: [],
    };
    await insertSupabaseRecord('categories', newCat);
    setCategories(prev => [...prev, newCat]);
    logAction('Category Added', `Created new category: ${name} (Prefix: ${newCat.prefix})`);
    return id;
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    const updatedCategory = { ...category, ...updates };
    await updateSupabaseRecord('categories', updatedCategory);
    setCategories(prev => prev.map(c => c.id === id ? updatedCategory : c));
  };

  const addSubcategory = async (categoryId: string, name: string): Promise<string> => {
    const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'SUB';
    const id = `SUB-${slug}-${Date.now().toString().slice(-3)}`;
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) throw new Error('Parent category not found.');
    const updatedCategory = {
      ...category,
      subcategories: [...category.subcategories, { id, name, itemTypes: [] }],
    };
    await updateSupabaseRecord('categories', updatedCategory);
    setCategories(prev => prev.map(cat => cat.id === categoryId ? updatedCategory : cat));
    return id;
  };

  const addItemType = async (categoryId: string, subcategoryId: string, name: string): Promise<string> => {
    const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'TYPE';
    const id = `TYPE-${slug}-${Date.now().toString().slice(-3)}`;
    const category = categories.find(cat => cat.id === categoryId);
    const subcategory = category?.subcategories.find(sub => sub.id === subcategoryId);
    if (!category || !subcategory) throw new Error('Parent category or subcategory not found.');
    const updatedCategory = {
      ...category,
      subcategories: category.subcategories.map(sub => sub.id === subcategoryId
        ? { ...sub, itemTypes: [...sub.itemTypes, { id, name }] }
        : sub),
    };
    await updateSupabaseRecord('categories', updatedCategory);
    setCategories(prev => prev.map(cat => cat.id === categoryId ? updatedCategory : cat));
    return id;
  };

  const deleteCategory = async (id: string): Promise<void> => {
    await deleteSupabaseRecord('categories', id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const deleteSubcategory = async (categoryId: string, subcategoryId: string): Promise<void> => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    const updatedCategory = { ...category, subcategories: category.subcategories.filter(s => s.id !== subcategoryId) };
    await updateSupabaseRecord('categories', updatedCategory);
    setCategories(prev => prev.map(cat => cat.id === categoryId ? updatedCategory : cat));
  };

  const deleteItemType = async (categoryId: string, subcategoryId: string, typeId: string): Promise<void> => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    const updatedCategory = {
      ...category,
      subcategories: category.subcategories.map(sub => sub.id === subcategoryId
        ? { ...sub, itemTypes: sub.itemTypes.filter(t => t.id !== typeId) }
        : sub),
    };
    await updateSupabaseRecord('categories', updatedCategory);
    setCategories(prev => prev.map(cat => cat.id === categoryId ? updatedCategory : cat));
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
  const addOrUpdateCustomer = async (name: string, phone: string, itemCode: string, amount: number, note?: string): Promise<void> => {
    // Already handled in markItemAsSold, but available for direct customer editing
    const existing = customers.find(c => c.phone === phone);
    if (existing) {
      const updated = {
        ...existing,
        name,
        notes: note || existing.notes,
        purchases: [...existing.purchases, itemCode],
        totalSpent: existing.totalSpent + amount
      };
      await updateSupabaseRecord('customers', updated);
      setCustomers(prev => prev.map(c => c.id === existing.id ? updated : c));
      return;
    }
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name,
      phone,
      notes: note,
      dateAdded: new Date().toISOString().split('T')[0],
      purchases: [itemCode],
      totalSpent: amount,
    };
    await insertSupabaseRecord('customers', newCustomer);
    setCustomers(prev => [newCustomer, ...prev]);
  };

  const updateCustomerNotes = async (id: string, notes: string): Promise<void> => {
    const target = customers.find(c => c.id === id);
    if (!target) return;
    const updated = { ...target, notes };
    await updateSupabaseRecord('customers', updated);
    setCustomers(prev => prev.map(c => c.id === id ? updated : c));
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
    const adminUser: User = { id: 'local-admin', name: 'Administrator', username: 'wdjlanka', password: '', role: 'ADMIN', status: 'ACTIVE', dateCreated: new Date().toISOString() };
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

  // Clear all operational records and leave the database empty.
  const resetAllDataToDefault = () => {
    setItems([]);
    setTags(INITIAL_TAGS);
    setSales([]);
    setCustomers([]);
    setCustomerRequests([]);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    if (hasSupabase()) {
      void Promise.all(['items', 'sales', 'customers', 'customer_requests'].map(clearSupabaseCollection));
    }
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
        isDarkMode,
        setIsDarkMode,
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
        cart,
        isCartOpen,
        addItemToCart,
        updateCartLine,
        removeCartLine,
        clearCart,
        checkoutCart,
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
        setSelectedLabelItemCodes,
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
