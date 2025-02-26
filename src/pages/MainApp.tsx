import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './home';
import { FeedbackAdmin } from './FeedbackAdmin';
import { UserProfile } from '../components/profile/UserProfile';
import { SubscriptionPage } from './subscription.page';
import { CalculatorPage } from './calculator.page';
import { GamesPage } from './games.page';
import { GridReferenceFinderPage } from './grid.page';
import { PDFViewerPage } from './pdf.page';

const MainApp = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<MainLayout />} />
      <Route path="feedback" element={<FeedbackAdmin />} />
      <Route path="profile" element={<UserProfile />} />
      <Route path="subscriptions" element={<SubscriptionPage />} />
      <Route path="calculator" element={<CalculatorPage />} />
      <Route path="games" element={<GamesPage />} />
      <Route path="grid" element={<GridReferenceFinderPage />} />
      <Route path="pdf" element={<PDFViewerPage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default MainApp; 