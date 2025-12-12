import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
            Ashmiaa Customer Manager
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            {isSignup ? "Create Agent Account" : "Agent Login"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
            {isSignup && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Full Name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  className="w-full"
                  data-testid="fullname-input"
                />
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Username</label>
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full"
                data-testid="username-input"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Password</label>
              <Input
                type="password"
                placeholder={isSignup ? "Create a password (min 6 characters)" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full"
                data-testid="password-input"
              />
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6 text-lg"
              data-testid={isSignup ? "signup-btn" : "login-btn"}
            >
              {loading ? (isSignup ? "Creating Account..." : "Logging in...") : (isSignup ? "Sign Up" : "Login")}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              disabled={loading}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {isSignup ? "Already have an account? Login" : "Don't have an account? Sign Up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
