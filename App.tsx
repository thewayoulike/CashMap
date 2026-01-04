import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { IncomeConfig } from './components/IncomeConfig';
import { BudgetManager } from './components/BudgetManager';
import { Transactions } from './components/Transactions';
import { LoginPage } from './components/LoginPage';
import { HowItWorks } from './components/HowItWorks';
import { Category, Transaction, IncomeSource, UserProfile, SyncStatus, FullBackupData } from './types';
import { findFile, createFile, updateFile, downloadFile } from './services/driveService';
import { v4 as uuidv4 } from 'uuid';

// Declare google on window
declare global {
  interface Window {
    google: any;
  }
}

// Declaration to prevent TypeScript errors during build when using process.env
declare const process: any;

// --- CONFIGURATION ---
// Uses the environment variable configured in Vercel/Vite, or falls back to placeholder if missing
const CLIENT_ID = process.env.CLIENT_ID || "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com"; 
const SCOPES = "https://www.googleapis.com/auth/drive.file";

const App: React.FC = () => {
  // --- Authentication State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [tokenClient, setTokenClient] = useState<any>(null);

  // --- App View State ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dataLoaded, setDataLoaded] = useState(false);

  // --- App Data State (Initially Empty) ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);

  // --- Defaults ---
  // User requested to remove initial default categories
  const defaultCategories: Category[] = [];

  const defaultIncome: IncomeSource[] = [{
      id: uuidv4(),
      name: 'Primary Salary',
      currency: 'USD',
      estimatedAmount: 5000,
      frequency: 'semi-monthly',
      allocations: [
        { paymentIndex: 1, percentage: 60, amount: 2500 },
        { paymentIndex: 2, percentage: 40, amount: 2500 }
      ]
  }];

  // --- Initialization: Load Google Scripts ---
  useEffect(() => {
    if (window.google) return; 
    // Scripts are in index.html, but we wait for them to be ready in handleLogin
  }, []);

  // --- Data Loading Logic ---
  const loadGuestData = () => {
    try {
        const c = localStorage.getItem('fs_categories');
        const t = localStorage.getItem('fs_transactions');
        const i = localStorage.getItem('fs_income_sources');
        
        setCategories(c ? JSON.parse(c) : defaultCategories);
        setTransactions(t ? JSON.parse(t) : []);
        setIncomeSources(i ? JSON.parse(i) : defaultIncome);
    } catch (e) {
        console.error("Local Load Error", e);
        setCategories(defaultCategories);
    }
    setSyncStatus('local');
    setDataLoaded(true);
    setIsAuthenticated(true);
  };

  const loadDriveData = async (accessToken: string) => {
    setIsLoading(true);
    try {
        const fileId = await findFile(accessToken);
        if (fileId) {
            setDriveFileId(fileId);
            const data = await downloadFile(accessToken, fileId);
            setCategories(data.categories || defaultCategories);
            setTransactions(data.transactions || []);
            setIncomeSources(data.incomeSources || defaultIncome);
        } else {
            // New File needed, but we don't create it until first save
            setCategories(defaultCategories);
            setTransactions([]);
            setIncomeSources(defaultIncome);
        }
        setSyncStatus('synced');
        setDataLoaded(true);
        setIsAuthenticated(true);
    } catch (error) {
        console.error("Drive Load Error", error);
        alert("Failed to load data from Google Drive.");
        setSyncStatus('error');
    } finally {
        setIsLoading(false);
    }
  };

  // --- Auth Handlers ---
  const handleGuestLogin = () => {
      setUser(null);
      setToken(null);
      loadGuestData();
  };

  const handleGoogleLogin = () => {
      setIsLoading(true);
      // Initialize Token Client
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (tokenResponse: any) => {
            if (tokenResponse.access_token) {
                setToken(tokenResponse.access_token);
                
                // Fetch User Info
                try {
                    const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                    }).then(res => res.json());
                    
                    setUser({
                        name: userInfo.name,
                        email: userInfo.email,
                        picture: userInfo.picture
                    });

                    // Proceed to load data
                    await loadDriveData(tokenResponse.access_token);

                } catch (e) {
                    console.error("User Info Error", e);
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        },
      });
      setTokenClient(client);
      client.requestAccessToken();
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setCategories([]);
      setTransactions([]);
      setIncomeSources([]);
      setDataLoaded(false);
      setDriveFileId(null);
      
      // Revoke token if exists
      if (token) {
          window.google.accounts.oauth2.revoke(token, () => {});
      }
  };

  // --- Saving Logic (Auto-Save) ---
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dataLoaded) return;

    const saveData = async () => {
        if (!user && !token) {
            // GUEST MODE: Save Local
            localStorage.setItem('fs_categories', JSON.stringify(categories));
            localStorage.setItem('fs_transactions', JSON.stringify(transactions));
            localStorage.setItem('fs_income_sources', JSON.stringify(incomeSources));
            return;
        }

        // DRIVE MODE
        if (token) {
            setSyncStatus('saving');
            const backup: FullBackupData = {
                categories,
                transactions,
                incomeSources,
                lastUpdated: new Date().toISOString()
            };

            try {
                if (driveFileId) {
                    await updateFile(token, driveFileId, backup);
                } else {
                    const newId = await createFile(token, backup);
                    setDriveFileId(newId);
                }
                setSyncStatus('synced');
            } catch (e) {
                console.error("Save Error", e);
                setSyncStatus('error');
            }
        }
    };

    // Debounce save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    // Set immediate saving status visual before waiting for debounce
    if (token) setSyncStatus('saving');
    
    saveTimeoutRef.current = setTimeout(() => {
        saveData();
    }, 2000); // 2 second debounce

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [categories, transactions, incomeSources, dataLoaded, user, token, driveFileId]);


  // --- Render ---
  
  if (!isAuthenticated) {
      return <LoginPage onLogin={handleGoogleLogin} onGuest={handleGuestLogin} isLoading={isLoading} />;
  }

  const displayCurrency = incomeSources.length > 0 ? incomeSources[0].currency : 'USD';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
          categories={categories} 
          setCategories={setCategories}
          transactions={transactions} 
          setTransactions={setTransactions}
          incomeSources={incomeSources} 
        />;
      case 'income':
        return <IncomeConfig incomeSources={incomeSources} onUpdate={setIncomeSources} />;
      case 'budget':
        return <BudgetManager categories={categories} setCategories={setCategories} currency={displayCurrency} transactions={transactions} incomeSources={incomeSources} />;
      case 'transactions':
        return <Transactions transactions={transactions} setTransactions={setTransactions} categories={categories} currency={displayCurrency} />;
      case 'help':
        return <HowItWorks />;
      default:
        return <Dashboard 
          categories={categories} 
          setCategories={setCategories}
          transactions={transactions} 
          setTransactions={setTransactions}
          incomeSources={incomeSources} 
        />;
    }
  };

  return (
    <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout}
        syncStatus={syncStatus}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;