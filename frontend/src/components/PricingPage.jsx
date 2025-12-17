import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Check,
  Zap,
  Building2,
  Rocket,
  Crown,
  CreditCard,
  Calendar,
  ArrowRight,
  Loader2,
  Star,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

const PricingPage = ({ user }) => {
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly"); // monthly or annual
  const [annualDiscount, setAnnualDiscount] = useState(20);

  useEffect(() => {
    loadPlans();
    loadSubscriptionStatus();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  };

  const loadPlans = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions/plans`);
      setPlans(response.data.plans || []);
      setAnnualDiscount(response.data.annual_discount_percent || 20);
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error("Failed to load subscription plans");
    }
  };

  const loadSubscriptionStatus = async () => {
    setLoading(true);
    try {
      const userId = user?.id || "default-user";
      const response = await axios.get(`${API}/subscriptions/status/${userId}`);
      setCurrentSubscription(response.data.subscription);
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (planId === "free") {
      toast.info("You're already on the Free plan!");
      return;
    }

    if (currentSubscription?.plan_id === planId && !currentSubscription?.is_free) {
      toast.info("You're already subscribed to this plan!");
      return;
    }

    setProcessing(true);

    try {
      // Create order
      const orderResponse = await axios.post(`${API}/subscriptions/create-order`, {
        plan_id: planId,
        billing_cycle: billingCycle,
        user_id: user?.id || "default-user",
        tenant_id: user?.tenant_id || "default-tenant"
      });

      const { order_id, amount, key_id, plan } = orderResponse.data;

      // Initialize Razorpay
      const options = {
        key: key_id || RAZORPAY_KEY_ID,
        amount: amount,
        currency: "INR",
        name: "Wamerce",
        description: `${plan.name} Plan - ${billingCycle === "annual" ? "Annual" : "Monthly"} Subscription`,
        order_id: order_id,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await axios.post(`${API}/subscriptions/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId,
              user_id: user?.id || "default-user",
              tenant_id: user?.tenant_id || "default-tenant"
            });

            if (verifyResponse.data.success) {
              toast.success(verifyResponse.data.message);
              loadSubscriptionStatus();
            }
          } catch (error) {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || ""
        },
        theme: {
          color: "#16a34a" // Green theme
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error(error.response?.data?.detail || "Failed to initiate payment");
    } finally {
      setProcessing(false);
    }
  };

  const getPlanIcon = (planId) => {
    const icons = {
      free: <Zap className="w-6 h-6" />,
      starter: <Rocket className="w-6 h-6" />,
      growth: <Building2 className="w-6 h-6" />,
      enterprise: <Crown className="w-6 h-6" />
    };
    return icons[planId] || <Zap className="w-6 h-6" />;
  };

  const getPlanColor = (planId) => {
    const colors = {
      free: "text-gray-600 bg-gray-100",
      starter: "text-blue-600 bg-blue-100",
      growth: "text-green-600 bg-green-100",
      enterprise: "text-purple-600 bg-purple-100"
    };
    return colors[planId] || "text-gray-600 bg-gray-100";
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose Your Plan
          </h1>
          <p className="text-gray-600 mb-6">
            Scale your e-commerce business with the right tools
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${billingCycle === "monthly" ? "text-gray-900" : "text-gray-500"}`}>
              Monthly
            </span>
            <Switch
              checked={billingCycle === "annual"}
              onCheckedChange={(checked) => setBillingCycle(checked ? "annual" : "monthly")}
            />
            <span className={`text-sm font-medium ${billingCycle === "annual" ? "text-gray-900" : "text-gray-500"}`}>
              Annual
            </span>
            {billingCycle === "annual" && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Save {annualDiscount}%
              </Badge>
            )}
          </div>

          {/* Current Plan Badge */}
          {currentSubscription && !currentSubscription.is_free && (
            <div className="mt-4">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-4 py-1">
                <Star className="w-3 h-3 mr-1" />
                Current Plan: {currentSubscription.plan_name}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;
            const price = billingCycle === "annual" ? plan.annual_monthly_price : plan.monthly_price;

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  plan.popular ? "border-2 border-green-500 shadow-lg" : ""
                } ${isCurrentPlan ? "ring-2 ring-blue-500" : ""}`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Current Plan Indicator */}
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0">
                    <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
                      CURRENT
                    </div>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg ${getPlanColor(plan.id)} flex items-center justify-center mb-4`}>
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatPrice(price)}
                      </span>
                      <span className="text-gray-500">/month</span>
                    </div>
                    {billingCycle === "annual" && plan.price > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPrice(plan.annual_price)} billed annually
                      </p>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-4">
                  <ul className="space-y-3">
                    {plan.features?.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-green-600 hover:bg-green-700"
                        : isCurrentPlan
                        ? "bg-blue-600 hover:bg-blue-700"
                        : ""
                    }`}
                    variant={plan.id === "free" ? "outline" : "default"}
                    disabled={processing || (isCurrentPlan && !currentSubscription?.is_free)}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <>
                        {isCurrentPlan ? (
                          "Current Plan"
                        ) : plan.id === "free" ? (
                          "Free Forever"
                        ) : (
                          <>
                            Get Started
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Features Comparison (Optional) */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            All Plans Include
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">SSL Security</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Secure Payments</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Cancel Anytime</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Instant Setup</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border">
              <h3 className="font-semibold text-gray-900">Can I change plans later?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <h3 className="font-semibold text-gray-900">What payment methods do you accept?</h3>
              <p className="text-sm text-gray-600 mt-1">
                We accept all major credit/debit cards, UPI, net banking, and wallets via Razorpay.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <h3 className="font-semibold text-gray-900">Is there a free trial?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Yes! Our Free plan lets you try the platform with 1 store and 100 orders/month. No credit card required.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <h3 className="font-semibold text-gray-900">How do I cancel my subscription?</h3>
              <p className="text-sm text-gray-600 mt-1">
                You can cancel anytime from your account settings. You'll continue to have access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
