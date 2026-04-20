import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "./CartContext";
import { ChevronLeft, Lock, Truck, CreditCard } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const [step, setStep] = useState("info"); // info | processing | success
  const [paymentMethod, setPaymentMethod] = useState("prepaid");
  const [processing, setProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [form, setForm] = useState({
    email: "", first_name: "", last_name: "", phone: "",
    address1: "", address2: "", city: "", province: "", zip: "", country: "IN",
  });

  const updateField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCheckout = async () => {
    // Validate
    const required = ["email", "first_name", "last_name", "phone", "address1", "city", "province", "zip"];
    for (const f of required) {
      if (!form[f]?.trim()) return alert(`Please fill in ${f.replace("_", " ")}`);
    }
    if (items.length === 0) return alert("Cart is empty");

    setProcessing(true);
    setStep("processing");

    try {
      const res = await fetch(`${API}/api/checkout/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({
            variant_id: i.variant_id,
            product_id: i.product_id,
            title: i.title,
            variant_title: i.variant_title,
            price: i.price,
            quantity: i.quantity,
            image: i.image,
          })),
          customer: form,
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.detail || "Checkout failed");

      if (paymentMethod === "cod") {
        setOrderResult(data);
        setStep("success");
        clearCart();
        return;
      }

      // Razorpay payment
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Failed to load payment gateway");

      const options = {
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        name: "TNV Collection",
        description: `Order ${data.checkout_id}`,
        order_id: data.razorpay_order_id,
        prefill: {
          name: `${form.first_name} ${form.last_name}`,
          email: form.email,
          contact: form.phone,
        },
        theme: { color: "#212529" },
        handler: async function (response) {
          // Verify payment
          try {
            const verifyRes = await fetch(`${API}/api/checkout/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                checkout_id: data.checkout_id,
              }),
            });
            const verifyData = await verifyRes.json();
            setOrderResult({ ...data, ...verifyData });
            setStep("success");
            clearCart();
          } catch (err) {
            alert("Payment verification failed. Contact support.");
            setStep("info");
          }
        },
        modal: {
          ondismiss: function () {
            setStep("info");
            setProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err.message || "Something went wrong");
      setStep("info");
    } finally {
      setProcessing(false);
    }
  };

  // Success screen
  if (step === "success") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet" />
        <div className="max-w-md w-full text-center" data-testid="order-success">
          <div className="w-16 h-16 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-[#4CAF50]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#212529] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Order Confirmed
          </h1>
          <p className="text-[13px] text-[#767676] mb-6">
            Thank you for your order! {orderResult?.shopify_order_number && `Order #${orderResult.shopify_order_number}`}
          </p>
          <div className="bg-[#F5F5F0] rounded-sm p-5 mb-6 text-left space-y-2">
            <p className="text-[13px] text-[#767676]">
              Payment: <span className="font-semibold text-[#212529]">{paymentMethod === "cod" ? "Cash on Delivery" : "Paid Online"}</span>
            </p>
            <p className="text-[13px] text-[#767676]">
              Total: <span className="font-semibold text-[#212529]">Rs.{totalPrice.toLocaleString() || orderResult?.total?.toLocaleString()}</span>
            </p>
            <p className="text-[13px] text-[#767676]">
              Checkout ID: <span className="font-medium text-[#212529]">{orderResult?.checkout_id}</span>
            </p>
          </div>
          <a href="/store" data-testid="continue-shopping-btn"
            className="inline-block bg-[#212529] text-white px-8 py-3 text-[13px] font-semibold tracking-wider uppercase rounded-sm hover:bg-[#333] transition-colors">
            Continue Shopping
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="border-b border-[#e5e5e5]">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 flex items-center justify-between h-[60px]">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[13px] text-[#767676] hover:text-[#212529]" data-testid="back-to-cart">
            <ChevronLeft size={16} /> Back
          </button>
          <a href="/store" className="text-[22px] text-[#212529]" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 400 }}>
            tnv collection
          </a>
          <div className="flex items-center gap-1 text-[#767676]">
            <Lock size={14} />
            <span className="text-[11px]">Secure</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left: Form */}
          <div className="lg:col-span-3">
            <h1 className="text-xl font-semibold text-[#212529] mb-6">Checkout</h1>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#767676] mb-3">Contact Information</h2>
              <div className="space-y-3">
                <input data-testid="field-email" value={form.email} onChange={e => updateField("email", e.target.value)}
                  placeholder="Email" type="email"
                  className="w-full border border-[#d5d5d5] rounded-sm px-4 py-3 text-[13px] focus:outline-none focus:border-[#212529] transition-colors" />
                <div className="grid grid-cols-2 gap-3">
                  <input data-testid="field-first-name" value={form.first_name} onChange={e => updateField("first_name", e.target.value)}
                    placeholder="First name"
                    className="border border-[#d5d5d5] rounded-sm px-4 py-3 text-[13px] focus:outline-none focus:border-[#212529]" />
                  <input data-testid="field-last-name" value={form.last_name} onChange={e => updateField("last_name", e.target.value)}
                    placeholder="Last name"
                    className="border border-[#d5d5d5] rounded-sm px-4 py-3 text-[13px] focus:outline-none focus:border-[#212529]" />
                </div>
                <input data-testid="field-phone" value={form.phone} onChange={e => updateField("phone", e.target.value)}
                  placeholder="Phone" type="tel"
                  className="w-full border border-[#d5d5d5] rounded-sm px-4 py-3 text-[13px] focus:outline-none focus:border-[#212529]" />
              </div>
            </section>

            {/* Shipping */}
            <section className="mb-8">
              <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#767676] mb-3">Shipping Address</h2>
              <div className="space-y-3">
                <input data-testid="field-address1" value={form.address1} onChange={e => updateField("address1", e.target.value)}
                  placeholder="Address"
                  className="w-full border border-[#d5d5d5] rounded-sm px-4 py-3 text-[13px] focus:outline-none focus:border-[#212529]" />
                <input data-testid="field-address2" value={form.address2} onChange={e => updateField("address2", e.target.value)}
                  placeholder="Apartment, suite, etc. (optional)"
                  className="w-full border border-[#d5d5d5] rounded-sm px-4 py-3 text-[13px] focus:outline-none focus:border-[#212529]" />
                <div className="grid grid-cols-3 gap-3">
                  <input data-testid="field-city" value={form.city} onChange={e => updateField("city", e.target.value)}
                    placeholder="City"
                    className="border border-[#d5d5d5] rounded-sm px-4 py-3 text-[13px] focus:outline-none focus:border-[#212529]" />
                  <input data-testid="field-province" value={form.province} onChange={e => updateField("province", e.target.value)}
                    placeholder="State"
                    className="border border-[#d5d5d5] rounded-sm px-4 py-3 text-[13px] focus:outline-none focus:border-[#212529]" />
                  <input data-testid="field-zip" value={form.zip} onChange={e => updateField("zip", e.target.value)}
                    placeholder="PIN code"
                    className="border border-[#d5d5d5] rounded-sm px-4 py-3 text-[13px] focus:outline-none focus:border-[#212529]" />
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="mb-8">
              <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#767676] mb-3">Payment Method</h2>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 p-4 border rounded-sm cursor-pointer transition-colors ${
                  paymentMethod === "prepaid" ? "border-[#212529] bg-[#fafaf8]" : "border-[#d5d5d5]"
                }`}>
                  <input type="radio" name="payment" checked={paymentMethod === "prepaid"} onChange={() => setPaymentMethod("prepaid")}
                    className="accent-[#212529]" />
                  <CreditCard size={18} className="text-[#767676]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#212529]">Pay Online</p>
                    <p className="text-[11px] text-[#999]">Credit/Debit Card, UPI, Netbanking, Wallets</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-4 border rounded-sm cursor-pointer transition-colors ${
                  paymentMethod === "cod" ? "border-[#212529] bg-[#fafaf8]" : "border-[#d5d5d5]"
                }`}>
                  <input type="radio" name="payment" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")}
                    className="accent-[#212529]" />
                  <Truck size={18} className="text-[#767676]" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#212529]">Cash on Delivery</p>
                    <p className="text-[11px] text-[#999]">Pay when you receive your order</p>
                  </div>
                </label>
              </div>
            </section>

            {/* Place Order Button */}
            <button
              onClick={handleCheckout}
              disabled={processing || items.length === 0}
              className="w-full bg-[#212529] text-white py-4 text-[13px] font-semibold tracking-wider uppercase rounded-sm hover:bg-[#333] transition-colors disabled:bg-[#ccc] disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="place-order-btn"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : paymentMethod === "cod" ? (
                `Place Order - Rs.${totalPrice.toLocaleString()}`
              ) : (
                `Pay Rs.${totalPrice.toLocaleString()}`
              )}
            </button>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-[80px] bg-[#FAFAF8] rounded-sm p-5 border border-[#e5e5e5]">
              <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#767676] mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4">
                {items.map(item => (
                  <div key={item.variant_id} className="flex gap-3" data-testid={`summary-item-${item.variant_id}`}>
                    <div className="w-14 h-14 flex-shrink-0 bg-[#F0F0EC] rounded-sm overflow-hidden relative">
                      {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#212529] text-white text-[9px] rounded-full flex items-center justify-center font-medium">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#212529] truncate">{item.title?.split(" - ")[0]?.substring(0, 30)}</p>
                      <p className="text-[11px] text-[#999]">{[item.color, item.size].filter(Boolean).join(" / ")}</p>
                    </div>
                    <p className="text-[12px] font-semibold text-[#212529] flex-shrink-0">Rs.{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#e5e5e5] pt-3 space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#767676]">Subtotal</span>
                  <span className="text-[#212529]">Rs.{totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#767676]">Shipping</span>
                  <span className="text-[#212529]">{totalPrice >= 5000 ? "Free" : "Rs.199"}</span>
                </div>
                <div className="flex justify-between text-[15px] font-semibold border-t border-[#e5e5e5] pt-3">
                  <span className="text-[#212529]">Total</span>
                  <span className="text-[#212529]">Rs.{(totalPrice + (totalPrice >= 5000 ? 0 : 199)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
