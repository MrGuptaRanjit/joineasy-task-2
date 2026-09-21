import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import CreateAssignmentModal from '../assignments/CreateAssignmentModal';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar onMobileMenuToggle={() => setMobileMenuOpen(prev => !prev)} />
      
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)}
          onOpenCreateModal={() => setCreateModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <CreateAssignmentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          // Trigger global refresh event or navigate
          window.dispatchEvent(new Event('assignments:updated'));
        }}
      />
    </div>
  );
}
