
import { User } from '../types';

const USERS_KEY = 'ebook-architect-users';
const CURRENT_USER_KEY = 'ebook-architect-session';

// Initialize with a default admin if empty or missing
const initializeUsers = () => {
  let users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  
  // Check if admin exists, if not, add/restore it
  const adminEmail = 'admin@ebookpro.com';
  const adminExists = users.some(u => u.email === adminEmail);

  if (!adminExists) {
    const defaultAdmin: User = {
      id: 'admin-1',
      email: adminEmail,
      name: 'Super Admin',
      role: 'admin',
      joinedAt: Date.now(),
      avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff'
    };
    users = [defaultAdmin, ...users];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const mockLogin = async (email: string): Promise<User> => {
  initializeUsers();
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));

  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // Create new user (Simulate Sign Up)
    user = {
      id: crypto.randomUUID(),
      email: email,
      name: email.split('@')[0], // Extract name from email for demo
      role: 'user',
      joinedAt: Date.now(),
      avatarUrl: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=random`
    };
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
};

export const mockLogout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const session = localStorage.getItem(CURRENT_USER_KEY);
  return session ? JSON.parse(session) : null;
};

export const getAllUsers = (): User[] => {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
};

export const deleteUser = (userId: string) => {
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const filtered = users.filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
};

export const updateUserRole = (userId: string, role: 'admin' | 'user') => {
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const updated = users.map(u => u.id === userId ? { ...u, role } : u);
  localStorage.setItem(USERS_KEY, JSON.stringify(updated));
};
