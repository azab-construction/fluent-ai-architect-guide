import React from 'react';
import { IntegrationSetup } from '@/components/integrations/IntegrationSetup';
import { Sidebar } from '@/components/layout/Sidebar';

const Integrations = () => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <IntegrationSetup />
      </div>
    </div>
  );
};

export default Integrations;