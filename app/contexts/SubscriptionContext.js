'use client'
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forceRenderCount, setForceRenderCount] = useState(0);
  const [isActivating, setIsActivating] = useState(false);
  const { isSignedIn, userId, isLoaded } = useAuth();

  const checkSubscription = async () => {
    try {
      setIsLoading(true);
      
      // If user is not signed in, set subscription to false
      if (!isSignedIn || !userId) {
        setHasSubscription(false);
        setError(null);
        return { hasSubscription: false };
      }

      const response = await fetch('/api/check-subscription');
      const data = await response.json();
      
      // Only set hasSubscription to true if we have a definitive positive response
      const shouldHaveSubscription = data.hasSubscription === true && data.subscriptionDetails;
      setHasSubscription(shouldHaveSubscription);
      setError(null);
      // Force a re-render of all components using this context
      setForceRenderCount(prev => prev + 1);
      return { ...data, hasSubscription: shouldHaveSubscription };
    } catch (error) {
      console.error('Error checking subscription:', error);
      setError(error.message);
      setHasSubscription(false);
      return { hasSubscription: false };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSubscription = async (forceRefresh = false) => {
    if (forceRefresh) {
      // Add cache-busting timestamp for forced refresh
      const timestamp = Date.now();
      try {
        setIsLoading(true);
        
        if (!isSignedIn || !userId) {
          setHasSubscription(false);
          setError(null);
          return { hasSubscription: false };
        }

        const response = await fetch(`/api/check-subscription?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const data = await response.json();
        
        // Only set hasSubscription to true if we have a definitive positive response
        const shouldHaveSubscription = data.hasSubscription === true && data.subscriptionDetails;
        setHasSubscription(shouldHaveSubscription);
        setError(null);
        // Force a re-render of all components using this context
        setForceRenderCount(prev => prev + 1);
        return { ...data, hasSubscription: shouldHaveSubscription };
      } catch (error) {
        console.error('Error in forced subscription check:', error);
        setError(error.message);
        setHasSubscription(false);
        return { hasSubscription: false };
      } finally {
        setIsLoading(false);
      }
    } else {
      return await checkSubscription();
    }
  };

  // Check subscription when authentication state changes, but only after auth is loaded
  useEffect(() => {
    if (isLoaded) {
      checkSubscription();
    }
  }, [isSignedIn, userId, isLoaded]);

  // Global subscription success handler - works on any page
  useEffect(() => {
    const handleSubscriptionSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('subscription') === 'success' && isSignedIn && isLoaded) {
        // Clear URL parameter immediately to prevent re-triggering
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Set activating state to show feedback
        setIsActivating(true);
        
        try {
          // Wait longer for Stripe webhook to process (5 seconds)
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          let retryCount = 0;
          const maxRetries = 8; // Reduced retries to prevent excessive polling
          
          const pollSubscriptionStatus = async () => {
            retryCount++;
            
            const response = await refreshSubscription(true); // Force refresh
            
            if (response.hasSubscription) {
              setIsActivating(false);
              return true;
            } else if (retryCount < maxRetries) {
              // Shorter delays: 3s, 5s, 8s, 12s, 15s, 20s, 25s, 30s
              const delays = [3000, 5000, 8000, 12000, 15000, 20000, 25000, 30000];
              const delay = delays[Math.min(retryCount - 1, delays.length - 1)];
              setTimeout(pollSubscriptionStatus, delay);
              return false;
            } else {
              setIsActivating(false);
              return false;
            }
          };
          
          // Start polling
          await pollSubscriptionStatus();
          
        } catch (error) {
          console.error('Error in global subscription activation:', error);
          setIsActivating(false);
        }
      }
    };

    // Only run if we have a window object (client-side)
    if (typeof window !== 'undefined') {
      handleSubscriptionSuccess();
    }
  }, [isSignedIn, isLoaded, refreshSubscription]);

  const value = {
    hasSubscription,
    isLoading,
    error,
    isActivating,
    checkSubscription,
    refreshSubscription,
    forceRenderCount, // This will cause re-renders when subscription status changes
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}; 