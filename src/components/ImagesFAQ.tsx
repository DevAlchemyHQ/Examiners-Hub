import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Image, FileText, Download, Settings, Upload, Grid, Search, Trash2, ArrowUpDown, RefreshCw, AlertTriangle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const faqItems: FAQItem[] = [
  {
    question: "How do I upload images?",
    answer: "Click the 'Upload' button in the top-left corner of the Images tab. You can select multiple images at once. Supported formats include JPG, PNG, and other common image formats. Images will appear in the grid below.",
    icon: <Upload size={20} className="text-blue-500" />
  },
  {
    question: "How do I select images for defects?",
    answer: "Click on any image in the grid to select it. Selected images will appear in the right panel with editable fields for photo numbers and descriptions. You can select multiple images by clicking on each one.",
    icon: <Image size={20} className="text-green-500" />
  },
  {
    question: "How do I add photo numbers and descriptions?",
    answer: "Once you select an image, you'll see input fields in the right panel. Enter a photo number (e.g., '1', '2', 'A1') and a description. Photo numbers must start with a number and can include letters. Descriptions cannot contain forward slashes (/).",
    icon: <FileText size={20} className="text-purple-500" />
  },
  {
    question: "What are the project details fields (ELR, Structure No, Date)?",
    answer: "These fields help organize your project: ELR (Engineering Line Reference) identifies the location, Structure No identifies the specific structure, and Date records when the inspection was conducted. These details are included in your download package.",
    icon: <Settings size={20} className="text-orange-500" />
  },
  {
    question: "How do I adjust the grid layout?",
    answer: "Use the '+' and '-' buttons next to 'Grid' in the top-right corner to change how many images appear per row. This helps you see more or fewer images at once depending on your screen size.",
    icon: <Grid size={20} className="text-indigo-500" />
  },
  {
    question: "How do I zoom in on an image?",
    answer: "Click the 'Zoom' button on any image to view it in full size. The zoomed image will appear in a modal that you can close by clicking outside or pressing Escape.",
    icon: <Search size={20} className="text-cyan-500" />
  },
  {
    question: "How do I sort my selected images?",
    answer: "Click the sort button (arrow icon) in the right panel to sort images by photo number. The sort button will show a grey background when auto-sort is enabled, meaning images will be automatically sorted as you add them.",
    icon: <ArrowUpDown size={20} className="text-teal-500" />
  },
  {
    question: "How do I delete images?",
    answer: "Click the trash can icon in the right panel to delete all selected images. You can also delete individual images by clicking the 'X' button next to each image in the selected images list.",
    icon: <Trash2 size={20} className="text-red-500" />
  },
  {
    question: "How do I download my defect package?",
    answer: "Once you've added photo numbers and descriptions to your images, click the 'Download Bulk Package' button in the right panel. This will create a ZIP file containing your images with their metadata and a summary report.",
    icon: <Download size={20} className="text-emerald-500" />
  },
  {
    question: "What validation errors should I watch for?",
    answer: "Common validation errors include: missing photo numbers, duplicate photo numbers (highlighted in orange), descriptions with forward slashes (not allowed), and missing image selections. The download button will be disabled until all errors are fixed.",
    icon: <HelpCircle size={20} className="text-amber-500" />
  },
  {
    question: "How do I expand/collapse the panels?",
    answer: "Click the expand/collapse button (double arrow icon) in the top-right corner of the right panel to toggle between split view and full-width view. This gives you more space to work with your selected images.",
    icon: <Settings size={20} className="text-blue-500" />
  },
  {
    question: "How do I save and load defect sets?",
    answer: "Use the 'Save Defect Set' button to save your current work with project details. Use 'Load Defect Set' to restore previously saved work. This is useful for working on projects over multiple sessions.",
    icon: <FileText size={20} className="text-green-500" />
  },
  {
    question: "What's the difference between Images and Bulk modes?",
    answer: "Images mode shows individual selected images with their metadata. Bulk mode allows you to create defect entries that can be assigned to images later. Use Images mode for direct image annotation, and Bulk mode for creating defect lists.",
    icon: <FileText size={20} className="text-purple-500" />
  },
  {
    question: "How do I undo changes?",
    answer: "Click the undo button (curved arrow icon) in the right panel to undo your last action. This works for both individual image changes and bulk operations.",
    icon: <Settings size={20} className="text-gray-500" />
  },
  {
    question: "Can I work with sketches and defect photos separately?",
    answer: "Yes! The system automatically separates sketches from defect photos. Sketches are typically used for overview or context, while defect photos show specific issues. Both types can be included in your final package.",
    icon: <Image size={20} className="text-indigo-500" />
  },
  {
    question: "I'm not seeing the latest version of the app. How can I force an update?",
    answer: "If you're having trouble seeing updates, try these solutions in order: 1) Force hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac), 2) Clear browser cache completely from browser settings, 3) Try incognito/private mode, 4) Disable browser extensions temporarily, 5) Try a different browser. If the issue persists, contact support with your browser version and operating system.",
    icon: <RefreshCw size={20} className="text-orange-500" />
  }
];

export const ImagesFAQ: React.FC = () => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="text-blue-500" size={24} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Images Tab FAQ
        </h2>
      </div>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Learn how to use the Images tab to upload, organize, and annotate your inspection photos.
      </p>

      <div className="space-y-3">
        {faqItems.map((item, index) => (
          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => toggleItem(index)}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="font-medium text-gray-900 dark:text-white">
                  {item.question}
                </span>
              </div>
              {openItems.has(index) ? (
                <ChevronUp className="text-gray-500" size={20} />
              ) : (
                <ChevronDown className="text-gray-500" size={20} />
              )}
            </button>
            
            {openItems.has(index) && (
              <div className="px-4 pb-4">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Pro Tips
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Use consistent photo numbering (1, 2, 3 or A1, A2, A3)</li>
          <li>• Write clear, descriptive text for each defect</li>
          <li>• Save your work regularly using the Save Defect Set feature</li>
          <li>• Use the expand view for easier editing on smaller screens</li>
          <li>• Check validation errors before downloading your package</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="text-orange-500" size={20} />
          <h3 className="font-semibold text-orange-900 dark:text-orange-100">
            Update Troubleshooting
          </h3>
        </div>
        <div className="text-sm text-orange-800 dark:text-orange-200 space-y-2">
          <p><strong>Having trouble seeing the latest version?</strong></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium mb-1">Quick Fixes:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Hard Refresh:</strong> Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)</li>
                <li>• <strong>Clear Cache:</strong> Browser settings → Clear browsing data</li>
                <li>• <strong>Incognito Mode:</strong> Try in private/incognito window</li>
                <li>• <strong>Disable Extensions:</strong> Temporarily turn off browser extensions</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Advanced Solutions:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Different Browser:</strong> Test in Chrome, Firefox, Safari, or Edge</li>
                <li>• <strong>Developer Tools:</strong> F12 → Right-click refresh → "Empty Cache and Hard Reload"</li>
                <li>• <strong>Service Worker:</strong> F12 → Application → Service Workers → Unregister</li>
                <li>• <strong>Network:</strong> Try different network or disable VPN</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 