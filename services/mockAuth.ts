
import { User } from '../types';

const USERS_KEY = 'ebook-architect-users';
const CURRENT_USER_KEY = 'ebook-architect-session';

// Helper for safe ID generation
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper for safe JSON parsing
const getStoredUsers = (): User[] => {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn("Failed to parse users from local storage, resetting.", e);
    return [];
  }
};

const initializeUsers = () => {
  let users = getStoredUsers();
  
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

export const mockLogin = async (email: string, name?: string, avatarUrl?: string): Promise<User> => {
  // Ensure DB is init
  initializeUsers();
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));

  const users = getStoredUsers();
  let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // Create new user (Simulate Sign Up)
    // If name is provided (e.g. from Google Mock), use it. Otherwise parse email.
    const displayName = name || email.split('@')[0];
    const displayAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${displayName}&background=random`;

    user = {
      id: generateId(),
      email: email,
      name: displayName,
      role: 'user',
      joinedAt: Date.now(),
      avatarUrl: displayAvatar
    };
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } else {
    // If user exists but we are logging in with Google providing better data (e.g. avatar), update it
    if (name || avatarUrl) {
       let updated = false;
       if (name && user.name === user.email.split('@')[0]) {
         user.name = name;
         updated = true;
       }
       if (avatarUrl && user.avatarUrl.includes('ui-avatars')) {
         user.avatarUrl = avatarUrl;
         updated = true;
       }
       
       if (updated) {
         const userIndex = users.findIndex(u => u.id === user!.id);
         users[userIndex] = user;
         localStorage.setItem(USERS_KEY, JSON.stringify(users));
       }
    }
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
};

export const mockLogout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  try {
    const session = localStorage.getItem(CURRENT_USER_KEY);
    return session ? JSON.parse(session) : null;
  } catch (e) {
    return null;
  }
};

export const getAllUsers = (): User[] => {
  return getStoredUsers();
};

export const deleteUser = (userId: string) => {
  const users = getStoredUsers();
  const filtered = users.filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
};

export const updateUserRole = (userId: string, role: 'admin' | 'user') => {
  const users = getStoredUsers();
  const updated = users.map(u => u.id === userId ? { ...u, role } : u);
  localStorage.setItem(USERS_KEY, JSON.stringify(updated));
};
