'use client'
import { useAuth } from '@clerk/nextjs';
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from 'react';
import Menu from '../components/Menu';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { isLoaded, userId } = useAuth();
  const searchParams = useSearchParams();
  const subscriptionSuccess = searchParams.get('subscription') === 'success';
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Wait for auth to be loaded and handle redirect client-side only
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded && !userId) {
      // Redirect to sign-in page - Clerk's force redirect URLs will handle bringing them back
      window.location.href = 'https://accounts.ai-spy.xyz/sign-in';
    }
  }, [isLoaded, userId]);
  
  useEffect(() => {
    if (subscriptionSuccess) {
      setShowSuccess(true);
      
      // Hide success message after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [subscriptionSuccess]);

  // Show loading while auth is loading
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // Don't render anything if user is not authenticated (redirect will happen)
  if (!userId) {
    return <div>Redirecting to sign in...</div>;
  }
  
  return (
    <div className="container mx-auto py-10">
      {showSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> Your subscription has been activated. You now have full access to all Pro features.</span>
        </div>
      )}
      
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* Your dashboard content goes here */}
    </div>
  );
}