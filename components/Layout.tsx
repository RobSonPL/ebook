
import React from 'react';
import { BookOpen, Layers, PenTool, Sparkles, AlertCircle, LayoutDashboard, Shield, Image as ImageIcon, Megaphone, Music } from 'lucide-react';
import { AppPhase, User } from '../types';

interface LayoutProps {
  currentPhase: AppPhase;
  children: React.ReactNode;
  ebookTitle?: string;
  onGoToDashboard: () => void;
  user: User;
  onLogout: () => void;
  onGoToAdmin: () => void;
  onPhaseChange?: (phase: AppPhase) => void;
}

const steps = [
  { id: AppPhase.BRIEFING, label: 'Briefing', icon: AlertCircle },
  { id: AppPhase.STRUCTURE, label: 'Struktura', icon: Layers },
  { id: AppPhase.WRITING, label: 'Treść E-booka', icon: PenTool },
  { id: AppPhase.GRAPHICS, label: 'Generator Grafik', icon: ImageIcon },
  { id: AppPhase.MARKETING, label: 'Marketing AI', icon: Megaphone },
  { id: AppPhase.AUDIO, label: 'Audio Studio', icon: Music },
];

export const Layout: React.FC<LayoutProps> = ({ 
  currentPhase, 
  children, 
  ebookTitle, 
  onGoToDashboard,
  user,
  onLogout,
  onGoToAdmin,
  onPhaseChange
}) => {
  const isDashboard = currentPhase === AppPhase.DASHBOARD;
  const isAdminPanel = currentPhase === AppPhase.ADMIN;
  
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col transition-all duration-300 shadow-xl z-20">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-700 cursor-pointer" onClick={onGoToDashboard}>
          <BookOpen className="w-8 h-8 text-blue-400" />
          <span className="hidden lg:block ml-3 font-bold text-lg tracking-tight uppercase">E-book Architect</span>
        </div>

        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          <div
            onClick={onGoToDashboard}
            className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors cursor-pointer ${
              isDashboard
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="hidden lg:block ml-3 font-medium text-sm">Dashboard</span>
          </div>

          {user.role === 'admin' && (
            <div
              onClick={onGoToAdmin}
              className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors cursor-pointer ${
                isAdminPanel
                  ? 'bg-red-900 text-white border-l-4 border-red-500'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Shield className="w-6 h-6" />
              <span className="hidden lg:block ml-3 font-medium text-sm">Panel Admina</span>
            </div>
          )}

          <div className="my-4 border-t border-slate-800 mx-4"></div>

          {!isDashboard && !isAdminPanel && (
             <>
               <div className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:block">
                 Menu Projektu
               </div>
               {steps.map((step) => {
                const isActive = step.id === currentPhase;
                const Icon = step.icon;
                
                return (
                  <div
                    key={step.id}
                    onClick={() => onPhaseChange && onPhaseChange(step.id)}
                    className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : ''}`} />
                    <span className="hidden lg:block ml-3 font-medium text-sm">{step.label}</span>
                  </div>
                );
              })}
             </>
          )}
        </nav>
        
        {ebookTitle && !isDashboard && !isAdminPanel && (
          <div className="hidden lg:block p-6 text-xs text-slate-400 border-t border-slate-800 bg-slate-800/50">
            <p className="uppercase tracking-wider font-semibold mb-1 text-slate-500">Projekt</p>
            <p className="line-clamp-2 text-white font-medium">{ebookTitle}</p>
          </div>
        )}

        <div className="p-4 border-t border-slate-700 bg-slate-900">
           <div className="flex items-center">
             <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border-2 border-slate-600" />
             <div className="ml-3 hidden lg:block min-w-0">
               <p className="text-sm font-bold text-white truncate">{user.name}</p>
               <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{user.role}</p>
             </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
};
