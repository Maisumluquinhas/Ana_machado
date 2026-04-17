import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, AppPermission } from '../types';

// Admin email as requested
export const PRIMARY_ADMIN_EMAIL = 'nara.alexandro.lucas.com';

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
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        try {
          const docRef = doc(db, 'users', authUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else if (authUser.email === PRIMARY_ADMIN_EMAIL) {
            // Self-provision primary admin if they login first time and doc doesn't exist
            const newProfile: UserProfile = {
              uid: authUser.uid,
              email: authUser.email!,
              role: 'admin',
              permissions: [
                'view_products', 
                'create_products', 
                'edit_products', 
                'excluir_products', 
                'stock_movement', 
                'view_reports', 
                'manage_users'
              ],
              isActive: true,
              createdAt: new Date().toISOString()
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin' || user?.email === PRIMARY_ADMIN_EMAIL;

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
