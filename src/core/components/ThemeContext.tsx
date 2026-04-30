import React, { createContext, useContext, useState, useEffect } from 'react';
import { accountService } from '../services/accountService';
import { firebaseService } from '../../services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

type ThemeMode = 'standard' | 'festive' | 'dark_neon';

interface ThemeContextType {
  theme: ThemeMode;
  brandColor: string;
  logoUrl?: string;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('standard');
  const [brandColor, setBrandColor] = useState('#10b981'); // Emerald-500 default
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  const enterpriseId = accountService.getCurrentCompanyId();

  useEffect(() => {
    if (!enterpriseId) return;

    const unsub = onSnapshot(doc(db, 'enterprises', enterpriseId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.branding) {
          setTheme(data.branding.themeMode || 'standard');
          setBrandColor(data.branding.brandColor || '#10b981');
          setLogoUrl(data.branding.logo);
        }
      }
    });

    return () => unsub();
  }, [enterpriseId]);

  const value = {
    theme,
    brandColor,
    logoUrl,
    isDark: theme === 'dark_neon'
  };

  return (
    <ThemeContext.Provider value={value}>
      <div className={theme === 'dark_neon' ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  return context;
};