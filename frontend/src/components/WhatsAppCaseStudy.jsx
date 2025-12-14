import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  MessageCircle, 
  Check, 
  ArrowRight, 
  Star, 
  Users, 
  TrendingUp, 
  Clock, 
  ShoppingBag,
  Utensils,
  Scissors,
  Car,
  Building2,
  GraduationCap,
  Heart,
  Plane,
  Home,
  Zap,
  Shield,
  BarChart3,
  Send,
  CheckCircle2,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

const WhatsAppCaseStudy = () => {
  const [email, setEmail] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('restaurant');

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      toast.success('Thanks! We\'ll be in touch soon.');
      setEmail('');
    }
  };

  const industries = [
    { id: 'restaurant', name: 'Restaurants & Cafes', icon: Utensils, color: 'bg-orange-500' },
    { id: 'retail', name: 'Retail & E-commerce', icon: ShoppingBag, color: 'bg-blue-500' },
    { id: 'salon', name: 'Salons & Spas', icon: Scissors, color: 'bg-pink-500' },
    { id: 'automotive', name: 'Automotive', icon: Car, color: 'bg-gray-700' },
    { id: 'realestate', name: 'Real Estate', icon: Building2, color: 'bg-emerald-500' },
    { id: 'education', name: 'Education', icon: GraduationCap, color: 'bg-indigo-500' },
    { id: 'healthcare', name: 'Healthcare', icon: Heart, color: 'bg-red-500' },
    { id: 'travel', name: 'Travel & Hospitality', icon: Plane, color: 'bg-cyan-500' },
  ];

  const caseStudies = {
    restaurant: {
      title: 'How Spice Garden Increased Orders by 340%',
      subtitle: 'Restaurant & Food Service',
      metrics: [
        { label: 'Order Increase', value: '340%', icon: TrendingUp },
        { label: 'Response Time', value: '< 2 min', icon: Clock },
        { label: 'Customer Retention', value: '89%', icon: Users },
        { label: 'Monthly Revenue', value: '+₹4.2L', icon: BarChart3 },
      ],
      challenges: [
        'Phone lines always busy during peak hours',
        'Lost orders due to missed calls',
        'No way to send daily specials to customers',
        'Manual order taking led to errors',
      ],
      solutions: [
        'WhatsApp ordering with automated menu sharing',
        'Instant order confirmations & tracking',
        'Daily specials broadcast to 5000+ customers',
        'Digital menu with photos and prices',
      ],
      testimonial: {
        quote: "WhatsApp transformed our business. We went from 50 orders/day to 200+ without adding staff. Customers love the convenience!",
        author: "Rajesh Kumar",
        role: "Owner, Spice Garden Restaurant"
      },
      features: ['Menu Broadcasting', 'Order Management', 'Payment Links', 'Delivery Tracking', 'Loyalty Programs']
    },
    retail: {
      title: 'Fashion Hub: 5X Sales with WhatsApp Catalog',
      subtitle: 'Retail & E-commerce',
      metrics: [
        { label: 'Sales Growth', value: '500%', icon: TrendingUp },
        { label: 'Cart Recovery', value: '67%', icon: ShoppingBag },
        { label: 'Repeat Customers', value: '78%', icon: Users },
        { label: 'Avg Order Value', value: '+45%', icon: BarChart3 },
      ],
      challenges: [
        'High cart abandonment rate (75%)',
        'Expensive Facebook/Google ads',
        'No direct customer communication',
        'Limited reach for new collections',
      ],
      solutions: [
        'WhatsApp catalog with 1-click ordering',
        'Automated abandoned cart recovery',
        'New arrival broadcasts to VIP list',
        'Personal shopping assistant via chat',
      ],
      testimonial: {
        quote: "We recovered ₹12 lakhs in abandoned carts in just 3 months. WhatsApp is now our #1 sales channel.",
        author: "Priya Sharma",
        role: "Founder, Fashion Hub"
      },
      features: ['Product Catalogs', 'Cart Recovery', 'Order Updates', 'Size Guides', 'COD Collection']
    },
    salon: {
      title: 'Glamour Studio: Zero No-Shows with WhatsApp',
      subtitle: 'Salons & Beauty Services',
      metrics: [
        { label: 'No-Show Rate', value: '-95%', icon: Clock },
        { label: 'Bookings', value: '+180%', icon: TrendingUp },
        { label: 'Review Score', value: '4.9★', icon: Star },
        { label: 'Rebookings', value: '82%', icon: Users },
      ],
      challenges: [
        '30% no-show rate costing ₹2L/month',
        'Phone tag for appointment booking',
        'No automated reminders',
        'Difficulty sharing portfolio',
      ],
      solutions: [
        'WhatsApp booking with instant confirmation',
        '24hr and 2hr automated reminders',
        'Before/after portfolio sharing',
        'Post-service feedback collection',
      ],
      testimonial: {
        quote: "No-shows dropped from 30% to nearly zero. We save 4 hours daily that we spent on phone calls.",
        author: "Neha Patel",
        role: "Owner, Glamour Studio"
      },
      features: ['Appointment Booking', 'Reminders', 'Portfolio Sharing', 'Reviews', 'Loyalty Points']
    },
    automotive: {
      title: 'AutoCare: Service Reminders That Convert',
      subtitle: 'Automotive Services',
      metrics: [
        { label: 'Service Bookings', value: '+220%', icon: TrendingUp },
        { label: 'Customer Return', value: '91%', icon: Users },
        { label: 'Response Rate', value: '94%', icon: MessageCircle },
        { label: 'Revenue/Customer', value: '+65%', icon: BarChart3 },
      ],
      challenges: [
        'Customers forget service schedules',
        'Low response to email reminders',
        'No way to share service videos',
        'Difficult to upsell services',
      ],
      solutions: [
        'Automated service due reminders',
        'Video updates of work in progress',
        'Digital service history access',
        'WhatsApp-based service booking',
      ],
      testimonial: {
        quote: "94% of customers respond to WhatsApp vs 12% to emails. Our workshop is now fully booked 3 weeks ahead.",
        author: "Amit Verma",
        role: "Manager, AutoCare Services"
      },
      features: ['Service Reminders', 'Video Updates', 'Booking System', 'Payment Links', 'Service History']
    },
    realestate: {
      title: 'PropFirst: Closing Deals 3X Faster',
      subtitle: 'Real Estate',
      metrics: [
        { label: 'Lead Response', value: '< 5 min', icon: Clock },
        { label: 'Site Visits', value: '+175%', icon: TrendingUp },
        { label: 'Conversion Rate', value: '34%', icon: Users },
        { label: 'Deal Closure', value: '3X faster', icon: Zap },
      ],
      challenges: [
        'Slow lead response losing hot buyers',
        'Sharing property details via email fails',
        'No way to send virtual tours easily',
        'Losing track of interested buyers',
      ],
      solutions: [
        'Instant lead response with property details',
        'WhatsApp property catalogs with photos/videos',
        'Virtual tour links via chat',
        'Automated follow-up sequences',
      ],
      testimonial: {
        quote: "We closed a ₹2.5 Cr deal entirely through WhatsApp. The buyer was in Dubai and never visited until possession!",
        author: "Vikram Singh",
        role: "Director, PropFirst Realty"
      },
      features: ['Property Catalogs', 'Virtual Tours', 'Lead Management', 'Document Sharing', 'Payment Tracking']
    },
    education: {
      title: 'EduSmart: 98% Parent Engagement',
      subtitle: 'Education & Coaching',
      metrics: [
        { label: 'Parent Engagement', value: '98%', icon: Users },
        { label: 'Fee Collection', value: '+40%', icon: BarChart3 },
        { label: 'Attendance Updates', value: 'Real-time', icon: Clock },
        { label: 'Inquiry Conversion', value: '67%', icon: TrendingUp },
      ],
      challenges: [
        'Parents don\'t read emails or circulars',
        'Fee reminders feel intrusive via calls',
        'No instant communication for emergencies',
        'Difficulty sharing study materials',
      ],
      solutions: [
        'WhatsApp groups for each class',
        'Automated fee reminders with payment links',
        'Instant attendance and grade updates',
        'Study material sharing via broadcasts',
      ],
      testimonial: {
        quote: "Fee collection improved 40% and parent complaints dropped 80%. WhatsApp bridged the school-home gap perfectly.",
        author: "Dr. Meera Joshi",
        role: "Principal, EduSmart Academy"
      },
      features: ['Parent Communication', 'Fee Reminders', 'Attendance Updates', 'Material Sharing', 'Admission Inquiries']
    },
    healthcare: {
      title: 'MediCare Clinic: Reducing No-Shows by 85%',
      subtitle: 'Healthcare & Clinics',
      metrics: [
        { label: 'No-Shows', value: '-85%', icon: Clock },
        { label: 'Patient Satisfaction', value: '96%', icon: Heart },
        { label: 'Appointment Bookings', value: '+200%', icon: TrendingUp },
        { label: 'Report Delivery', value: 'Instant', icon: Zap },
      ],
      challenges: [
        'High no-show rate (40%)',
        'Patients calling for report status',
        'Difficulty sending health tips',
        'Manual appointment reminders',
      ],
      solutions: [
        'Automated appointment reminders',
        'Lab report delivery via WhatsApp',
        'Health tips broadcasts to patients',
        'Easy rebooking via chat',
      ],
      testimonial: {
        quote: "Patients love getting reports on WhatsApp. Our staff saves 3 hours daily not answering report status calls.",
        author: "Dr. Rahul Mehta",
        role: "Director, MediCare Clinic"
      },
      features: ['Appointment Reminders', 'Report Delivery', 'Health Tips', 'Prescription Refills', 'Feedback Collection']
    },
    travel: {
      title: 'TravelEase: Booking to Boarding on WhatsApp',
      subtitle: 'Travel & Tourism',
      metrics: [
        { label: 'Booking Conversion', value: '+250%', icon: TrendingUp },
        { label: 'Customer Queries', value: '-60%', icon: MessageCircle },
        { label: 'Repeat Bookings', value: '73%', icon: Users },
        { label: 'Response Time', value: '< 3 min', icon: Clock },
      ],
      challenges: [
        'Customers need instant itinerary access',
        'Multiple calls for booking updates',
        'Sharing documents via email fails',
        'No way to send travel tips',
      ],
      solutions: [
        'Itinerary sharing via WhatsApp',
        'Real-time booking confirmations',
        'Document collection via chat',
        'Automated travel tips and reminders',
      ],
      testimonial: {
        quote: "We handle 500+ bookings monthly with just 3 agents. WhatsApp automation is our secret weapon.",
        author: "Sneha Kapoor",
        role: "CEO, TravelEase"
      },
      features: ['Itinerary Sharing', 'Booking Updates', 'Document Collection', 'Travel Tips', 'Emergency Support']
    },
  };

  const currentCase = caseStudies[selectedIndustry];
  const currentIndustry = industries.find(i => i.id === selectedIndustry);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjMCAwLTItMi0yLTRzMi00IDItNCAyIDIgNCAyYzAgMCAyIDIgMiA0cy0yIDQtMiA0LTIgMi00IDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-6 py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-6">
                🚀 Transform Your Business with WhatsApp
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Turn WhatsApp into Your
                <span className="text-yellow-300"> #1 Sales Channel</span>
              </h1>
              <p className="text-xl text-green-100 mb-8">
                Join 10,000+ businesses using WhatsApp to increase sales, reduce costs, and delight customers. See real results from your industry.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-white text-green-600 hover:bg-green-50 font-semibold">
                  <Play className="w-5 h-5 mr-2" /> Watch Demo
                </Button>
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10">
                  Start Free Trial
                </Button>
              </div>
              
              {/* Trust Badges */}
              <div className="flex items-center gap-8 mt-10 pt-10 border-t border-white/20">
                <div className="text-center">
                  <p className="text-3xl font-bold">10K+</p>
                  <p className="text-sm text-green-200">Businesses</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">50M+</p>
                  <p className="text-sm text-green-200">Messages/Month</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">340%</p>
                  <p className="text-sm text-green-200">Avg. ROI</p>
                </div>
              </div>
            </div>
            
            {/* Phone Mockup */}
            <div className="relative hidden lg:block">
              <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl max-w-sm mx-auto">
                <div className="bg-white rounded-[2.5rem] overflow-hidden">
                  {/* WhatsApp Header */}
                  <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-3">
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
                      <p className="text-sm">Hi! I'd like to place an order 🍕</p>
                      <p className="text-xs text-gray-400 text-right mt-1">10:30 AM</p>
                    </div>
                    <div className="bg-green-100 rounded-lg p-3 max-w-[80%] ml-auto shadow-sm">
                      <p className="text-sm">Welcome! 🎉 Here's our menu. What would you like today?</p>
                      <p className="text-xs text-gray-400 text-right mt-1">10:30 AM ✓✓</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                      <p className="text-sm">1 Margherita Pizza, 2 Cokes please</p>
                      <p className="text-xs text-gray-400 text-right mt-1">10:31 AM</p>
                    </div>
                    <div className="bg-green-100 rounded-lg p-3 max-w-[80%] ml-auto shadow-sm">
                      <p className="text-sm">Order confirmed! ✅<br/>Total: ₹549<br/>Delivery in 30 mins 🛵</p>
                      <p className="text-xs text-gray-400 text-right mt-1">10:31 AM ✓✓</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Selector */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Success Stories From Your Industry
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              See how businesses like yours are winning with WhatsApp. Select your industry to view relevant case studies.
            </p>
          </div>

          {/* Industry Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {industries.map((industry) => {
              const Icon = industry.icon;
              return (
                <button
                  key={industry.id}
                  onClick={() => setSelectedIndustry(industry.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedIndustry === industry.id
                      ? `${industry.color} text-white shadow-lg`
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {industry.name}
                </button>
              );
            })}
          </div>

          {/* Case Study Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className={`${currentIndustry?.color} text-white px-8 py-6`}>
              <Badge className="bg-white/20 text-white border-0 mb-2">{currentCase.subtitle}</Badge>
              <h3 className="text-2xl font-bold">{currentCase.title}</h3>
            </div>

            <div className="p-8">
              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                {currentCase.metrics.map((metric, idx) => {
                  const Icon = metric.icon;
                  return (
                    <div key={idx} className="text-center p-4 bg-gray-50 rounded-xl">
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${currentIndustry?.color.replace('bg-', 'text-')}`} />
                      <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                      <p className="text-sm text-gray-500">{metric.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-10">
                {/* Challenges */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-sm">✗</span>
                    Challenges Before
                  </h4>
                  <ul className="space-y-3">
                    {currentCase.challenges.map((challenge, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-600">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2"></span>
                        {challenge}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Solutions */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">✓</span>
                    WhatsApp Solutions
                  </h4>
                  <ul className="space-y-3">
                    {currentCase.solutions.map((solution, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-600">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        {solution}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Testimonial */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex gap-4">
                  <div className="text-4xl text-gray-300">"</div>
                  <div>
                    <p className="text-gray-700 italic mb-4">{currentCase.testimonial.quote}</p>
                    <div>
                      <p className="font-semibold text-gray-900">{currentCase.testimonial.author}</p>
                      <p className="text-sm text-gray-500">{currentCase.testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Used */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-500 mr-2">Features used:</span>
                {currentCase.features.map((feature, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Sell on WhatsApp
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Powerful features designed for every industry. Start selling in minutes, not months.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle,
                title: 'Broadcast Messages',
                description: 'Send promotions, offers, and updates to thousands of customers instantly. 98% open rate guaranteed.',
                color: 'bg-green-100 text-green-600'
              },
              {
                icon: ShoppingBag,
                title: 'Product Catalogs',
                description: 'Share your entire product catalog on WhatsApp. Customers browse and order without leaving the chat.',
                color: 'bg-blue-100 text-blue-600'
              },
              {
                icon: Zap,
                title: 'Automated Replies',
                description: 'Set up instant replies for FAQs, order status, and more. Work 24/7 without extra staff.',
                color: 'bg-yellow-100 text-yellow-600'
              },
              {
                icon: Clock,
                title: 'Appointment Booking',
                description: 'Let customers book appointments directly via WhatsApp. Automatic reminders reduce no-shows by 85%.',
                color: 'bg-purple-100 text-purple-600'
              },
              {
                icon: BarChart3,
                title: 'Analytics Dashboard',
                description: 'Track messages, orders, and revenue. Know exactly what\'s working and optimize for growth.',
                color: 'bg-indigo-100 text-indigo-600'
              },
              {
                icon: Shield,
                title: 'Official API',
                description: 'We use the official WhatsApp Business API. Your account is safe, verified, and reliable.',
                color: 'bg-gray-100 text-gray-600'
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Simple Pricing. Powerful Results.
              </h2>
              <p className="text-gray-400 mb-8">
                Start free, upgrade when you're ready. No hidden fees, no long-term contracts.
              </p>
              
              <div className="space-y-4">
                {[
                  'Unlimited broadcasts to your customers',
                  'Product catalogs with ordering',
                  'Automated replies & chatbots',
                  'Analytics & reporting dashboard',
                  'Official WhatsApp Business API',
                  'Priority support via WhatsApp',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white text-gray-900 rounded-2xl p-8">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-2">Starting at</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">₹999</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">14-day free trial • No credit card required</p>
              </div>

              <form onSubmit={handleSubscribe} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  required
                />
                <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold">
                  Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <p className="text-xs text-gray-500 text-center mt-4">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join 10,000+ businesses already growing with WhatsApp. Start your free trial today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-white text-green-600 hover:bg-green-50 font-semibold">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white mb-4">
                <MessageCircle className="w-6 h-6 text-green-500" />
                <span className="font-bold">MarketSync</span>
              </div>
              <p className="text-sm">
                The complete WhatsApp Business solution for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Industries</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Restaurants</a></li>
                <li><a href="#" className="hover:text-white">Retail</a></li>
                <li><a href="#" className="hover:text-white">Healthcare</a></li>
                <li><a href="#" className="hover:text-white">Education</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Broadcasts</a></li>
                <li><a href="#" className="hover:text-white">Catalogs</a></li>
                <li><a href="#" className="hover:text-white">Automation</a></li>
                <li><a href="#" className="hover:text-white">Analytics</a></li>
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
            <p>© 2024 MarketSync. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WhatsAppCaseStudy;
