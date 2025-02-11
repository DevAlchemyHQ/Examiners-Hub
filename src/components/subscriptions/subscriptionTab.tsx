import React from 'react';
import { Check, Download, Tag, Layout, Infinity, Sparkles, Users, Building2, Settings2 } from 'lucide-react';

export const SubscriptionTab: React.FC = () => {
  return (
    <div className="h-[calc(100vh-120px)] overflow-auto p-4 bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4">Get on the Up Fast plan today!</h1>
        <p className="text-center text-gray-400 mb-12">
          Your subscription drives our innovation, sustains the website, and brings you even more powerful tools.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Up Slow Plan */}
          <div className="rounded-lg bg-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Up Slow</h2>
            <div className="mb-6">
              <span className="text-4xl font-bold">£0</span>
              <span className="text-gray-400">/month</span>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-2">
                <Download className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <span>Enjoy up to five free downloads.</span>
              </div>
              <div className="flex items-start gap-2">
                <Tag className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <span>Easily view and tag your site and sketch photos.</span>
              </div>
              <div className="flex items-start gap-2">
                <Layout className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <span>Forget juggling a hundred tabs—view both reports side by side.</span>
              </div>
            </div>
            <button className="w-full py-2 px-4 rounded bg-green-500 hover:bg-green-600 transition-colors">
              Current Plan
            </button>
          </div>

          {/* Up Fast Plan */}
          <div className="rounded-lg bg-gray-800 p-6 ring-2 ring-indigo-500 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-sm">
              Recommended
            </div>
            <h2 className="text-xl font-semibold mb-4">Up Fast</h2>
            <div className="mb-6">
              <span className="text-4xl font-bold">£4.99</span>
              <span className="text-gray-400">/month</span>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-2">
                <Infinity className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <span>Unlimited downloads.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <span>+ All Up Slow tools.</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <span>Early access to exclusive features and tools for report writing.</span>
              </div>
            </div>
            <button className="w-full py-2 px-4 rounded bg-indigo-500 hover:bg-indigo-600 transition-colors">
              Upgrade Plan
            </button>
          </div>

          {/* Business Plan */}
          <div className="rounded-lg bg-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Business</h2>
            <div className="mb-6">
              <span className="text-4xl font-bold">£</span>
              <span className="text-gray-400">/month</span>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-2">
                <Settings2 className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <span>Customisable workflows that align with your organisation's specific processes.</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <span>Everything from the Up Fast tier, plus multi-user collaboration with role-based access.</span>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <span>Productive and happy examiners.</span>
              </div>
            </div>
            <button className="w-full py-2 px-4 rounded bg-indigo-500 hover:bg-indigo-600 transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionTab;