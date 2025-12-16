
import React, { useState } from 'react';
import { BookOpen, Sparkles, Mail, Lock, X, User as UserIcon } from 'lucide-react';
import { mockLogin } from '../services/mockAuth';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for the Mock Google Modal
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    performLogin(email);
  };

  const performLogin = async (emailToLogin: string, name?: string, avatar?: string) => {
    setIsLoading(true);
    // Close modal if open
    setShowGoogleModal(false);
    
    try {
      const user = await mockLogin(emailToLogin, name, avatar);
      onLoginSuccess(user);
    } catch (err) {
      console.error("Login failed:", err);
      alert("Błąd logowania. Spróbuj ponownie lub sprawdź konsolę.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleBtnClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowGoogleModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col z-10">
        
        <div className="p-8 pb-0 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-6">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">E-book Pro Architect</h1>
          <p className="text-gray-500 mb-8">Zaloguj się, aby tworzyć profesjonalne e-booki z pomocą AI.</p>
        </div>

        <div className="p-8 pt-0 space-y-6">
          
          <button 
             type="button"
             onClick={handleGoogleBtnClick}
             disabled={isLoading}
             className="w-full flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-xl transition-all shadow-sm group disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Zaloguj przez Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Lub użyj e-maila</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="twoj@email.com"
                  required
                />
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  // Not required for mock, but good for UX feel
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-70 flex items-center justify-center"
            >
              {isLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : "Zaloguj się"}
            </button>
          </form>
        </div>
      </div>

      {/* Mock Google Login Modal */}
      {showGoogleModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
               <div className="flex items-center">
                 <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24">
                   <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                 </svg>
                 <span className="font-medium text-gray-600">Zaloguj się przez Google</span>
               </div>
               <button onClick={() => setShowGoogleModal(false)} className="text-gray-400 hover:text-gray-600">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-2">
              <p className="px-4 py-2 text-sm text-gray-500">Wybierz konto, aby przejść do E-book Architect</p>
              
              <ul className="mt-2">
                <li 
                  onClick={() => performLogin('jan.kowalski@gmail.com', 'Jan Kowalski', 'https://ui-avatars.com/api/?name=Jan+Kowalski&background=0D8ABC&color=fff')}
                  className="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-50 transition-colors"
                >
                  <img src="https://ui-avatars.com/api/?name=Jan+Kowalski&background=0D8ABC&color=fff" className="w-10 h-10 rounded-full mr-3" alt="Avatar" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">Jan Kowalski</p>
                    <p className="text-xs text-gray-500">jan.kowalski@gmail.com</p>
                  </div>
                </li>

                 <li 
                  onClick={() => performLogin('admin@ebookpro.com', 'Super Admin', 'https://ui-avatars.com/api/?name=Admin&background=111&color=fff')}
                  className="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-50 transition-colors"
                >
                  <img src="https://ui-avatars.com/api/?name=Admin&background=111&color=fff" className="w-10 h-10 rounded-full mr-3" alt="Avatar" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">Super Admin</p>
                    <p className="text-xs text-gray-500">admin@ebookpro.com</p>
                  </div>
                </li>

                <li 
                  onClick={() => {
                     const email = prompt("Podaj adres e-mail konta Google:");
                     if(email) performLogin(email);
                  }}
                  className="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-gray-500">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Użyj innego konta</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400">
               To jest symulacja logowania (Mock Environment)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
