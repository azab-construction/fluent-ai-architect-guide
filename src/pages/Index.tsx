import React from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { MainLayout } from '@/components/layout/MainLayout';

const Index = (): JSX.Element => {
  return (
    <MainLayout>
      <ChatInterface />
    </MainLayout>
  );
};

export default Index;
