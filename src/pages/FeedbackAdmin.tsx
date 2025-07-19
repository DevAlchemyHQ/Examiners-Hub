import React, { useEffect, useState } from 'react';
import { DatabaseService } from '../lib/services';
import { format } from 'date-fns';
import { MessageSquare, Loader2, Lock, Search, Calendar, Clock, Filter, ArrowUp, ArrowDown, Bug, Lightbulb } from 'lucide-react';

interface FeedbackItem {
  id: string;
  type: 'error' | 'suggestion';
  content: string;
  rating: string;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

export const FeedbackAdmin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'error' | 'suggestion'>('all');

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchFeedback = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get feedback from AWS DynamoDB
        const result = await DatabaseService.getFeedback('admin');
        
        if (result.error) {
          throw result.error;
        }
        
        if (result.feedback) {
          setFeedback(result.feedback);
        }
      } catch (err) {
        console.error('Error fetching feedback:', err);
        setError('Failed to load feedback');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();

    // Supabase channel subscription removed as per edit hint

    return () => {
      // No cleanup needed for Supabase channel
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '7777') {
      setIsAuthenticated(true);
      setPassword('');
    }
  };

  const filteredFeedback = feedback
    .filter(item => {
      const matchesSearch = (
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.user_email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.user_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
      const matchesDate = selectedDate 
        ? format(new Date(item.created_at), 'yyyy-MM-dd') === selectedDate
        : true;
      const matchesType = typeFilter === 'all' ? true : item.type === typeFilter;
      return matchesSearch && matchesDate && matchesType;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const toggleSortOrder = () => {
    setSortOrder(current => current === 'desc' ? 'asc' : 'desc');
  };

  const getUniqueAvailableDates = () => {
    const dates = new Set(
      feedback.map(item => format(new Date(item.created_at), 'yyyy-MM-dd'))
    );
    return Array.from(dates).sort();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-indigo-500 rounded-full">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-6">
            Feedback Admin
          </h1>
          
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full p-3 border border-slate-200 dark:border-gray-700 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="w-full bg-indigo-500 text-white py-3 rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-6 border-b border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-indigo-500" />
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                  Feedback Dashboard
                </h1>
              </div>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="px-4 py-2 text-sm bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors"
              >
                Logout
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search feedback..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white appearance-none"
                >
                  <option value="">All dates</option>
                  {getUniqueAvailableDates().map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'error' | 'suggestion')}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white appearance-none"
                >
                  <option value="all">All types</option>
                  <option value="error">Errors</option>
                  <option value="suggestion">Suggestions</option>
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              {/* Sort Order */}
              <button
                onClick={toggleSortOrder}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Clock className="w-4 h-4" />
                <span>Sort by date</span>
                {sortOrder === 'desc' ? (
                  <ArrowDown className="w-4 h-4" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filteredFeedback.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-gray-400">
              {feedback.length === 0 ? 'No feedback submitted yet' : 'No feedback matches your filters'}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-gray-700">
              {filteredFeedback.map((item) => (
                <div key={item.id} className="p-6 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {item.type === 'error' ? (
                        <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                          <Bug className="w-5 h-5 text-red-500" />
                        </div>
                      ) : (
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                          <Lightbulb className="w-5 h-5 text-blue-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {item.type === 'error' ? 'Error Report' : 'Suggestion'}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-gray-400">
                          {item.user_name || item.user_email || 'Anonymous'}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl">{item.rating}</div>
                  </div>
                  
                  <p className="text-slate-800 dark:text-white mb-3">
                    {item.content}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(item.created_at), 'PPP')}</span>
                    <span className="w-1 h-1 bg-slate-300 dark:bg-gray-600 rounded-full" />
                    <Clock className="w-4 h-4" />
                    <span>{format(new Date(item.created_at), 'p')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};