export type UserRole = 'ADMIN' | 'EMPLOYEE';

export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  dateCreated: string;
  phone?: string;
  avatar?: string;
}

export type ItemStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DELETED';

export type ItemCondition = 
  | 'Brand New'
  | 'Like New'
  | 'Used - Excellent'
  | 'Used - Good'
  | 'Used - Fair'
  | 'Other';

export interface ItemType {
  id: string;
  name: string;
}

export interface Subcategory {
  id: string;
  name: string;
  itemTypes: ItemType[];
}

export interface Category {
  id: string;
  name: string;
  prefix: string; // e.g. 'B' for Bicycles, 'M' for Music, 'H' for Home, 'E' for Electronics
  description?: string;
  icon?: string;
  subcategories: Subcategory[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  isActive: boolean;
}

export interface Item {
  id: string;
  code: string; // Unique short code like B001, M014, H021
  name: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  itemTypeId?: string;
  itemTypeName?: string;
  brand: string;
  model: string;
  condition: ItemCondition;
  description?: string;
  tags: string[]; // Tag names
  costPrice: number; // In Rs. (Admin only)
  sellingPrice: number; // In Rs.
  quantity?: number; // Current stock quantity; legacy records default to 1.
  maxDiscount: number; // Maximum allowed discount in Rs.
  photo1?: string;
  photo2?: string;
  status: ItemStatus;
  dateAdded: string; // ISO or YYYY-MM-DD
  dateUpdated?: string;
  
  // Sale details (when status === 'SOLD')
  soldDate?: string;
  soldPrice?: number;
  soldDiscount?: number;
  soldCustomerId?: string;
  soldCustomerName?: string;
  soldCustomerPhone?: string;
  soldEmployeeId?: string;
  soldEmployeeName?: string;
  soldNote?: string;
  
  // Recycle bin
  deletedAt?: string;
  previousStatus?: ItemStatus;
}

export interface Sale {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  originalPrice: number;
  soldPrice: number;
  discount: number;
  quantity?: number;
  cost: number; // Admin only
  profit: number; // Admin only (soldPrice - cost)
  customerId: string;
  customerName: string;
  customerPhone: string;
  employeeId: string;
  employeeName: string;
  saleDate: string; // ISO date string
  paymentType?: 'Cash' | 'Card' | 'Credit' | 'Bank Transfer';
  note?: string;
}

export interface CartLine {
  item: Item;
  quantity: number;
  discount: number;
}

export interface Customer {
  id: string;
  customerCode?: string;
  name: string;
  phone: string;
  notes?: string;
  dateAdded: string;
  purchases: string[]; // item codes
  totalSpent: number;
  lastPurchaseDate?: string;
}

export type CustomerRequestStatus = 'PENDING' | 'SOURCED' | 'COMPLETED' | 'CANCELLED';

export interface CustomerRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  itemName: string;
  quantity: number;
  notes?: string;
  requestDate: string;
  status: CustomerRequestStatus;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  itemCode?: string;
  date: string;
  time: string;
  details: string;
}

export interface BusinessSettings {
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  dateFormat: string;
  defaultMaxDiscountPercent: number;
  labelConfig: {
    labelsPerRow: number;
    showPrice: boolean;
    showBrand: boolean;
    showCategory: boolean;
    showCondition: boolean;
    customFooterText: string;
  };
  googleSheetsSync: {
    enabled: boolean;
    sheetUrl: string;
    lastSynced?: string;
  };
}

export type DateFilterOption = 
  | 'Today'
  | 'Yesterday'
  | 'This Week'
  | 'This Month'
  | 'Last Month'
  | 'This Year'
  | 'Custom Date Range';
