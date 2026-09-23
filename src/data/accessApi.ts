import { supabase } from '../supabaseClient';
import type { User, Item, Sale, Category, Customer, CustomerRequest } from '../types';
export const PERMISSIONS = [
  ['sell', 'Sell items / POS'], ['sales', 'View sales history'], ['customers', 'View customers'],
  ['labels', 'Print QR labels'], ['reports', 'Reports, cost prices & profit'],
] as const;
export function canAccess(user: User | null, permission: string) {
  return user?.role === 'ADMIN' || Boolean(user?.permissions?.includes(permission));
}
export function canOpenTab(user: User | null, tab: string) {
  if (user?.role === 'ADMIN') return true;
  if (['dashboard','items','settings'].includes(tab)) return Boolean(user);
  return canAccess(user, ({ 'qr-labels': 'labels' } as Record<string,string>)[tab] || tab);
}
export async function accessApi<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('Sign-in is not configured.');
  const { data, error } = await supabase.functions.invoke('pos-access', { body: { ...body, action } });
  if (error) {
    let message = 'Unable to connect. Please try again.';
    try { const result = await error.context?.json(); if (result?.error) message = result.error; } catch { /* Network failure. */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
export interface StaffData { items: Item[]; sales: Sale[]; categories: Category[]; customers: Customer[]; customer_requests: CustomerRequest[] }
