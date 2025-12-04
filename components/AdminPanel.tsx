
import React, { useState } from 'react';
import { User, EbookData } from '../types';
import { Trash2, Shield, User as UserIcon, BookOpen, Search } from 'lucide-react';
import { deleteUser, updateUserRole } from '../services/mockAuth';

interface AdminPanelProps {
  users: User[];
  allEbooks: EbookData[];
  onRefreshData: () => void;
  onDeleteEbook: (id: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ users, allEbooks, onRefreshData, onDeleteEbook }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'ebooks'>('users');
  const [searchTerm, setSearchTerm] = useState('');

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć tego użytkownika? To usunie również jego dostęp.')) {
      deleteUser(userId);
      onRefreshData();
    }
  };

  const handleToggleRole = (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    updateUserRole(user.id, newRole);
    onRefreshData();
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEbooks = allEbooks.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8 lg:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-red-600" />
              Panel Administratora
            </h1>
            <p className="text-gray-500 mt-1">Zarządzaj użytkownikami i przeglądaj treści w całym systemie.</p>
          </div>
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'users' ? 'bg-slate-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Użytkownicy
            </button>
            <button
              onClick={() => setActiveTab('ebooks')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'ebooks' ? 'bg-slate-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Wszystkie E-booki ({allEbooks.length})
            </button>
          </div>
        </div>

        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Szukaj..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
        </div>

        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Użytkownik</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rola</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dołączył</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => handleToggleRole(user)}
                        className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
                      >
                        {user.role}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ebooks' && (
          <div className="grid grid-cols-1 gap-4">
            {filteredEbooks.map((ebook) => {
               // Find owner
               const owner = users.find(u => u.id === ebook.ownerId);
               return (
                <div key={ebook.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{ebook.title || 'Bez Tytułu'}</h3>
                    <div className="flex items-center mt-1 space-x-4">
                      <span className="text-sm text-gray-500 flex items-center">
                        <UserIcon className="w-3 h-3 mr-1" />
                        {owner ? owner.email : 'Unknown User'}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {ebook.chapters.length} Rozdziałów
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                        if(window.confirm('Usunąć ten e-book permanentnie?')) {
                            onDeleteEbook(ebook.id);
                        }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
