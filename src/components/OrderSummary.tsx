import { ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { canAccess } from '../data/accessApi';
export function OrderSummary() {
  const { cart, currentUser, formatCurrency, updateCartLine, removeCartLine, openCart } = useApp();
  if (!canAccess(currentUser, 'sell')) return null;
  const units = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.item.sellingPrice * line.quantity, 0);
  const discount = cart.reduce((sum, line) => sum + (line.discountEnabled ? line.discount : 0), 0);
  return <aside className="order-summary" aria-label="Current order">
    <div className="order-heading"><div><span className="order-eyebrow">POINT OF SALE</span><h2>Current order</h2></div><ShoppingBag size={22} /></div>
    <p className="order-caption">{units} units · {cart.length} products</p>
    <div className="order-lines">{cart.length ? cart.map(line => <div className="order-line" key={line.item.id}>
      <div className="order-product"><strong>{line.item.name}</strong><button onClick={() => removeCartLine(line.item.id)} aria-label={`Remove ${line.item.name}`}><Trash2 size={16} /></button></div>
      <span className="order-caption">{line.item.code} · {formatCurrency(line.item.sellingPrice)} each</span>
      <div className="order-quantity"><div><button disabled={line.quantity <= 1} aria-label={`Decrease ${line.item.name}`} onClick={() => updateCartLine(line.item.id, { quantity: line.quantity - 1 })}><Minus size={14} /></button><span>{line.quantity}</span><button disabled={line.quantity >= (line.item.quantity ?? 1)} aria-label={`Increase ${line.item.name}`} onClick={() => updateCartLine(line.item.id, { quantity: line.quantity + 1 })}><Plus size={14} /></button></div><strong>{formatCurrency(Math.max(0, line.item.sellingPrice * line.quantity - (line.discountEnabled ? line.discount : 0)))}</strong></div>
    </div>) : <div className="order-empty"><ShoppingBag size={38} /><h3>Your next sale starts here</h3><p>Add a product from the catalog to create an order.</p></div>}</div>
    <div className="order-totals"><div><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>{discount > 0 && <div><span>Discount</span><strong>−{formatCurrency(discount)}</strong></div>}<div className="order-grand"><span>Total</span><strong>{formatCurrency(subtotal - discount)}</strong></div><button disabled={!cart.length} onClick={openCart}>Review & checkout <span>→</span></button></div>
  </aside>;
}
