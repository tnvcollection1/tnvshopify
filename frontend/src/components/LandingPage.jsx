import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ChevronRight,
  Play,
  Star,
  Menu,
  X
} from "lucide-react";

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <Store className="w-6 h-6" />,
      title: "Multi-store management",
      description: "Connect and manage multiple Shopify stores from one dashboard. Sync orders, inventory, and customers automatically."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Advanced analytics",
      description: "Real-time insights on sales, customer behavior, and inventory performance. Make data-driven decisions."
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "WhatsApp Business",
      description: "Send automated order updates, marketing campaigns, and chat with customers via WhatsApp Business API."
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Smart inventory",
      description: "AI-powered inventory management with dead stock detection, dynamic pricing, and automated clearance campaigns."
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Dynamic pricing",
      description: "Automatically adjust prices based on demand, inventory levels, and sales velocity to maximize profits."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Customer segmentation",
      description: "Segment customers by behavior and purchase history. Create targeted marketing campaigns for each group."
    }
  ];

  const stats = [
    { value: "10K+", label: "Orders managed" },
    { value: "₹50L+", label: "Revenue tracked" },
    { value: "95%", label: "Delivery success" },
    { value: "500+", label: "Happy merchants" }
  ];

  const testimonials = [
    {
      quote: "This platform transformed how we manage our stores. The automation features alone save us hours every day.",
      author: "Priya Sharma",
      role: "Founder, Fashion Hub",
      avatar: "PS"
    },
    {
      quote: "The WhatsApp integration is incredible. Our customer engagement has increased by 40% since we started using it.",
      author: "Rahul Verma",
      role: "CEO, TechGadgets India",
      avatar: "RV"
    },
    {
      quote: "Finally, a platform that understands Indian e-commerce. The inventory management is exactly what we needed.",
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
      description: "Perfect for small businesses",
      features: [
        "1 Store connection",
        "Up to 500 orders/month",
        "Basic analytics",
        "WhatsApp notifications",
        "Email support"
      ],
      cta: "Start free trial",
      popular: false
    },
    {
      name: "Growth",
      price: "₹2,999",
      period: "/month",
      description: "For growing businesses",
      features: [
        "3 Store connections",
        "Up to 5,000 orders/month",
        "Advanced analytics",
        "WhatsApp campaigns",
        "Dynamic pricing",
        "Priority support"
      ],
      cta: "Start free trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "₹9,999",
      period: "/month",
      description: "For large operations",
      features: [
        "Unlimited stores",
        "Unlimited orders",
        "Custom integrations",
        "Dedicated manager",
        "24/7 phone support",
        "Custom reports"
      ],
      cta: "Contact sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#95bf47] rounded-md flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">OmniSales</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Testimonials</a>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Log in
                </Button>
              </Link>
              <Link to="/login">
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  Start free trial
                </Button>
              </Link>
            </div>

            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4">
            <div className="space-y-4">
              <a href="#features" className="block text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="block text-gray-600 hover:text-gray-900">Pricing</a>
              <a href="#testimonials" className="block text-gray-600 hover:text-gray-900">Testimonials</a>
              <Link to="/login" className="block">
                <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                  Start free trial
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-green-700 font-medium">Now with AI-powered insights</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-gray-900 leading-tight mb-6">
              The commerce platform made for <span className="text-[#95bf47]">Indian businesses</span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Manage orders, inventory, and customer relationships from one powerful dashboard. 
              Built for businesses that want to grow.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link to="/login">
                <Button size="lg" className="bg-gray-900 hover:bg-gray-800 text-white px-8 h-12 text-base">
                  Start free trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 px-8 h-12 text-base">
                <Play className="w-4 h-4 mr-2" />
                Watch demo
              </Button>
            </div>

            <p className="text-sm text-gray-500">Free 14-day trial • No credit card required</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mt-16 pt-16 border-t border-gray-200">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-semibold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
            </div>
            <div className="flex">
              {/* Mini Sidebar */}
              <div className="w-48 bg-[#1a1a1a] p-4 hidden md:block">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-6 h-6 bg-[#95bf47] rounded flex items-center justify-center">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white text-sm font-medium">OmniSales</span>
                </div>
                <div className="space-y-1">
                  <div className="px-3 py-2 bg-gray-800 rounded text-white text-sm">Orders</div>
                  <div className="px-3 py-2 text-gray-400 text-sm">Products</div>
                  <div className="px-3 py-2 text-gray-400 text-sm">Customers</div>
                  <div className="px-3 py-2 text-gray-400 text-sm">Analytics</div>
                  <div className="px-3 py-2 text-gray-400 text-sm">Marketing</div>
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 p-6 bg-[#f6f6f7]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Orders</h3>
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-600">Export</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">Total orders</p>
                    <p className="text-2xl font-semibold text-gray-900">23,421</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">Fulfilled</p>
                    <p className="text-2xl font-semibold text-gray-900">18,234</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-2xl font-semibold text-gray-900">5,187</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">₹54.2L</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-900">Recent orders</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {[1,2,3].map(i => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-blue-600">#2950{i}</span>
                          <span className="text-sm text-gray-600">Customer {i}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded">Fulfilled</span>
                          <span className="text-sm text-gray-900">₹2,340</span>
                        </div>
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
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
              Everything you need to grow
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From order management to AI-powered marketing, get all the tools to run your e-commerce business.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center mb-4">
                  <span className="text-[#95bf47]">{feature.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">Loved by businesses</h2>
            <p className="text-lg text-gray-600">See what our customers have to say</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl bg-white border border-gray-200"
              >
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{testimonial.author}</div>
                    <div className="text-gray-500 text-xs">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">Simple pricing</h2>
            <p className="text-lg text-gray-600">Start free, upgrade when you're ready</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index}
                className={`relative p-6 rounded-xl border ${
                  plan.popular 
                    ? 'border-[#95bf47] shadow-lg' 
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#95bf47] text-white text-xs font-medium px-3 py-1 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-semibold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-[#95bf47]" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/login">
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                        : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-4">
            Ready to grow your business?
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Join thousands of Indian businesses already using OmniSales.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button size="lg" className="bg-white hover:bg-gray-100 text-gray-900 px-8 h-12">
                Start free trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#95bf47] rounded-md flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold text-gray-900">OmniSales</span>
              </div>
              <p className="text-sm text-gray-500">
                The commerce platform for Indian businesses.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-900">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-900">Pricing</a></li>
                <li><a href="#" className="hover:text-gray-900">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900">About</a></li>
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
                <li><a href="#" className="hover:text-gray-900">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900">Privacy</a></li>
                <li><a href="#" className="hover:text-gray-900">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">© 2025 OmniSales. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
