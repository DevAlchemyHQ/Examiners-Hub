import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Zap, FileCheck } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Content */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-white">
              Structural Inspection
              <span className="text-indigo-400"> Made Simple</span>
            </h1>
            <p className="text-lg text-slate-300">
              Streamline your structural assessments with our intuitive digital platform. 
              Capture, organize, and document with ease.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Shield size={20} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">Secure & Reliable</h3>
                <p className="text-slate-400 text-sm">Your data is protected with enterprise-grade security</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Zap size={20} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">Fast & Efficient</h3>
                <p className="text-slate-400 text-sm">Optimized workflow for quick documentation</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <FileCheck size={20} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">Organized Reports</h3>
                <p className="text-slate-400 text-sm">Generate professional reports automatically</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 
              text-white rounded-lg font-medium transition-colors group"
          >
            Get Started
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Right side - Image */}
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 to-transparent z-10" />
          <img
            src="/hero-image.jpg" // You'll need to add this image to your public folder
            alt="Structural Inspection"
            className="w-full h-[600px] object-cover rounded-2xl shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}; 