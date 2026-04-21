import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, AppPermission } from '../types';

// Valid admin identifiers (always compare in lowercase)
export const PRIMARY_ADMIN_EMAIL = 'nara.alexandre.lucas@gmail.com';

const isPrimaryAdmin = (email: string | null | undefined) => {
  if (!email) return false;
  const lowerEmail = email.toLowerCase().trim();
  return lowerEmail === 'nara.alexandre.lucas@gmail.com' || lowerEmail === 'nara.alexandre.lucas';
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  hasPermission: (permission: AppPermission) => boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  isAdmin: false,
  hasPermission: () => false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Force set loading false if it takes too long (failsafe)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        try {
          const docRef = doc(db, 'users', authUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else if (isPrimaryAdmin(authUser.email)) {
            // Self-provision primary admin if they login first time and doc doesn't exist
            const now = new Date().toISOString();
            const newProfile: UserProfile = {
              uid: authUser.uid,
              email: authUser.email || PRIMARY_ADMIN_EMAIL,
              role: 'admin',
              permissions: [
                'view_products', 
                'create_products', 
                'edit_products', 
                'excluir_products', 
                'stock_movement', 
                'view_reports', 
                'manage_users',
                'delete_sale'
              ],
              isActive: true,
              createdAt: now,
              updatedAt: now
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("AuthContext: Error fetching profile", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
      clearTimeout(timer);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const isAdmin = profile?.role === 'admin' || isPrimaryAdmin(user?.email);

  const hasPermission = (permission: AppPermission) => {
    if (isAdmin) return true;
    if (!profile || !profile.isActive) return false;
    return profile.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
