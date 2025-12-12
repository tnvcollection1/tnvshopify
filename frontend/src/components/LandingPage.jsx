import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Check, 
  Store, 
  BarChart3, 
  MessageSquare, 
  Package, 
  Zap, 
  Shield, 
  Globe, 
  Users,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Play,
  Star
} from "lucide-react";

// Animated text rotation for hero
const rotatingTexts = [
  "retail empire",
  "business hub",
  "sales machine",
  "growth engine",
  "command center"
];

const LandingPage = () => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % rotatingTexts.length);
        setIsVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Store className="w-6 h-6" />,
      title: "Multi-Store Management",
      description: "Connect multiple Shopify stores and manage all your inventory, orders, and customers from one dashboard."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "AI-Powered Analytics",
      description: "Get intelligent insights on sales trends, customer behavior, and inventory optimization powered by AI."
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "WhatsApp Marketing",
      description: "Send bulk campaigns, automate order updates, and chat with customers directly via WhatsApp Business API."
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Smart Inventory",
      description: "Dynamic pricing, dead stock identification, and automated clearance campaigns to maximize your profits."
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Dynamic Pricing Engine",
      description: "AI automatically adjusts prices based on demand, inventory levels, and competitor analysis."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Customer Segmentation",
      description: "Segment customers by behavior, purchase history, and engagement for targeted marketing."
    }
  ];

  const stats = [
    { value: "10K+", label: "Orders Managed" },
    { value: "₹50L+", label: "Revenue Tracked" },
    { value: "95%", label: "Delivery Success" },
    { value: "24/7", label: "Support" }
  ];

  const testimonials = [
    {
      quote: "OmniSales transformed how we manage our multiple stores. The AI insights alone have increased our sales by 40%.",
      author: "Priya Sharma",
      role: "Founder, Fashion Hub",
      avatar: "PS"
    },
    {
      quote: "The WhatsApp integration is a game-changer. Our customer engagement has never been higher.",
      author: "Rahul Verma",
      role: "CEO, TechGadgets India",
      avatar: "RV"
    },
    {
      quote: "Finally, a platform that understands Indian e-commerce. The inventory management is brilliant.",
      author: "Anita Desai",
      role: "Operations Head, StyleKart",
      avatar: "AD"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "₹999",
      period: "/month",
      description: "Perfect for small businesses just getting started",
      features: [
        "1 Store Connection",
        "Up to 500 orders/month",
        "Basic Analytics",
        "WhatsApp Notifications",
        "Email Support"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Growth",
      price: "₹2,999",
      period: "/month",
      description: "For growing businesses ready to scale",
      features: [
        "3 Store Connections",
        "Up to 5,000 orders/month",
        "AI Analytics & Insights",
        "WhatsApp Marketing Campaigns",
        "Dynamic Pricing Engine",
        "Priority Support"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "₹9,999",
      period: "/month",
      description: "For large operations with custom needs",
      features: [
        "Unlimited Stores",
        "Unlimited Orders",
        "Advanced AI Features",
        "Custom Integrations",
        "Dedicated Account Manager",
        "24/7 Phone Support",
        "Custom Reports"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">OmniSales</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</a>
              <a href="#testimonials" className="text-gray-400 hover:text-white transition-colors text-sm">Testimonials</a>
            </div>
            
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
                  Log in
                </Button>
              </Link>
              <Link to="/login">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold">
                  Start free trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-gray-300">Now with AI-powered insights</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
            <span className="text-white">Build your</span>
            <br />
            <span 
              className={`bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            >
              {rotatingTexts[currentTextIndex]}
            </span>
          </h1>
          
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            The all-in-one commerce platform that helps Indian businesses manage orders, 
            inventory, marketing, and customer relationships — all from one powerful dashboard.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/login">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-8 py-6 text-lg rounded-xl">
                Start for free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl">
              <Play className="w-5 h-5 mr-2" />
              Watch demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-1">
            <div className="bg-[#1a1a1a] rounded-xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white/10 rounded-lg px-4 py-1 text-sm text-gray-400">
                    omnisales.app/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard preview image placeholder */}
              <div className="aspect-video bg-gradient-to-br from-[#1a1a1a] via-[#0f1f0f] to-[#1a1a1a] flex items-center justify-center">
                <div className="text-center">
                  <div className="grid grid-cols-3 gap-4 p-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-4 backdrop-blur">
                        <div className="h-3 w-20 bg-white/20 rounded mb-3" />
                        <div className="h-8 w-full bg-emerald-500/20 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> scale your business</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From order management to AI-powered marketing, OmniSales gives you all the tools to run and grow your e-commerce business.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 transition-all duration-300 hover:bg-white/10"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                  <span className="text-emerald-400">{feature.icon}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Logos */}
      <section className="py-16 px-4 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm text-gray-500 mb-8">TRUSTED BY LEADING INDIAN BRANDS</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50">
            {["Shopify", "Razorpay", "TCS", "DTDC", "WhatsApp", "Facebook"].map((brand) => (
              <div key={brand} className="text-xl font-bold text-gray-400">{brand}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Loved by businesses across India</h2>
            <p className="text-gray-400">See what our customers have to say about OmniSales</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl bg-white/5 border border-white/10"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 text-sm leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{testimonial.author}</div>
                    <div className="text-gray-500 text-xs">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-emerald-950/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400">Start free, upgrade when you're ready. No hidden fees.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index}
                className={`relative p-6 rounded-2xl border ${
                  plan.popular 
                    ? 'bg-emerald-500/10 border-emerald-500/50' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-black text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/login">
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-black' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {plan.cta}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-emerald-600/20 rounded-3xl blur-xl" />
            
            <div className="relative bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-3xl border border-emerald-500/30 p-8 md:p-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to transform your business?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Join thousands of Indian businesses already using OmniSales to manage their e-commerce operations.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/login">
                  <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-8">
                    Start your free trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <span className="text-gray-500 text-sm">No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">OmniSales</span>
              </div>
              <p className="text-gray-400 text-sm">
                The all-in-one commerce platform for Indian businesses.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">© 2025 OmniSales. All rights reserved.</p>
            <p className="text-gray-500 text-sm">Made with ❤️ in India</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;