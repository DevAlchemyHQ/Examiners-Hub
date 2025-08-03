import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Upload, FileText, Bot, User } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { useAnalytics } from '../hooks/useAnalytics';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  source?: 'pre-defined' | 'ai' | 'fallback' | 'error';
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Hello! I'm your Exametry assistant. I can help with bulk validation, image uploads, downloads, photo numbering, and more. What can I help you with today?",
      isUser: false,
      timestamp: new Date(),
      source: 'pre-defined'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { trackUserAction } = useAnalytics();
  
  const { viewMode, bulkDefects, images, selectedImages } = useMetadataStore();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get current context for AI
  const getCurrentContext = () => ({
    currentTab: viewMode,
    bulkDefectsCount: bulkDefects.length,
    imagesCount: images.length,
    selectedImagesCount: selectedImages.size,
    hasBulkDefects: bulkDefects.length > 0,
    hasImages: images.length > 0
  });

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Track user action
      trackUserAction('chat_message_sent', { message: text });

      const context = getCurrentContext();
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          context: context
        }),
      });

      const data = await response.json();

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
        source: data.source
      };

      setMessages(prev => [...prev, botMessage]);

      // Track response
      trackUserAction('chat_response_received', { 
        source: data.source,
        cost: data.cost || 0
      });

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now. Please try again or check the FAQ section for help.",
        isUser: false,
        timestamp: new Date(),
        source: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 250 * 1024 * 1024; // 250MB per file
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `${file.name} (${formatFileSize(file.size)} - too large). Max size is 250MB.` 
      };
    }
    
    return { valid: true };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const file = files[0];
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    // Validate file size
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error || 'File validation failed');
      return;
    }

    setUploadedFiles(prev => [...prev, file]);
    
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        const uploadMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `✅ Successfully uploaded "${file.name}" with ${data.documents} document sections. You can now ask questions about this document.`,
          isUser: false,
          timestamp: new Date(),
          source: 'pre-defined'
        };
        
        setMessages(prev => [...prev, uploadMessage]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `❌ Failed to upload "${file.name}". Please try again.`,
        isUser: false,
        timestamp: new Date(),
        source: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const quickQuestions = [
    "How do I validate bulk defects?",
    "How do I upload images?",
    "How do I download my package?",
    "What is photo numbering?",
    "How do I use the calculator?"
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Exametry Assistant
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!message.isUser && (
                    <Bot className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm">{message.text}</p>
                    {message.source && message.source !== 'pre-defined' && (
                      <p className="text-xs opacity-60 mt-1">
                        {message.source === 'ai' ? '🤖 AI Response' : 
                         message.source === 'fallback' ? '📝 Fallback' : '❌ Error'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-500" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(question)}
                  className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1 rounded-full transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File Upload */}
        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-500 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload PDF for custom knowledge</span>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask me anything about Exametry..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 