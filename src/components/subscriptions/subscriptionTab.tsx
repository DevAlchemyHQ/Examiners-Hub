import React from 'react';
import { Check, Download, Tag, Layout, Infinity, Sparkles, Users, Building2, Settings2 } from 'lucide-react';

interface SubscriptionTabProps {
  onClose?: () => void;
}

export const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ onClose }) => {
  const handleUpgrade = () => {
    window.location.href = 'https://buy.stripe.com/test_bIY5mug4N6sQbOUcMM';
  };

  return (
    <div className="min-h-[calc(100vh-120px)] overflow-auto p-4 bg-gray-900 text-white relative">
      {/* Close Button */}
      <button onClick={onClose} className="absolute top-4 right-4 text-white bg-red-500 px-4 py-2 rounded">
        Close
      </button>

      <div className="max-w-[1440px] mx-auto py-12">
        <h1 className="text-4xl font-bold text-center mb-6">Get on the Up Fast plan today!</h1>
        <p className="text-center text-gray-400 mb-16 text-lg max-w-3xl mx-auto">
          Your subscription drives our innovation, sustains the website, and brings you even more powerful tools.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1280px] mx-auto px-4">
          {/* Up Slow Plan */}
          <div className="rounded-xl bg-gray-800 p-8 hover:shadow-xl transition-shadow min-w-[360px]">
            <h2 className="text-2xl font-semibold mb-4">Up Slow</h2>
            <div className="mb-8">
              <span className="text-5xl font-bold">£ 0</span>
              <span className="text-gray-400 text-xl">/month</span>
            </div>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-3">
                <Download className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-lg">Enjoy up to five free downloads.</span>
              </div>
              <div className="flex items-start gap-3">
                <Tag className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-lg">Easily view and tag your site and sketch photos.</span>
              </div>
              <div className="flex items-start gap-3">
                <Layout className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-lg">Forget juggling a hundred tabs—view both reports side by side.</span>
              </div>
            </div>
            <button className="w-full py-3 px-4 rounded-lg bg-green-500 hover:bg-green-600 transition-colors text-lg font-medium">
              Current Plan
            </button>
          </div>

          {/* Up Fast Plan */}
          <div className="rounded-xl bg-gray-800 p-8 ring-2 ring-indigo-500 relative hover:shadow-xl transition-shadow min-w-[360px]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-6 py-2 rounded-full text-sm font-medium">
              Recommended
            </div>
            <h2 className="text-2xl font-semibold mb-4">Up Fast</h2>
            <div className="mb-8">
              <span className="text-5xl font-bold">£ 4.99</span>
              <span className="text-gray-400 text-xl">/month</span>
            </div>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-3">
                <Infinity className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-lg">Unlimited downloads.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-lg">+ All Up Slow tools.</span>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-lg">Early access to exclusive features and tools for report writing.</span>
              </div>
            </div>
            <button 
              onClick={handleUpgrade}
              className="w-full py-3 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-600 transition-colors text-lg font-medium cursor-pointer"
            >
              Upgrade Plan
            </button>
          </div>

          {/* Business Plan */}
          <div className="rounded-xl bg-gray-800 p-8 hover:shadow-xl transition-shadow min-w-[360px]">
            <h2 className="text-2xl font-semibold mb-4">Business</h2>
            <div className="mb-8">
              <span className="text-5xl font-bold">£ 9.99</span>
              <span className="text-gray-400 text-xl">/month</span>
            </div>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-3">
                <Settings2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-lg">Customisable workflows that align with your organisation's specific processes.</span>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-lg">Everything from the Up Fast tier, plus multi-user collaboration with role-based access.</span>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-lg">Productive and happy examiners.</span>
              </div>
            </div>
            <button 
              onClick={handleUpgrade}
              className="w-full py-3 px-4 rounded-lg bg-indigo-500 hover:bg-indigo-600 transition-colors text-lg font-medium cursor-pointer"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionTab;
