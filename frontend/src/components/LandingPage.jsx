import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowRight, 
  Check, 
  Store, 
  BarChart3, 
  MessageCircle, 
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
  X,
  Send,
  Inbox,
  Radio,
  Bell,
  LayoutTemplate,
  UserPlus,
  Bot,
  Clock,
  CheckCircle2
} from "lucide-react";

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <Inbox className="w-6 h-6" />,
      title: "Unified Inbox",
      description: "Manage all your WhatsApp conversations from one powerful inbox. Never miss a customer message again."
    },
    {
      icon: <Radio className="w-6 h-6" />,
      title: "Broadcast Campaigns",
      description: "Send personalized messages to thousands of customers instantly. 98% open rate guaranteed."
    },
    {
      icon: <LayoutTemplate className="w-6 h-6" />,
      title: "Message Templates",
      description: "Create and manage approved WhatsApp templates for quick, professional responses."
    },
    {
      icon: <Bot className="w-6 h-6" />,
      title: "Auto-replies",
      description: "Set up intelligent auto-responses for FAQs, order status, and more. Work 24/7 automatically."
    },
    {
      icon: <Store className="w-6 h-6" />,
      title: "Shopify Integration",
      description: "Connect your Shopify store. Auto-sync orders, send updates, and recover abandoned carts via WhatsApp."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics Dashboard",
      description: "Track message delivery, response rates, and campaign performance in real-time."
    }
  ];

  const stats = [
    { value: "98%", label: "Open rate" },
    { value: "50M+", label: "Messages sent" },
    { value: "10K+", label: "Businesses" },
    { value: "340%", label: "Avg. ROI" }
  ];

  const testimonials = [
    {
      quote: "Wamerce transformed how we engage customers. Our response time dropped from hours to minutes.",
      author: "Priya Sharma",
      role: "Founder, Fashion Hub",
      avatar: "PS"
    },
    {
      quote: "The broadcast feature is incredible. We recovered ₹12 lakhs in abandoned carts in just 3 months.",
      author: "Rahul Verma",
      role: "CEO, TechGadgets India",
      avatar: "RV"
    },
    {
      quote: "Finally, a platform that makes WhatsApp marketing easy. Our sales have increased by 340%.",
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
        "1,000 contacts",
        "5,000 messages/month",
        "Basic templates",
        "Inbox & Auto-replies",
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
        "10,000 contacts",
        "50,000 messages/month",
        "Unlimited templates",
        "Shopify integration",
        "Broadcast campaigns",
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
        "Unlimited contacts",
        "Unlimited messages",
        "API access",
        "Multiple stores",
        "Dedicated manager",
        "24/7 phone support"
      ],
      cta: "Contact sales",
      popular: false
    }
  ];

  const useCases = [
    { icon: "🍕", title: "Restaurants", desc: "Take orders & send updates" },
    { icon: "👗", title: "Fashion", desc: "Share catalogs & offers" },
    { icon: "💇", title: "Salons", desc: "Bookings & reminders" },
    { icon: "🏥", title: "Healthcare", desc: "Appointments & reports" },
    { icon: "🎓", title: "Education", desc: "Student & parent comms" },
    { icon: "🏠", title: "Real Estate", desc: "Lead follow-ups" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#25d366] rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Wamerce</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Testimonials</a>
              <Link to="/whatsapp-case-study" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Case Studies</Link>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Log in
                </Button>
              </Link>
              <Link to="/login">
                <Button className="bg-[#25d366] hover:bg-[#128c7e] text-white">
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
              <Link to="/whatsapp-case-study" className="block text-gray-600 hover:text-gray-900">Case Studies</Link>
              <Link to="/login" className="block">
                <Button className="w-full bg-[#25d366] hover:bg-[#128c7e] text-white">
                  Start free trial
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#075e54] via-[#128c7e] to-[#25d366]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                <span className="text-sm text-white font-medium">Official WhatsApp Business API</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Turn WhatsApp into Your <span className="text-yellow-300">#1 Sales Channel</span>
              </h1>
              
              <p className="text-lg text-green-100 mb-8 max-w-xl">
                The complete e-commerce CRM for modern businesses. Send broadcasts, manage conversations, 
                and grow sales—all from one powerful dashboard.
              </p>
              
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
                <Link to="/login">
                  <Button size="lg" className="bg-white text-[#075e54] hover:bg-green-50 px-8 h-12 text-base font-semibold">
                    Start free trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/whatsapp-case-study">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 h-12 text-base">
                    <Play className="w-4 h-4 mr-2" />
                    View case studies
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-green-200">Free 14-day trial • No credit card required</p>
            </div>

            {/* Phone Mockup */}
            <div className="relative hidden lg:block">
              <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl max-w-sm mx-auto">
                <div className="bg-white rounded-[2.5rem] overflow-hidden">
                  {/* WhatsApp Header */}
                  <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Your Business</p>
                      <p className="text-xs text-green-200">Online • Instant Replies</p>
                    </div>
                  </div>
                  {/* Chat Messages */}
                  <div className="p-4 space-y-3 bg-[#e5ddd5] min-h-[300px]">
                    <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                      <p className="text-sm">Hi! I'd like to place an order 🛍️</p>
                      <p className="text-xs text-gray-400 text-right mt-1">10:30 AM</p>
                    </div>
                    <div className="bg-[#dcf8c6] rounded-lg p-3 max-w-[80%] ml-auto shadow-sm">
                      <p className="text-sm">Welcome! 🎉 Here's our catalog. What would you like?</p>
                      <p className="text-xs text-gray-500 text-right mt-1">10:30 AM ✓✓</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                      <p className="text-sm">I'll take the blue sneakers, size 42</p>
                      <p className="text-xs text-gray-400 text-right mt-1">10:31 AM</p>
                    </div>
                    <div className="bg-[#dcf8c6] rounded-lg p-3 max-w-[80%] ml-auto shadow-sm">
                      <p className="text-sm">Order confirmed! ✅<br/>Total: ₹2,499<br/>Delivery: 2-3 days 📦</p>
                      <p className="text-xs text-gray-500 text-right mt-1">10:31 AM ✓✓</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mt-16 pt-12 border-t border-white/20">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-green-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-sm text-gray-500 mb-6">TRUSTED BY BUSINESSES IN</p>
          <div className="flex flex-wrap justify-center gap-6">
            {useCases.map((useCase, index) => (
              <div key={index} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                <span className="text-xl">{useCase.icon}</span>
                <span className="text-sm font-medium text-gray-700">{useCase.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to sell on WhatsApp
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed for every business. Start selling in minutes, not months.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-[#25d366]/10 text-[#25d366] rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get started in 3 simple steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Connect WhatsApp", desc: "Link your WhatsApp Business account in minutes with our easy setup wizard." },
              { step: "2", title: "Import Contacts", desc: "Sync your customer database or upload contacts from your existing CRM or Shopify." },
              { step: "3", title: "Start Messaging", desc: "Send broadcasts, manage conversations, and watch your sales grow." }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-[#25d366] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Loved by businesses everywhere
            </h2>
            <p className="text-lg text-gray-600">
              See what our customers have to say about Wamerce
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6">{testimonial.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600">
              Start free, upgrade when you're ready. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-xl p-8 ${
                  plan.popular 
                    ? 'ring-2 ring-[#25d366] shadow-lg relative' 
                    : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#25d366] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-600">
                      <Check className="w-5 h-5 text-[#25d366]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/login">
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-[#25d366] hover:bg-[#128c7e] text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#075e54] to-[#25d366]">
        <div className="max-w-4xl mx-auto text-center">
          <MessageCircle className="w-16 h-16 text-white/80 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to transform your business?
          </h2>
          <p className="text-lg text-green-100 mb-8">
            Join 10,000+ businesses already growing with Wamerce. Start your free trial today.
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-white text-[#075e54] hover:bg-green-50 px-8 h-12 text-base font-semibold">
              Start free trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white mb-4">
                <div className="w-8 h-8 bg-[#25d366] rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold">Wamerce</span>
              </div>
              <p className="text-sm">
                The complete WhatsApp Business solution for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><Link to="/whatsapp-case-study" className="hover:text-white">Case Studies</Link></li>
                <li><a href="#" className="hover:text-white">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Integrations</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Shopify</a></li>
                <li><a href="#" className="hover:text-white">WooCommerce</a></li>
                <li><a href="#" className="hover:text-white">Zapier</a></li>
                <li><a href="#" className="hover:text-white">Custom API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
            <p>© 2024 Wamerce. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
