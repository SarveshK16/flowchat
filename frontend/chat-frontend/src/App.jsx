import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, Sun, Moon, MessageCircle, User, Lock, Eye, EyeOff, Menu, X } from 'lucide-react';
import axios from 'axios'; 
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

const API_BASE = import.meta.env.VITE_API_BASE;

const App = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [isLoading, setIsLoading] = useState(false); 
  const [isLoadingMessages, setIsLoadingMessages] = useState(false); 
  const [user, setUser] = useState(null); 
  const [showPassword, setShowPassword] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false)

  const [authForm, setAuthForm] = useState({
    username: '',
    password: '',
  });
  
  const messagesEndRef = useRef(null); 
  const models = ['gemini-2.0-flash', 'gpt-4.1-mini', 'gpt-3.5-turbo']; 
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setUser({ username: storedUsername });
      }
      fetchThreads();
    }
  }, []); 

   const showCustomMessage = (message, type = 'info') => {
    let backgroundColor;
    let toastColorClass;

    switch (type) {
      case 'success':
        backgroundColor = 'linear-gradient(to right, #4CAF50, #8BC34A)';
        toastColorClass = 'text-white';
        break;
      case 'error':
        backgroundColor = 'linear-gradient(to right, #F44336, #E57373)';
        toastColorClass = 'text-white';
        break;
      case 'warning':
        backgroundColor = 'linear-gradient(to right, #FFC107, #FFEB3B)'; 
        toastColorClass = 'text-gray-800';
        break;
      case 'info':
      default:
        backgroundColor = 'linear-gradient(to right, #2196F3, #64B5F6)';
        toastColorClass = 'text-white';
        break;
    }

    Toastify({
      text: message,
      duration: 3000, 
      newWindow: true, 
      close: true, 
      gravity: "top", 
      position: "right", 
      stopOnFocus: true,
      style: {
        background: backgroundColor,
        color: toastColorClass === 'text-gray-800' ? '#333' : '#fff', 
      },
      className: `font-inter ${toastColorClass}`,
      onClick: function(){} 
    }).showToast();
  };

  // Handles both login and signup based on the isSignup flag
  const handleAuth = async (isSignup = false) => {
    setIsLoading(true); 
    try {
      if (isSignup) {
        const signupResponse = await axios.post(`${API_BASE}/signup/`, {
          username: authForm.username,
          password: authForm.password,
        });

        if (signupResponse.status === 200 || signupResponse.status === 201) {
          showCustomMessage('Signup successful! Please log in.', 'success');
          setShowLogin(true); 
          setAuthForm({ username: '', password: '' }); // Clear form
        } else {
          showCustomMessage(`Signup failed: ${signupResponse.data?.detail || signupResponse.data?.message || 'Unknown error during signup.'}`, 'error');
        }
      } else {
        const loginResponse = await axios.post(`${API_BASE}/token/`, { 
          username: authForm.username,
          password: authForm.password
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (loginResponse.status === 200) {
          const data = loginResponse.data; 
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          localStorage.setItem('username', authForm.username); 
          setIsAuthenticated(true);
          setUser({ username: authForm.username });
          fetchThreads(); 
          showCustomMessage('Login successful!', 'success'); 
        } else {
          showCustomMessage('Login failed. Please check your credentials.', 'error');
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      if (error.response) {
        showCustomMessage(`Authentication failed: ${error.response.data?.detail || error.response.data?.message || error.message}`, 'error');
      } else if (error.request) {
        showCustomMessage('Network error. Please ensure the backend is running and accessible.', 'error');
      } else {
        showCustomMessage('An unexpected error occurred during authentication. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetches existing chat threads from the backend
  const fetchThreads = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.get(`${API_BASE}/threads/`, { 
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setThreads(response.data);
      } else if (response.status === 401) {
        handleTokenRefresh();
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
      if (error.response && error.response.status === 401) {
        handleTokenRefresh();
      } else {
        showCustomMessage(`Error fetching threads: ${error.response?.data?.detail || error.message}`, 'error');
      }
    }
  };

  // Fetches messages for a specific chat thread
  const fetchThreadMessages = async (threadId) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      setIsLoadingMessages(true); 
      setMessages([]); 
      setActiveThread(threadId); 

      const response = await axios.get(`${API_BASE}/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        const transformedMessages = response.data.flatMap(chatMessage => {
            const msgs = [];
            if (chatMessage.message) {
                msgs.push({
                    role: 'user',
                    content: chatMessage.message,
                    timestamp: chatMessage.timestamp 
                });
            }
            if (chatMessage.response) {
                msgs.push({
                    role: 'assistant',
                    content: chatMessage.response,
                    timestamp: chatMessage.timestamp 
                });
            }
            return msgs;
        });
        setMessages(transformedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (error.response && error.response.status === 401) {
        handleTokenRefresh();
      } else {
        showCustomMessage(`Error fetching messages: ${error.response?.data?.detail || error.message}`, 'error');
      }
    } finally {
      setIsLoadingMessages(false); 
    }
  };

  // Creates a new chat thread
  const createNewThread = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.post(`${API_BASE}/threads/`, {}, { 
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      fetchThreads(); 
      
      if (response.status === 201 && response.data && response.data.id) {
          setActiveThread(response.data.id);
          setMessages([]); 
      } else {
          setActiveThread(null); 
          setMessages([]); 
      }

    } catch (error) {
      console.error('Error creating thread:', error);
      if (error.response && error.response.status === 401) {
        handleTokenRefresh();
      } else {
        showCustomMessage(`Failed to create new chat: ${error.response?.data?.detail || error.message}`, "error");
      }
    }
  };

  // Deletes a specific chat thread
  const deleteThread = async (threadId) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.delete(`${API_BASE}/threads/${threadId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 204) { 
        setThreads(threads.filter(t => t.id !== threadId)); 
        if (activeThread === threadId) {
          setActiveThread(null); 
          setMessages([]); 
        }
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      if (error.response && error.response.status === 401) {
        handleTokenRefresh();
      } else {
        showCustomMessage(`Error deleting thread: ${error.response?.data?.detail || error.message}`, "error");
      }
    }
  };

  // Function to fetch a single thread's title
  const fetchThreadTitle = async (threadId) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.get(`${API_BASE}/threads/${threadId}/title/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200 && response.data.title) {
        setThreads(prevThreads => 
          prevThreads.map(thread =>
            thread.id === threadId ? { ...thread, title: response.data.title } : thread
          )
        );
      }
    } catch (error) {
      showCustomMessage(`Error fetching thread title: ${error.response?.data?.detail || error.message}`, "error")
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !activeThread) return;

    const userMessage = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]); 
    setCurrentMessage(''); 
    setIsLoading(true); 

    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await axios.post(`${API_BASE}/chat/`, {
        model: selectedModel,
        message: currentMessage,
        thread_id: activeThread
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 200) {
        const aiResponseContent = response.data.response; 
        
        const aiMessage = {
          role: 'assistant',
          content: aiResponseContent,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]); 

        const currentThreadInState = threads.find(t => t.id === activeThread);
        if (currentThreadInState && currentThreadInState.title === '') {
          fetchThreadTitle(activeThread);
        }

      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.response && error.response.status === 401) {
        handleTokenRefresh();
      } else {
        showCustomMessage(`Error sending message: ${error.response?.data?.detail || error.message}`, "error");
      }
    } finally {
      setIsLoading(false); 
    }
  };

  // Handles refreshing access token using refresh token
  const handleTokenRefresh = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        logout(); 
        return;
      }
      
      const refreshResponse = await axios.post(`${API_BASE}/token/`, {
        refresh: refreshToken
      });

      if (refreshResponse.status === 200) {
        const data = refreshResponse.data;
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh); 
        fetchThreads(); 
      } else {
        logout(); 
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      logout(); 
    }
  };

  // Logs the user out
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username'); 
    setIsAuthenticated(false);
    setUser(null);
    setThreads([]);
    setMessages([]);
    setActiveThread(null);
    showCustomMessage('You have been logged out.', "info");
  };

  // Basic markdown-like formatting for message content
  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
      .replace(/\*(.*?)\*/g, '<em>$1</em>')             
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">$1</code>') 
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded mt-2 mb-2 overflow-x-auto"><code>$1</code></pre>'); 
  };

  // Conditional rendering for authentication state
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-inter ${
        darkMode 
          ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900' 
          : 'bg-gradient-to-br from-purple-50 to-pink-50'
      }`}>
        <div className="max-w-md md:w-full space-y-8 p-8 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <MessageCircle className={`h-12 w-12 ${darkMode ? 'text-pink-400' : 'text-purple-600'}`} />
            </div>
            <h2 className={`text-3xl font-light ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              FlowChat
            </h2>
            <p className={`mt-2 font-light ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {showLogin ? 'Sign in to your account' : 'Create a new account'}
            </p>
          </div>
          
          <div className="space-y-4">
            
            <div>
              <label htmlFor="username-input" className={`block text-sm font-light ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="username-input"
                  type="text"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white focus:ring-purple-500' : 'bg-white/60 border-white/40 text-gray-800 focus:ring-pink-300'
                  } transition duration-150 ease-in-out`}
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password-input" className={`block text-sm font-light ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white focus:ring-purple-500' : 'bg-white/60 border-white/40 text-gray-800 focus:ring-pink-300'
                  } transition duration-150 ease-in-out`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <button
              onClick={() => handleAuth(!showLogin)}
              disabled={isLoading || !authForm.username || !authForm.password} 
              className={`w-full flex justify-center py-3 px-4 bg-gradient-to-r ${
                darkMode 
                  ? 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
                  : 'from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500' /* Light mode gradient button */
              } text-white font-medium rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : (
                showLogin ? 'Sign In' : 'Sign Up'
              )}
            </button>
            
            <div className="text-center">
              <button
                onClick={() => setShowLogin(!showLogin)}
                className={`text-sm font-light ${darkMode ? 'text-pink-400 hover:text-pink-300' : 'text-purple-600 hover:text-purple-500'} focus:outline-none`}
              >
                {showLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
          
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl ${
                darkMode 
                  ? 'bg-white/10 text-yellow-400 hover:bg-white/20' 
                  : 'bg-white/50 text-gray-600 hover:bg-white/70'
              } backdrop-blur-sm transition-all duration-200 transform hover:scale-105`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
  <div className={`h-screen flex font-inter ${
    darkMode 
      ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900' 
      : 'bg-gradient-to-br from-purple-50 to-pink-50'
  }`}>
    
    {/* Mobile Overlay Background - Only visible when sidebar is open */}
    {showSidebar && (
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
        onClick={() => setShowSidebar(false)}
      />
    )}

    {/* Mobile Sidebar Toggle Button - Only visible when sidebar is closed */}
    {!showSidebar && (
      <button
        onClick={() => setShowSidebar(true)}
        className={`md:hidden fixed p-2 rounded-xl ${
          darkMode
            ? 'bg-white/10 text-white hover:bg-white/20'
            : 'bg-white/70 text-gray-800 hover:bg-white/80'
        } backdrop-blur-sm transition-all duration-200 transform hover:scale-105 shadow-lg border ${
          darkMode ? 'border-white/20' : 'border-white/40'
        }`}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>
    )}

    {/* Sidebar */}
    <div className={`fixed inset-y-0 left-0 w-80 z-40 flex flex-col transform transition-transform duration-300 ease-in-out ${
      showSidebar ? 'translate-x-0' : '-translate-x-full'
    } md:relative md:translate-x-0 md:flex md:w-80 md:flex-shrink-0 ${
      darkMode
        ? 'bg-white/10 backdrop-blur-xl border border-white/20'
        : 'bg-white/80 backdrop-blur-xl border border-gray-300'
    } md:m-4 md:rounded-3xl md:shadow-2xl`}>
      <div className="p-4 flex flex-col">
        {/* Header */}
        <div className="border-b border-white/10 pb-6 mb-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl ${
                darkMode
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                  : 'bg-gradient-to-br from-pink-500 to-purple-500'
              }`}>
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <h1 className={`text-xl font-light ${darkMode ? 'text-white' : 'text-gray-800'}`}>FlowChat</h1>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl ${
                darkMode
                  ? 'bg-white/10 text-yellow-400 hover:bg-white/20'
                  : 'bg-white/50 text-gray-600 hover:bg-white/70'
              } backdrop-blur-sm transition-all duration-200 transform hover:scale-105`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <button
            onClick={() => {
              createNewThread();
              setShowSidebar(false); 
            }}
            className={`w-full flex items-center justify-center space-x-3 py-3 px-4 bg-gradient-to-r ${
              darkMode
                ? 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                : 'from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500'
            } text-white font-medium rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]`}
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </button>
        </div>
      </div>
      
      {/* Threads */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {threads.length === 0 ? (
          <p className={`text-center text-sm font-light ${darkMode ? 'text-white/50' : 'text-gray-500'} mt-8`}>
            No conversations yet
          </p>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer group transition-all duration-200 ${
                activeThread === thread.id 
                  ? (darkMode 
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30' 
                      : 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 backdrop-blur-sm border border-pink-500/20'
                    )
                  : (darkMode 
                      ? 'hover:bg-white/5 backdrop-blur-sm' 
                      : 'hover:bg-white/50 backdrop-blur-sm'
                    )
              }`}
              onClick={() => {
                fetchThreadMessages(thread.id);
                setShowSidebar(false); 
              }}
            >
              <span className={`text-sm font-light truncate ${
                activeThread === thread.id 
                  ? (darkMode ? 'text-white' : 'text-gray-800')
                  : (darkMode ? 'text-white/80' : 'text-gray-700')
              }`}>
                {thread.title || `Thread ${thread.id}`}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteThread(thread.id);
                }}
                className={`opacity-0 group-hover:opacity-100 p-2 rounded-xl ${
                  darkMode 
                    ? 'hover:bg-white/10 text-white/60 hover:text-white/80' 
                    : 'hover:bg-white/50 text-gray-500 hover:text-gray-700'
                } transition-all duration-200`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* User info and logout */}
      <div className="p-6 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl ${
              darkMode 
                ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10' 
                : 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 backdrop-blur-sm border border-white/20'
            } flex items-center justify-center`}>
              <User className={`h-5 w-5 ${darkMode ? 'text-white/70' : 'text-gray-600'}`} />
            </div>
            <span className={`font-light ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>
              {user?.username || 'Guest'}
            </span>
          </div>
          <button
            onClick={logout}
            className={`text-sm font-light ${darkMode ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'} transition-colors duration-200`}
          >
            Logout
          </button>
        </div>
      </div>
    </div>

    {/* Main Chat Area - Full screen on mobile, with sidebar space on desktop */}
    <div className="flex-1 flex flex-col md:m-4 md:ml-0">
      {activeThread ? (
        <div className={`flex-1 flex flex-col ${
          darkMode 
            ? 'md:bg-white/5 md:backdrop-blur-xl md:border md:border-white/10 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900'
            : 'md:bg-white/60 md:backdrop-blur-xl md:border md:border-gray-300 bg-gradient-to-br from-purple-50 to-pink-50'
        } md:rounded-3xl md:shadow-2xl overflow-hidden`}>
          
          {/* FlowChat Header - Always visible on mobile, with hamburger menu */}

          <div className={`md:hidden flex items-center justify-between px-4 py-3 ${
            darkMode 
              ? 'bg-white/5 backdrop-blur-xl border-b border-white/10' 
              : 'bg-white/70 backdrop-blur-xl border-b border-gray-200'
          }`}>
            {/* Left: Hamburger */}
            <button
              onClick={() => setShowSidebar(true)}
              className={`p-2 rounded-xl ${
                darkMode
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-white/50 text-gray-800 hover:bg-white/70'
              } backdrop-blur-sm transition-all duration-200`}
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Center: Logo + Name */}
            <div className="flex items-center space-x-2">
              <MessageCircle className={`h-7 w-7 ${darkMode ? 'text-pink-400' : 'text-purple-600'}`} />
              <span className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                FlowChat
              </span>
            </div>
            
            {/* Right: Model Selector */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={`px-2 py-1 rounded-lg text-sm min-w-[10rem] sm:min-w-[8rem] whitespace-nowrap truncate ${
                darkMode 
                  ? 'bg-white/10 text-white border-white/20' 
                  : 'bg-white/60 text-gray-800 border-white/40'
              } border backdrop-blur-sm`}
            >
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>


          {/* Chat Header - Desktop only */}
          <div className="hidden md:flex p-6 border-b border-white/10 items-center justify-between">
            <h2 className={`text-lg font-light ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {threads.find(t => t.id === activeThread)?.title || `Thread ${activeThread}`}
            </h2>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={`px-4 py-2 rounded-xl text-sm font-light ${
                darkMode 
                  ? 'bg-white/10 text-white border-white/20 backdrop-blur-sm' 
                  : 'bg-white/60 text-gray-800 border-white/40 backdrop-blur-sm'
              } border focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200`}
            >
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <div className="flex space-x-2">
                  <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-purple-400' : 'bg-pink-400'} animate-bounce`}></div>
                  <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-pink-400' : 'bg-purple-400'} animate-bounce`} style={{animationDelay: '0.1s'}}></div>
                  <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-purple-400' : 'bg-pink-400'} animate-bounce`} style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-white/30' : 'text-gray-400'}`} />
                  <p className={`font-light ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
                    Start your conversation
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl px-6 py-4 rounded-3xl shadow-lg backdrop-blur-sm ${
                      message.role === 'user'
                        ? (darkMode 
                            ? 'bg-gradient-to-r from-purple-500/80 to-pink-500/80 border border-purple-500/30 text-white' 
                            : 'bg-gradient-to-r from-pink-400/80 to-purple-400/80 border border-pink-400/30 text-white'
                          )
                        : (darkMode 
                            ? 'bg-white/10 border border-white/20 text-white/90' 
                            : 'bg-white/70 border border-white/40 text-gray-800'
                          )
                    }`}
                  >
                    <div 
                      className="font-light"
                      dangerouslySetInnerHTML={{ 
                        __html: formatMessage(message.content) 
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`px-6 py-4 rounded-3xl ${
                  darkMode 
                    ? 'bg-white/10 backdrop-blur-sm border border-white/20' 
                    : 'bg-white/70 backdrop-blur-sm border border-white/40'
                }`}>
                  <div className="flex space-x-2">
                    <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-purple-400' : 'bg-pink-400'} animate-bounce`}></div>
                    <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-pink-400' : 'bg-purple-400'} animate-bounce`} style={{animationDelay: '0.1s'}}></div>
                    <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-purple-400' : 'bg-pink-400'} animate-bounce`} style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-6 md:border-t border-white/10">
            <div className="flex space-x-4">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className={`flex-1 px-6 py-4 ${
                  darkMode 
                    ? 'bg-white/10 border-white/20 text-white placeholder-white/50' 
                    : 'bg-white/60 border-white/40 text-gray-800 placeholder-gray-500'
                } border backdrop-blur-sm rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-light transition-all duration-200`}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !currentMessage.trim()}
                className={`px-6 py-4 bg-gradient-to-r ${
                  darkMode 
                    ? 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
                    : 'from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500'
                } text-white rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95`}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex-1 flex items-center justify-center ${
          darkMode 
            ? 'md:bg-white/5 md:backdrop-blur-xl md:border md:border-white/10 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900'
            : 'md:bg-white/60 md:backdrop-blur-xl md:border md:border-gray-300 bg-gradient-to-br from-purple-50 to-pink-50'
        } md:rounded-3xl md:shadow-2xl`}>
          <div className="text-center">
            <div className={`p-6 rounded-3xl ${
              darkMode 
                ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10' 
                : 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 backdrop-blur-sm border border-white/20'
            } mb-6 mx-auto w-fit`}>
              <MessageCircle className={`h-12 w-12 ${darkMode ? 'text-white/70' : 'text-gray-600'}`} />
            </div>
            <h3 className={`text-2xl font-light mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Welcome to FlowChat</h3>
            <p className={`font-light mb-6 ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>
              Create a new chat to get started
            </p>
            <button
              onClick={createNewThread}
              className={`px-6 py-3 bg-gradient-to-r ${
                darkMode 
                  ? 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
                  : 'from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500'
              } text-white font-medium rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95`}
            >
              Start Chatting
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default App;
