import React from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Sidebar } from '@/components/layout/Sidebar';

const Index = () => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1">
        <ChatInterface />
      </div>
    </div>
  );
};

export default Index;
