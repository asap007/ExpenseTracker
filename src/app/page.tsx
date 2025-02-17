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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <motion.div 
        initial="hidden"
        animate="show"
        variants={container}
        className="max-w-4xl mx-auto pt-20 px-4"
      >
        {/* Hero Section */}
        <motion.div 
          variants={item}
          className="text-center space-y-6 mb-16"
        >
          <motion.h1 
            className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600"
            whileHover={{ scale: 1.02 }}
          >
            Expense Tracker
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-600 max-w-2xl mx-auto"
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
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
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
              <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg flex items-center justify-center gap-2">
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
                className="w-full sm:w-auto border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg"
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