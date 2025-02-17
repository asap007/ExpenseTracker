"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, Wallet, Shield, LineChart } from 'lucide-react';

export default function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const features = [
    { icon: Wallet, title: "Track Expenses", description: "Monitor your spending habits" },
    { icon: Shield, title: "Secure Data", description: "Bank-level encryption" },
    { icon: LineChart, title: "Insights", description: "Visual spending analytics" }
  ];

  return (
    <main className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Wavy Grid Background Animation - More Visible */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Base Grid */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: `
            linear-gradient(to right, rgba(209, 213, 219, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(209, 213, 219, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: 'center center'
        }} />
        
        {/* Wavy Grid Animation - Layer 1 */}
        <motion.div 
          className="absolute inset-0"
          style={{ 
            backgroundImage: `
              linear-gradient(to right, rgba(156, 163, 175, 0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(156, 163, 175, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            backgroundPosition: 'center center'
          }}
          animate={{
            scale: [1, 1.05, 1],
            x: [0, 15, 0],
            y: [0, 10, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut"
          }}
        />
        
        {/* Wavy Grid Animation - Layer 2 */}
        <motion.div 
          className="absolute inset-0"
          style={{ 
            backgroundImage: `
              linear-gradient(to right, rgba(156, 163, 175, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(156, 163, 175, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '35px 35px',
            backgroundPosition: 'center center'
          }}
          animate={{
            scale: [1.05, 1, 1.05],
            x: [0, -10, 0],
            y: [0, -5, 0],
            rotate: [0, 0.5, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut"
          }}
        />
        
        {/* Additional accent grid points at intersections */}
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(99, 102, 241, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: 'center center'
          }}
          animate={{
            scale: [1, 1.03, 1],
            x: [0, 5, 0],
            y: [0, 3, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Content */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={container}
        className="max-w-4xl mx-auto pt-20 px-4 relative z-10"
      >
        {/* Hero Section */}
        <motion.div 
          variants={item}
          className="text-center space-y-6 mb-16"
        >
          <motion.h1 
            className="text-5xl font-bold text-black"
            whileHover={{ scale: 1.02 }}
          >
            Expense Tracker
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-700 max-w-2xl mx-auto"
            variants={item}
          >
            Take control of your finances with our intuitive expense tracking solution
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 mb-16"
          variants={container}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={item}
              whileHover={{ scale: 1.05 }}
              className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200 backdrop-blur-md bg-white/90"
            >
              <feature.icon className="w-12 h-12 text-black mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-black">{feature.title}</h3>
              <p className="text-gray-700">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto"
          variants={container}
        >
          <Link href="/login" className="w-full sm:w-auto">
            <motion.div
              variants={item}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button className="w-full sm:w-auto bg-black hover:bg-gray-900 text-white px-8 py-6 text-lg flex items-center justify-center gap-2">
                Get Started
                <ChevronRight className="w-5 h-5" />
              </Button>
            </motion.div>
          </Link>
          
          <Link href="/register" className="w-full sm:w-auto">
            <motion.div
              variants={item}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                className="w-full sm:w-auto border-2 border-black text-black hover:bg-gray-50 px-8 py-6 text-lg"
              >
                Register
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}