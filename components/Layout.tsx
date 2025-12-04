
import React from 'react';
import { BookOpen, Layers, PenTool, Sparkles, AlertCircle, LayoutDashboard } from 'lucide-react';
import { AppPhase } from '../types';

interface LayoutProps {
  currentPhase: AppPhase;
  children: React.ReactNode;
  ebookTitle?: string;
  onGoToDashboard: () => void;
}

const steps = [
  { id: AppPhase.BRIEFING, label: 'Briefing', icon: AlertCircle },
  { id: AppPhase.STRUCTURE, label: 'Struktura', icon: Layers },
  { id: AppPhase.WRITING, label: 'Treść', icon: PenTool },
  { id: AppPhase.EXTRAS, label: 'Dodatki', icon: Sparkles },
];

export const Layout: React.FC<LayoutProps> = ({ 
  currentPhase, 
  children, 
  ebookTitle, 
  onGoToDashboard
}) => {
  const isDashboard = currentPhase === AppPhase.DASHBOARD;
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-700 cursor-pointer" onClick={onGoToDashboard}>
          <BookOpen className="w-8 h-8 text-blue-400" />
          <span className="hidden lg:block ml-3 font-bold text-lg tracking-tight">E-book Architect</span>
        </div>

        <nav className="flex-1 py-6 space-y-2 overflow-y-auto">
          
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

          <div className="my-4 border-t border-slate-800 mx-4"></div>

          {!isDashboard && (
             <>
               <div className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:block">
                 Aktualny Projekt
               </div>
               {steps.map((step) => {
                const isActive = step.id === currentPhase;
                const Icon = step.icon;
                
                // Calculate if step is passed
                const phases = Object.values(AppPhase);
                const isPassed = phases.indexOf(step.id) < phases.indexOf(currentPhase);

                return (
                  <div
                    key={step.id}
                    className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-white border-l-4 border-blue-500'
                        : isPassed
                        ? 'text-blue-200'
                        : 'text-slate-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : ''}`} />
                    <span className="hidden lg:block ml-3 font-medium text-sm">{step.label}</span>
                    {isPassed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 hidden lg:block" />}
                  </div>
                );
              })}
             </>
          )}
        </nav>
        
        {ebookTitle && !isDashboard && (
          <div className="hidden lg:block p-6 text-xs text-slate-400 border-t border-slate-800">
            <p className="uppercase tracking-wider font-semibold mb-1 text-slate-500">Edytujesz</p>
            <p className="line-clamp-2 text-white font-medium">{ebookTitle}</p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
};
