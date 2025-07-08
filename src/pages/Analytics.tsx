import React from 'react';
import { ChatAnalytics } from '@/components/analytics/ChatAnalytics';
import { Sidebar } from '@/components/layout/Sidebar';

const Analytics = () => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <ChatAnalytics />
      </div>
    </div>
  );
};

export default Analytics;