import React from 'react';
import { UserSettings } from '@/components/settings/UserSettings';
import { Sidebar } from '@/components/layout/Sidebar';

const Settings = () => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <UserSettings />
      </div>
    </div>
  );
};

export default Settings;