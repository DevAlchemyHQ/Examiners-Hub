import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Legal Documents
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('terms')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  activeTab === 'terms'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Terms & Conditions
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-3 py-1 rounded text-sm font-medium transition ${
                  activeTab === 'privacy'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Privacy Policy
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'terms' ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    By accessing and using Exametry, you accept and agree to be bound by these terms. 
                    If you do not agree, please do not use this service.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">2. Service Description</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Exametry provides image analysis, defect labeling, PDF viewing, data management, 
                    and cross-device synchronization services.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">3. User Accounts</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                    <li>You must provide accurate information during registration</li>
                    <li>You are responsible for maintaining account security</li>
                    <li>You must be at least 18 years old to create an account</li>
                    <li>One account per email address is allowed</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">4. Acceptable Use</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    You may use the Service for personal or business image analysis, document viewing, 
                    and data management. You may not:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                    <li>Upload illegal, harmful, or offensive content</li>
                    <li>Attempt to access other users' data</li>
                    <li>Interfere with the Service's operation</li>
                    <li>Share account credentials with others</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">5. Data Privacy & Security</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                    <li>You retain ownership of all data you upload</li>
                    <li>All data is stored securely using AWS cloud infrastructure</li>
                    <li>User data is isolated and cannot be accessed by other users</li>
                    <li>Data is encrypted in transit and at rest</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">6. Service Availability</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                    <li>We strive for 99.9% uptime but do not guarantee uninterrupted service</li>
                    <li>Maximum file upload size: 50MB per file</li>
                    <li>Storage limits: 10GB per user account</li>
                    <li>Rate limits may apply to prevent abuse</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">7. Free Features</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    All users receive access to premium features. No payment is required for 
                    basic or advanced functionality. The service is provided on a "freemium" basis.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">8. Intellectual Property</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                    <li>The Service and its content are owned by Exametry</li>
                    <li>You retain ownership of content you upload</li>
                    <li>You grant us a limited license to store and process your data</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">9. Termination</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    You may terminate your account at any time. We may terminate accounts that 
                    violate these terms. Data will be deleted within 30 days of termination.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">10. Disclaimers</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                    <li>The Service is provided "as is" without warranties</li>
                    <li>We do not guarantee the accuracy of analysis results</li>
                    <li>Our liability is limited to the amount you paid for the Service</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">11. Contact Information</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    For questions about these Terms, contact us at info@exametry.xyz
                  </p>
                </div>

                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>By using Exametry, you acknowledge that you have read, understood, 
                    and agree to be bound by these Terms and Conditions.</strong>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="text-lg font-semibold mb-3">1. Introduction</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Exametry is committed to protecting your privacy. This Privacy Policy explains 
                    how we collect, use, disclose, and safeguard your information when you use our web application.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">2. Information We Collect</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Account Information</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                        <li>Email address, full name, password</li>
                        <li>Profile information and user preferences</li>
                        <li>Images, PDFs, and data you upload</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200">Usage Data</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                        <li>How you interact with the Service</li>
                        <li>Browser type, operating system, IP address</li>
                        <li>Login times and feature usage</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">3. How We Use Your Information</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                    <li>Provide and maintain the Service</li>
                    <li>Process your uploads and requests</li>
                    <li>Authenticate your account</li>
                    <li>Store and sync your data across devices</li>
                    <li>Improve our services and features</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">4. Data Security</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                    <li>All data is stored securely using AWS cloud infrastructure</li>
                    <li>User data is isolated and cannot be accessed by other users</li>
                    <li>Data is encrypted in transit and at rest</li>
                    <li>We implement industry-standard security measures</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">5. Your Rights</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                    <li>Access all data you've uploaded</li>
                    <li>Modify or update your information</li>
                    <li>Delete your content at any time</li>
                    <li>Export your data in standard formats</li>
                    <li>Object to data processing</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">6. Data Sharing</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    We do not sell, rent, or trade your personal information. We do not share your 
                    data with third parties for marketing. Your data is isolated and cannot be accessed by other users.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">7. Contact Information</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    For privacy inquiries, contact us at privacy@exametry.xyz
                  </p>
                </div>

                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>By using Exametry, you acknowledge that you have read and understood 
                    this Privacy Policy and consent to the collection, use, and disclosure of your 
                    information as described herein.</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            I Understand and Accept
          </button>
        </div>
      </div>
    </div>
  );
}; 