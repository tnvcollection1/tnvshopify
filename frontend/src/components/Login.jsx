import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageCircle, Eye, EyeOff } from "lucide-react";

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
      const response = await axios.post(`${API}/users/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
      
      if (response.data.success) {
        const user = response.data.user;
        localStorage.setItem("agent", JSON.stringify(user));
        toast.success(`Welcome back, ${user.full_name}!`);
        onLoginSuccess(user);
      }
    } catch (error) {
      try {
        const fallbackResponse = await axios.post(`${API}/agents/login`, {
          username,
          password
        });
        
        if (fallbackResponse.data.success) {
          const agent = fallbackResponse.data.agent;
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
        toast.success(`Welcome, ${agent.full_name}!`);
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
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-semibold text-gray-900">Wamerce</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {isSignup ? "Create your account" : "Log in"}
            </h1>
            <p className="text-sm text-gray-500">
              {isSignup ? "Your data is securely encrypted" : "Continue to Wamerce"}
            </p>
          </div>

          {isSignup && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs text-green-700">Your password is encrypted with industry-standard bcrypt hashing</span>
            </div>
          )}

          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  className="h-11 border-gray-300 focus:border-gray-400 focus:ring-gray-400"
                  data-testid="fullname-input"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email or username</label>
              <Input
                type="text"
                placeholder="Enter your email or username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="h-11 border-gray-300 focus:border-gray-400 focus:ring-gray-400"
                data-testid="username-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={isSignup ? "Create a password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-11 border-gray-300 focus:border-gray-400 focus:ring-gray-400 pr-11"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium"
              data-testid={isSignup ? "signup-btn" : "login-btn"}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isSignup ? "Creating account..." : "Logging in..."}
                </span>
              ) : (
                isSignup ? "Create account" : "Log in"
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {isSignup ? "Already have an account? " : "New to Wamerce? "}
              <span className="text-[#008060] font-medium hover:underline">
                {isSignup ? "Log in" : "Get started"}
              </span>
            </button>
          </div>
          
          {/* Merchant CTA */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-3">Want to sell on Wamerce?</p>
              <Link 
                to="/create-store"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your Store
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
