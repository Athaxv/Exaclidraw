"use client"

import React, { useState } from 'react';
import { Mail, ArrowRight, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

type AuthMode = 'welcome' | 'email' | 'signup';

interface FormData {
  email: string;
  password: string;
  name?: string;
}

const AuthPage: React.FC = () => {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: ''
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (authMode === 'signup' && !formData.name) {
      newErrors.name = 'Name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
   const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const resp = await fetch('/auth/v1/signin', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await resp.json();
      console.log(data);
      
      if (resp.ok){
        toast.success("Welcome back!");
        const { userId: token } = data; // backend returns token in userId
        localStorage.setItem('auth_token', token);
        
        // Create a new room after successful signin
        try {
          const roomResp = await fetch('/room', {
            method: 'POST',
            body: JSON.stringify({ 
              username: formData.email.split('@')[0] // use email prefix as slug
            }),
            headers: {
              'Content-Type': 'application/json',
              'authorization': `${token}`
            }
          });
          console.log("Room Response", roomResp);
          const roomData = await roomResp.json();
          console.log("Room Data", roomData);
          console.log('Room created:', roomData);
          
          if (roomResp.ok) {
            const newRoomId = roomData.message.id;
            router.push(`/canvas/${newRoomId}`);
          } else {
            console.error('Failed to create room:', roomData);
            toast.error('Failed to create room, redirecting to demo');
            // Fallback to random room if room creation fails
            const fallbackRoomId = Math.random().toString(36).substring(2, 15);
            router.push(`/canvas/${fallbackRoomId}`);
          }
        } catch (roomError) {
          console.error('Error creating room:', roomError);
          toast.error('Failed to create room, redirecting to demo');
          // Fallback to random room if room creation fails
          const fallbackRoomId = Math.random().toString(36).substring(2, 15);
          router.push(`/canvas/${fallbackRoomId}`);
        }
      } else {
        // Handle error responses
        const errorMessage = data.message || 'Sign in failed';
        if (resp.status === 401) {
          toast.error('Invalid email or password');
        } else if (resp.status === 500) {
          toast.error('Server error. Please try again later.');
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.log("Error signing in", error);
      toast.error('Network error. Please check your connection.');
    }
    finally {
      setIsLoading(false);
    }
   }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      const resp = await fetch('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await resp.json();
      console.log(data);
      
      if (resp.ok) {
        toast.success("Account created successfully!");
        router.push('/signin');
      } else {
        // Handle error responses
        const errorMessage = data.message || 'Sign up failed';
        if (resp.status === 409) {
          toast.error('User already exists with this email');
        } else if (resp.status === 400) {
          toast.error('Invalid input. Please check your details.');
        } else if (resp.status === 500) {
          toast.error('Server error. Please try again later.');
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.log("Error", error);
      toast.error('Network error. Please check your connection.');
    }
    finally {
      setIsLoading(false);
    }

  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-card text-card-foreground rounded-2xl border border-border p-8 md:p-10">
          {/* Theme Toggle */}
          <div className="flex justify-end mb-2">
            {/* <button
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button> */}
          </div>
          
          {/* Back Button */}
          {authMode !== 'welcome' && (
            <button
              onClick={() => setAuthMode('welcome')}
              className="mb-8 -ml-2 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center text-muted-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 bg-primary text-primary-foreground rounded-xl flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M8 8C8 8 12 4 16 4C20 4 24 8 24 12C24 16 20 20 16 20C16 20 20 24 24 24C24 24 28 20 28 16C28 8 24 4 16 4C8 4 4 8 4 16C4 24 8 28 16 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Welcome Mode */}
          {authMode === 'welcome' && (
            <>
              <h1 className="virgil text-2xl font-semibold text-center mb-3">
                Welcome Back
              </h1>
              <p className="text-muted-foreground text-center text-sm mb-8">
                Enter your credentials to access your account.
              </p>

              <div className="space-y-3">
                {/* Google Button */}
                {/*
                <button
                  onClick={handleGoogleAuth}
                  className="w-full py-3.5 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-3 group"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
                */}

                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-zinc-800"></div>
                  <span className="text-gray-500 text-xs uppercase tracking-wide">OR</span>
                  <div className="flex-1 h-px bg-zinc-800"></div>
                </div>

                {/* Email Button */}
                <button
                  onClick={() => setAuthMode('email')}
                  className="w-full py-3.5 px-4 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-accent hover:text-accent-foreground transition-all duration-200 flex items-center justify-center gap-3"
                >
                  <Mail className="w-5 h-5" />
                  <span>Continue with Email</span>
                </button>

              </div>

              {/* Terms */}
              <p className="text-muted-foreground text-xs text-center mt-8">
                By logging in, you agree to our{' '}
                <a href="#" className="hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="hover:underline">Privacy Policy</a>.
              </p>
            </>
          )}

          {/* Email Sign In Mode */}
          {authMode === 'email' && (
            <>
              <h1 className="virgil text-2xl font-semibold text-center mb-3">
                Sign in with Email
              </h1>
              <p className="text-muted-foreground text-center text-sm mb-8">
                Enter your email and password to continue.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-input border border-input rounded-xl placeholder:text-muted-foreground/70 focus:outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-muted-foreground">
                      Password
                    </label>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Forgot?
                    </a>
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-input border border-input rounded-xl placeholder:text-muted-foreground/70 focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-1.5 text-sm text-red-400">{errors.password}</p>
                  )}
                </div>

                <button
                  onClick={handleSignin}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground text-sm">
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => router.push('/signup')}
                    className="font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </>
          )}

          {/* Sign Up Mode */}
          {authMode === 'signup' && (
            <>
              <h1 className="virgil text-2xl font-semibold text-center mb-3">
                Create Account
              </h1>
              <p className="text-muted-foreground text-center text-sm mb-8">
                Sign up to get started with your account.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-input border border-input rounded-xl placeholder:text-muted-foreground/70 focus:outline-none transition-colors"
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-sm text-red-400">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-input border border-input rounded-xl placeholder:text-muted-foreground/70 focus:outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-input border border-input rounded-xl placeholder:text-muted-foreground/70 focus:outline-none transition-colors"
                    placeholder="At least 8 characters"
                  />
                  {errors.password && (
                    <p className="mt-1.5 text-sm text-red-400">{errors.password}</p>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground text-sm">
                  Already have an account?{' '}
                  <button
                    onClick={() => router.push('/signin')}
                    className="font-medium hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>

              {/* Terms */}
              <p className="text-muted-foreground text-xs text-center mt-6">
                By creating an account, you agree to our{' '}
                <a href="#" className="hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="hover:underline">Privacy Policy</a>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;