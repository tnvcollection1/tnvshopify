import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Zap, ArrowLeft, Eye, EyeOff } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      // Try new users API first (returns permissions)
      const response = await axios.post(`${API}/users/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
      
      if (response.data.success) {
        const user = response.data.user;
        localStorage.setItem("agent", JSON.stringify(user));
        toast.success(`Welcome back, ${user.full_name}!`);
        onLoginSuccess(user);
      }
    } catch (error) {
      // Fallback to old agents API
      try {
        const fallbackResponse = await axios.post(`${API}/agents/login`, {
          username,
          password
        });
        
        if (fallbackResponse.data.success) {
          const agent = fallbackResponse.data.agent;
          // Add default admin permissions for backward compatibility
          agent.permissions = {
            can_view: true,
            can_edit: true,
            can_delete: true,
            can_sync_shopify: true,
            can_manage_users: true,
            can_view_revenue: true,
            can_view_phone: true,
            can_export: true,
            can_send_messages: true,
          };
          agent.role = 'admin';
          localStorage.setItem("agent", JSON.stringify(agent));
          toast.success(`Welcome back, ${agent.full_name}!`);
          onLoginSuccess(agent);
        }
      } catch (fallbackError) {
        console.error("Login error:", error);
        toast.error(error.response?.data?.detail || "Invalid username or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!username || !password || !fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/agents/signup`, {
        username,
        password,
        full_name: fullName
      });
      
      if (response.data.success) {
        const agent = response.data.agent;
        localStorage.setItem("agent", JSON.stringify(agent));
        toast.success(`Welcome, ${agent.full_name}! Your account has been created.`);
        onLoginSuccess(agent);
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setUsername("");
    setPassword("");
    setFullName("");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      
      {/* Back to landing */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back to home</span>
      </Link>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">OmniSales</span>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-gray-400">
              {isSignup ? "Start your free trial today" : "Sign in to your dashboard"}
            </p>
          </div>

          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-5">
            {isSignup && (
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Full Name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-12"
                  data-testid="fullname-input"
                />
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Username</label>
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-12"
                data-testid="username-input"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={isSignup ? "Create a password (min 6 characters)" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-12 pr-12"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold h-12 text-base"
              data-testid={isSignup ? "signup-btn" : "login-btn"}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isSignup ? "Creating Account..." : "Signing in..."}
                </span>
              ) : (
                isSignup ? "Create Account" : "Sign In"
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              disabled={loading}
              className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">Demo: <span className="text-gray-400">admin / admin</span></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
