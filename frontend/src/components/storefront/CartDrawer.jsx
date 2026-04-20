import { useCart } from "./CartContext";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";

export default function CartDrawer() {
  const { items, totalItems, totalPrice, cartOpen, setCartOpen, updateQuantity, removeItem } = useCart();

  if (!cartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setCartOpen(false)} />

      {/* Drawer */}
      <div data-testid="cart-drawer" className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-white z-[61] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5]">
          <h2 className="text-[15px] font-semibold text-[#212529] tracking-wide uppercase">
            Cart ({totalItems})
          </h2>
          <button onClick={() => setCartOpen(false)} className="p-1 hover:opacity-60" data-testid="close-cart">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag size={40} className="text-[#d5d5d5] mb-4" strokeWidth={1} />
              <p className="text-[15px] text-[#767676] mb-1">Your cart is empty</p>
              <p className="text-[13px] text-[#999]">Add items to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.variant_id} data-testid={`cart-item-${item.variant_id}`} className="flex gap-4 pb-4 border-b border-[#f0f0f0]">
                  {/* Image */}
                  <div className="w-20 h-20 flex-shrink-0 bg-[#F5F5F0] rounded-sm overflow-hidden">
                    {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-semibold text-[#212529] truncate">{item.title?.split(" - ")[0]?.substring(0, 40)}</h4>
                    <p className="text-[11px] text-[#767676] mb-1">
                      {[item.color, item.size].filter(Boolean).join(" / ")}
                    </p>
                    <p className="text-[13px] font-semibold text-[#212529] mb-2">Rs.{item.price.toLocaleString()}</p>
                    {/* Quantity */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                        className="w-7 h-7 border border-[#d5d5d5] rounded-sm flex items-center justify-center hover:bg-[#f5f5f0]">
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-[13px]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                        className="w-7 h-7 border border-[#d5d5d5] rounded-sm flex items-center justify-center hover:bg-[#f5f5f0]">
                        <Plus size={12} />
                      </button>
                      <button onClick={() => removeItem(item.variant_id)}
                        className="ml-auto text-[11px] text-[#999] underline hover:text-[#212529]"
                        data-testid={`remove-${item.variant_id}`}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#e5e5e5] px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#767676]">Subtotal</span>
              <span className="text-[15px] font-semibold text-[#212529]">Rs.{totalPrice.toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-[#999]">Shipping and taxes calculated at checkout</p>
            <a href="/store/checkout" data-testid="checkout-btn"
              className="block w-full bg-[#212529] text-white py-3.5 text-[13px] font-semibold tracking-wider uppercase text-center rounded-sm hover:bg-[#333] transition-colors">
              Checkout
            </a>
            <button onClick={() => setCartOpen(false)}
              className="block w-full text-[13px] text-[#212529] underline underline-offset-2 text-center py-1 hover:text-[#767676]">
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
