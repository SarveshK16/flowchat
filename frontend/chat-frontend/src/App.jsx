import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, Sun, Moon, MessageCircle, User, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import axios from 'axios'; 

// Ensure your Tailwind CSS is correctly set up, either via a CDN link in your public/index.html
// or by configuring your build tools (like Vite's PostCSS setup) to process your global CSS.

const API_BASE = 'http://localhost:8000/api';

// Brand name: FlowChat
const App = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true); // State to toggle between login/signup form
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [isLoading, setIsLoading] = useState(false); // For messages and auth operations (sending message)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false); // New state for loading messages for a thread
  const [user, setUser] = useState(null); // Stores user details after authentication
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility
  
  // Auth form state, matching the available input fields in the UI
  const [authForm, setAuthForm] = useState({
    username: '',
    password: '',
  });
  
  const messagesEndRef = useRef(null); // Ref for auto-scrolling chat messages
  const models = ['gemini-2.0-flash', 'gpt-4o', 'gpt-o4']; // Available AI models

  // Function to scroll to the bottom of the messages container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect to scroll to bottom whenever messages array changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Effect to check for existing authentication token on app load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setUser({ username: storedUsername });
      }
      fetchThreads(); // Fetch threads for the authenticated user
    }
  }, []); // Runs once on component mount

  // Custom message display function (replaces alert for better UX)
  const showCustomMessage = (message) => {
    // In a real application, replace this with a modal, toast notification, etc.
    alert(message); // Using alert as per previous code
  };

  // Handles both login and signup based on the isSignup flag
  const handleAuth = async (isSignup = false) => {
    setIsLoading(true); // Set loading state for auth operations
    try {
      if (isSignup) {
        // Signup Logic using axios
        const signupResponse = await axios.post(`${API_BASE}/signup/`, {
          username: authForm.username,
          password: authForm.password,
        });

        if (signupResponse.status === 200 || signupResponse.status === 201) {
          showCustomMessage('Signup successful! Please log in.');
          setShowLogin(true); // Switch to login form after successful signup
          setAuthForm({ username: '', password: '' }); // Clear form
        } else {
          // If backend sends specific error details, display them
          showCustomMessage(`Signup failed: ${signupResponse.data?.detail || signupResponse.data?.message || 'Unknown error during signup.'}`);
        }
      } else {
        // Login Logic using axios: Directly request tokens
        const loginResponse = await axios.post(`${API_BASE}/token/`, { 
          username: authForm.username,
          password: authForm.password
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        // Check for successful login (e.g., status 200 OK)
        if (loginResponse.status === 200) {
          const data = loginResponse.data; // Axios automatically parses JSON into .data
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          localStorage.setItem('username', authForm.username); // Store username for display
          setIsAuthenticated(true);
          setUser({ username: authForm.username });
          fetchThreads(); // Fetch chat threads after successful login
          showCustomMessage('Login successful!'); // Indicate success
        } else {
          // This block might not be reached if axios throws an error for non-2xx status
          showCustomMessage('Login failed. Please check your credentials.');
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      if (error.response) {
        // Server responded with a status code outside of 2xx range
        showCustomMessage(`Authentication failed: ${error.response.data?.detail || error.response.data?.message || error.message}`);
      } else if (error.request) {
        // Request was made but no response received (e.g., network error, backend down)
        showCustomMessage('Network error. Please ensure the backend is running and accessible.');
      } else {
        // Something happened in setting up the request that triggered an Error
        showCustomMessage('An unexpected error occurred during authentication. Please try again.');
      }
    } finally {
      setIsLoading(false); // Always stop loading state
    }
  };

  // Fetches existing chat threads from the backend
  const fetchThreads = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return; // Exit if no token

      // Corrected endpoint for fetching threads
      const response = await axios.get(`${API_BASE}/threads/`, { 
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setThreads(response.data);
      } else if (response.status === 401) {
        // Token expired or invalid, attempt refresh
        handleTokenRefresh();
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
      if (error.response && error.response.status === 401) {
        handleTokenRefresh();
      } else {
        showCustomMessage(`Error fetching threads: ${error.response?.data?.detail || error.message}`);
      }
    }
  };

  // Fetches messages for a specific chat thread
  const fetchThreadMessages = async (threadId) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      setIsLoadingMessages(true); // Start loading messages
      setMessages([]); // Clear existing messages immediately for better UX
      setActiveThread(threadId); // Set active thread immediately

      const response = await axios.get(`${API_BASE}/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        // Transform the incoming data to match the expected format { role, content, timestamp }
        // Assuming your ChatMessage model and serializer return 'message' for user and 'response' for AI
        const transformedMessages = response.data.flatMap(chatMessage => {
            const msgs = [];
            // Assuming chatMessage.message is the user's message
            if (chatMessage.message) {
                msgs.push({
                    role: 'user',
                    content: chatMessage.message,
                    timestamp: chatMessage.timestamp // Assuming timestamp is on ChatMessage
                });
            }
            // Assuming chatMessage.response is the AI's response
            if (chatMessage.response) {
                msgs.push({
                    role: 'assistant',
                    content: chatMessage.response,
                    // Use the same timestamp or a separate one if backend provides
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
        showCustomMessage(`Error fetching messages: ${error.response?.data?.detail || error.message}`);
      }
    } finally {
      setIsLoadingMessages(false); // End loading messages
    }
  };

  // Creates a new chat thread
  const createNewThread = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      // This will send a POST request with an empty body to /api/threads/
      // The backend (thread_list_create_view) should then create a new ChatThread
      const response = await axios.post(`${API_BASE}/threads/`, {}, { // Capture the response to get new thread ID if needed
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      // After successfully creating a thread, fetch the updated list of threads
      // This will refresh the sidebar and potentially select the new thread if the backend returns its ID
      fetchThreads(); 
      
      // If the backend returns the new thread's ID, you can activate it immediately:
      if (response.status === 201 && response.data && response.data.id) {
          setActiveThread(response.data.id);
          setMessages([]); // Clear messages for the new thread
      } else {
          // If backend didn't return ID or status wasn't 201, just clear messages
          setActiveThread(null); // Clear active thread to reset chat area for new thread
          setMessages([]); 
      }

    } catch (error) {
      console.error('Error creating thread:', error);
      if (error.response && error.response.status === 401) {
        handleTokenRefresh();
      } else {
        showCustomMessage(`Failed to create new chat: ${error.response?.data?.detail || error.message}`);
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

      if (response.status === 204) { // 204 No Content is typical for successful DELETE
        setThreads(threads.filter(t => t.id !== threadId)); // Remove deleted thread from state
        if (activeThread === threadId) {
          setActiveThread(null); // Clear active thread if deleted
          setMessages([]); // Clear messages if active thread deleted
        }
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      if (error.response && error.response.status === 401) {
        handleTokenRefresh();
      } else {
        showCustomMessage(`Error deleting thread: ${error.response?.data?.detail || error.message}`);
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
      console.error('Error fetching thread title:', error);
      // Handle error, maybe show a message
    }
  };

  // Sends a message to the active chat thread
  const sendMessage = async () => {
    if (!currentMessage.trim() || !activeThread) return; // Prevent sending empty messages or if no active thread

    const userMessage = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]); // Add user's message to display immediately
    setCurrentMessage(''); // Clear input field
    setIsLoading(true); // Show loading indicator for sending message

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
        setMessages(prev => [...prev, aiMessage]); // Add AI's message to display

        // Check if the current thread's title is empty, and if so, fetch it.
        // This ensures the sidebar refreshes with the new title after the first message
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
        showCustomMessage(`Error sending message: ${error.response?.data?.detail || error.message}`);
      }
    } finally {
      setIsLoading(false); // Hide loading indicator for sending message
    }
  };

  // Handles refreshing access token using refresh token
  const handleTokenRefresh = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        logout(); // No refresh token, force logout
        return;
      }
      
      // Call your token refresh endpoint
      const refreshResponse = await axios.post(`${API_BASE}/token/refresh/`, {
        refresh: refreshToken
      });

      if (refreshResponse.status === 200) {
        const data = refreshResponse.data;
        localStorage.setItem('access_token', data.access);
        // If your backend issues new refresh tokens, update it too:
        // localStorage.setItem('refresh_token', data.refresh); 
        // Re-fetch threads or retry original failed request
        fetchThreads(); 
      } else {
        logout(); // Refresh failed, force logout
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      logout(); // Network or API error during refresh, force logout
    }
  };

  // Logs the user out
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username'); // Clear stored username
    setIsAuthenticated(false);
    setUser(null);
    setThreads([]);
    setMessages([]);
    setActiveThread(null);
    showCustomMessage('You have been logged out.'); // This alert is now only called when explicitly logging out or refresh fails.
  };

  // Basic markdown-like formatting for message content
  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')             // Italic text
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">$1</code>') // Inline code
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded mt-2 mb-2 overflow-x-auto"><code>$1</code></pre>'); // Code blocks
  };

  // Conditional rendering for authentication state
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-inter ${
        darkMode 
          ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900' 
          : 'bg-gradient-to-br from-purple-50 to-pink-50' /* Pearl white to soft pink/purple for light mode */
      }`}>
        <div className="max-w-md w-full space-y-8 p-8 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl">
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
        : 'bg-gradient-to-br from-purple-50 to-pink-50' /* Pearl white to soft pink/purple for light mode */
    }`}>
      {/* Sidebar */}
      <div className={`w-80 ${
        darkMode 
          ? 'bg-white/10 backdrop-blur-xl border border-white/20' /* Dark mode with thin border */
          : 'bg-white/80 backdrop-blur-xl border border-gray-300' /* Light mode with thin gray border */
      } flex flex-col m-4 rounded-3xl shadow-2xl`}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl ${
                darkMode 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                  : 'bg-gradient-to-br from-pink-500 to-purple-500' /* Light mode icon background gradient */
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
            onClick={createNewThread}
            className={`w-full flex items-center justify-center space-x-3 py-3 px-4 bg-gradient-to-r ${
              darkMode 
                ? 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
                : 'from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500' /* Light mode gradient button */
            } text-white font-medium rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]`}
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
          </button>
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
                        : 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 backdrop-blur-sm border border-pink-500/20' /* Light mode active thread gradient */
                      )
                    : (darkMode 
                        ? 'hover:bg-white/5 backdrop-blur-sm' 
                        : 'hover:bg-white/50 backdrop-blur-sm'
                      )
                }`}
                onClick={() => fetchThreadMessages(thread.id)}
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
                    e.stopPropagation(); // Prevent thread selection when deleting
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
                  : 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 backdrop-blur-sm border border-white/20' /* Light mode user icon background gradient */
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col m-4 ml-0">
        {activeThread ? (
          <div className={`flex-1 flex flex-col ${
            darkMode 
              ? 'bg-white/5 backdrop-blur-xl border border-white/10' /* Dark mode with thin border */
              : 'bg-white/60 backdrop-blur-xl border border-gray-300' /* Light mode with thin gray border */
          } rounded-3xl shadow-2xl overflow-hidden`}>
            {/* Chat Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
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
                              : 'bg-gradient-to-r from-pink-400/80 to-purple-400/80 border border-pink-400/30 text-white' /* Light mode user message gradient */
                            )
                          : (darkMode 
                              ? 'bg-white/10 border border-white/20 text-white/90' 
                              : 'bg-white/70 border border-white/40 text-gray-800' /* Light mode assistant message glass */
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
            <div className="p-6 border-t border-white/10">
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
                      : 'from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500' /* Light mode gradient button */
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
              ? 'bg-white/5 backdrop-blur-xl border border-white/10' /* Dark mode with thin border */
              : 'bg-white/60 backdrop-blur-xl border border-gray-300' /* Light mode with thin gray border */
          } rounded-3xl shadow-2xl`}>
            <div className="text-center">
              <div className={`p-6 rounded-3xl ${
                darkMode 
                  ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10' 
                  : 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 backdrop-blur-sm border border-white/20' /* Light mode welcome icon background */
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
                    : 'from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500' /* Light mode gradient button */
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
