import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Category, Transaction, IncomeSource, TransactionType, Account } from '../types';
import { 
  DollarSign, Euro, PoundSterling, JapaneseYen, IndianRupee, 
  Search, Plus, Wallet, ArrowDownLeft, ArrowUpRight, 
  X, Check, Calendar, AlertCircle, TrendingUp, Filter, PiggyBank, Target, ChevronDown, Sparkles, History, ArrowRight, PieChart, Trash2, Lock, PlusCircle, AlertTriangle, Coins, CheckCircle2, MinusCircle, CornerDownRight, Layers, Landmark, LayoutDashboard, CreditCard, ArrowRightLeft, Upload, Split, Info
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Cell, Pie, PieChart as RePie, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  incomeSources: IncomeSource[];
  accounts: Account[];
}

// Local UI Component for Delete Confirmation
const DeleteButton = ({ onDelete }: { onDelete: () => void }) => {
  const [step, setStep] = useState<'idle' | 'confirm'>('idle');

  useEffect(() => {
    if (step === 'confirm') {
      const t = setTimeout(() => setStep('idle'), 3000); // Reset after 3s
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent any parent default
        if (step === 'idle') {
            setStep('confirm');
        } else {
            onDelete();
            setStep('idle');
        }
      }}
      className={`
        h-7 rounded-lg transition-all duration-200 flex items-center justify-center font-bold text-[10px] uppercase tracking-wide
        ${step === 'confirm' 
          ? 'bg-red-500 text-white w-14 shadow-md' 
          : 'text-slate-300 hover:text-red-500 hover:bg-red-50 w-8'
        }
      `}
      title={step === 'confirm' ? "Click again to delete" : "Delete"}
      type="button"
    >
      {step === 'confirm' ? (
        <span className="animate-fade-in">Sure?</span>
      ) : (
        <Trash2 className="w-4 h-4 pointer-events-none" />
      )}
    </button>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ categories, setCategories, transactions, setTransactions, incomeSources, accounts }) => {
  // --- View State ---
  // Default to current month string YYYY-MM
  const [viewMonthInput, setViewMonthInput] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [viewDate, setViewDate] = useState(new Date());

  // Update viewDate object when input string changes
  useEffect(() => {
    if (!viewMonthInput) return;
    const [y, m] = viewMonthInput.split('-');
    setViewDate(new Date(parseInt(y), parseInt(m) - 1, 1));
  }, [viewMonthInput]);

  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Modal State ---
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showFillModal, setShowFillModal] = useState(false);
  
  // Top Up Modal State
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpCategory, setTopUpCategory] = useState<Category | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');

  // One-Time Expense Modal State
  const [showOneTimeModal, setShowOneTimeModal] = useState(false);
  const [oneTimeDesc, setOneTimeDesc] = useState('');
  const [oneTimeAmount, setOneTimeAmount] = useState('');
  const [oneTimeDate, setOneTimeDate] = useState(new Date().toISOString().split('T')[0]);
  
  // One-Time Payment Source State
  const [selectedOneTimeAccount, setSelectedOneTimeAccount] = useState('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState<Record<string, number>>({}); // { accountId: amount }

  const [fundingSources, setFundingSources] = useState<Record<string, number>>({}); // { categoryId: amountToTake }

  // Fill Envelope State
  const [selectedAllocationIndex, setSelectedAllocationIndex] = useState<number>(0);
  const [selectedIncomeTxId, setSelectedIncomeTxId] = useState<string>(''); 
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [allocationDateMode, setAllocationDateMode] = useState<'current' | 'previous'>('current');

  // Manual Funding State (Fill Envelopes)
  const [useManualFunding, setUseManualFunding] = useState(false);
  const [manualFundAmount, setManualFundAmount] = useState('');

  // --- Form State (Add Transaction) ---
  const [newTxDesc, setNewTxDesc] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxCat, setNewTxCat] = useState('');
  const [newTxAccount, setNewTxAccount] = useState('');
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTxType, setNewTxType] = useState<TransactionType>(TransactionType.EXPENSE);

  // --- Date Helpers ---
  const year = viewDate.getFullYear();
  const month = String(viewDate.getMonth() + 1).padStart(2, '0');
  const viewMonthStr = `${year}-${month}`; // YYYY-MM
  const startOfMonthStr = `${viewMonthStr}-01`;
  const daysInMonth = new Date(year, viewDate.getMonth() + 1, 0).getDate();
  const endOfViewMonthStr = `${viewMonthStr}-${daysInMonth}`;

  // Previous Month Helpers
  const prevMonthDate = new Date(year, viewDate.getMonth() - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
  const prevMonthStr = `${prevYear}-${prevMonth}`;
  const prevMonthDays = new Date(prevYear, prevMonthDate.getMonth() + 1, 0).getDate();
  const prevMonthEndStr = `${prevMonthStr}-${prevMonthDays}`;

  // Check if current view is January (start of year)
  const isStartOfYear = viewDate.getMonth() === 0;

  const getMonthName = (date: Date) => {
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // --- Currency Helper ---
  const currencySymbol = useMemo(() => {
    const currency = incomeSources[0]?.currency || 'USD';
    switch(currency) {
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'JPY': return '¥';
        case 'INR': return '₹';
        case 'PKR': return 'Rs';
        default: return '$';
    }
  }, [incomeSources]);

  // --- Calculations ---

  const activeSource = incomeSources[0];

  // 1. Gross Available Income (The Pool)
  const grossIncomeTransactions = transactions.filter(t => {
      if (t.type !== TransactionType.INCOME) return false;
      if (t.date > endOfViewMonthStr) return false;

      // Filter out legacy system transactions to fix math on existing data
      const isLegacySystemTx = t.description === 'Funds Distributed to Envelopes' || 
                               t.description === 'Unallocated Remainder' || 
                               t.description === 'Filled Envelopes';
      if (isLegacySystemTx) return false;
      
      // Check Category
      if (!t.categoryId) return true; // Uncategorized Income
      const cat = categories.find(c => c.id === t.categoryId);
      if (cat && cat.type === 'income') return true; // Marked as Income Source

      return false; 
  });

  const totalGrossIncome = grossIncomeTransactions.reduce((sum, t) => sum + t.amount, 0);

  // 2. Allocated Funds (Money moved from Pool to Envelopes)
  const allocatedTransactions = transactions.filter(t => {
      if (t.type !== TransactionType.INCOME) return false;
      if (t.date > endOfViewMonthStr) return false;
      if (!t.categoryId) return false;

      const cat = categories.find(c => c.id === t.categoryId);
      // If income is assigned to Expense/Investment, it counts as "Allocated" (removed from Available)
      return cat && (cat.type === 'expense' || cat.type === 'investment');
  });

  const totalAllocated = allocatedTransactions.reduce((sum, t) => sum + t.amount, 0);

  // 3. Uncategorized Expenses
  const uncategorizedExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE && !t.categoryId && t.date <= endOfViewMonthStr)
      .reduce((sum, t) => sum + t.amount, 0);

  // 4. Final Available to Budget
  const totalAccountInitial = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
  const totalUnallocatedAvailable = totalAccountInitial + totalGrossIncome - totalAllocated - uncategorizedExpenses;

  // Older funds logic (for rollover detection)
  const grossIncomeOlder = grossIncomeTransactions.filter(t => t.date < startOfMonthStr).reduce((sum, t) => sum + t.amount, 0);
  const allocatedOlder = allocatedTransactions.filter(t => t.date < startOfMonthStr).reduce((sum, t) => sum + t.amount, 0);
  const uncategorizedExpensesOlder = transactions.filter(t => t.type === TransactionType.EXPENSE && !t.categoryId && t.date < startOfMonthStr).reduce((sum, t) => sum + t.amount, 0);
  const unallocatedOlderFunds = totalAccountInitial + grossIncomeOlder - allocatedOlder - uncategorizedExpensesOlder;

  // Account Balances Calculation
  const accountBalances = useMemo(() => {
      return accounts.map(acc => {
          const income = transactions
            .filter(t => t.accountId === acc.id && t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0);
          
          const expenses = transactions
            .filter(t => t.accountId === acc.id && t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);
          
          const transfersIn = transactions
            .filter(t => t.accountId === acc.id && t.type === TransactionType.TRANSFER && t.transferDirection === 'in')
            .reduce((sum, t) => sum + t.amount, 0);

          const transfersOut = transactions
            .filter(t => t.accountId === acc.id && t.type === TransactionType.TRANSFER && t.transferDirection === 'out')
            .reduce((sum, t) => sum + t.amount, 0);

          return {
              ...acc,
              currentBalance: acc.initialBalance + income - expenses + transfersIn - transfersOut
          };
      });
  }, [accounts, transactions]);

  
  // Real-time calculation of Income Transactions for the current month view
  const currentMonthIncomeTxs = useMemo(() => {
    return grossIncomeTransactions.filter(t => 
        t.date.startsWith(viewMonthStr) && 
        t.categoryId && 
        categories.find(c => c.id === t.categoryId)?.type === 'income'
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending
  }, [grossIncomeTransactions, viewMonthStr, categories]);


  // Helper: Check if an allocation rule has been executed for the current view month
  const isAllocationRuleExecuted = useCallback((ruleIndex: number) => {
    if (!activeSource || !activeSource.allocations[ruleIndex]) return false;
    const rule = activeSource.allocations[ruleIndex];
    const ruleTag = `(${rule.percentage}%)`;
    return transactions.some(t => 
       t.type === TransactionType.INCOME && 
       t.date.startsWith(viewMonthStr) && 
       t.description.includes(ruleTag) && 
       t.description.startsWith('Allocated:')
    );
  }, [activeSource, transactions, viewMonthStr]);

  // 5. Smart Allocation Detection
  const nextPaymentIndex = useMemo(() => {
     if (!activeSource) return -1;
     return activeSource.allocations.findIndex((rule, idx) => !isAllocationRuleExecuted(idx));
  }, [activeSource, isAllocationRuleExecuted]);

  // 6. Category Envelopes Data & Budget Checking
  const getBudgetForDate = (cat: Category, dateStr: string) => {
      if (cat.scheduledChanges && cat.scheduledChanges.length > 0) {
        const activeChange = [...cat.scheduledChanges]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .find(change => change.date <= dateStr);
        if (activeChange) return activeChange.amount;
      }
      return cat.monthlyBudget;
  };

  const getCurrentMonthlyBudget = (cat: Category) => {
    const amount = getBudgetForDate(cat, endOfViewMonthStr);
    const isScheduled = amount !== cat.monthlyBudget;
    return { amount, isScheduled };
  };

  const prevMonthStats = useMemo(() => {
      const expenseCats = categories.filter(c => c.type === 'expense');
      const target = expenseCats.reduce((sum, c) => sum + getBudgetForDate(c, prevMonthEndStr), 0);
      const allocated = transactions
        .filter(t => t.type === TransactionType.INCOME && t.categoryId && t.date.startsWith(prevMonthStr))
        // Only count allocations to expense categories
        .filter(t => {
             const cat = categories.find(c => c.id === t.categoryId);
             return cat && cat.type === 'expense';
        })
        .reduce((sum, t) => sum + t.amount, 0);
      return { target, allocated, gap: target - allocated };
  }, [categories, transactions, prevMonthStr, prevMonthEndStr]);

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const investmentCategories = categories.filter(c => c.type === 'investment');
  const incomeCategories = categories.filter(c => c.type === 'income');

  const getCategoryStats = (subset: Category[]) => {
      return subset.map(cat => {
        // Previous History (Carryover)
        const prevIncome = transactions
            .filter(t => t.categoryId === cat.id && t.type === TransactionType.INCOME && t.date < startOfMonthStr)
            .reduce((sum, t) => sum + t.amount, 0);
        const prevSpent = transactions
            .filter(t => t.categoryId === cat.id && t.type === TransactionType.EXPENSE && t.date < startOfMonthStr)
            .reduce((sum, t) => sum + t.amount, 0);
        const carriedOver = cat.rollover + prevIncome - prevSpent;

        // This Month Activity
        const thisMonthIncome = transactions
            .filter(t => t.categoryId === cat.id && t.type === TransactionType.INCOME && t.date >= startOfMonthStr && t.date <= endOfViewMonthStr)
            .reduce((sum, t) => sum + t.amount, 0);
        const thisMonthSpent = transactions
            .filter(t => t.categoryId === cat.id && t.type === TransactionType.EXPENSE && t.date >= startOfMonthStr && t.date <= endOfViewMonthStr)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalAvailableForMonth = carriedOver + thisMonthIncome;
        const remaining = totalAvailableForMonth - thisMonthSpent;
        const { amount: budget } = getCurrentMonthlyBudget(cat);
        
        return { ...cat, totalAvailableForMonth, remaining, thisMonthSpent, budget };
      });
  };

  const expenseStats = useMemo(() => getCategoryStats(expenseCategories), [expenseCategories, transactions, startOfMonthStr]);
  const investmentStats = useMemo(() => getCategoryStats(investmentCategories), [investmentCategories, transactions, startOfMonthStr]);

  // Sort Expense Stats: User categories first, System categories (Other, Transfer) last
  const sortedExpenseStats = useMemo(() => {
      return [...expenseStats].sort((a, b) => {
          const isHardcodedA = a.name === 'Other Expenses (One Time)' || a.name === 'Other Expenses' || a.name === 'Transfers';
          const isHardcodedB = b.name === 'Other Expenses (One Time)' || b.name === 'Other Expenses' || b.name === 'Transfers';
          
          if (isHardcodedA && !isHardcodedB) return 1;
          if (!isHardcodedA && isHardcodedB) return -1;
          
          return a.name.localeCompare(b.name);
      });
  }, [expenseStats]);

  // 6. Transactions List (FLAT LIST - NO GROUPING)
  const displayedTransactions = useMemo(() => {
    // Sort all transactions by date DESC
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return sorted
        .filter(t => {
             // Filter out legacy system transactions from view entirely
             const isLegacy = t.description === 'Funds Distributed to Envelopes' || 
                              t.description === 'Unallocated Remainder' || 
                              t.description === 'Filled Envelopes';
             if (isLegacy) return false;

             // FILTER OUT TRANSFERS FROM DASHBOARD VIEW
             if (t.type === TransactionType.TRANSFER) return false;

             return t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.amount.toString().includes(searchTerm);
        })
        .slice(0, 50); 
  }, [transactions, searchTerm]);

  // Define isSourceMissing logic in component scope for use in render
  const isSourceMissing = selectedAllocationIndex >= currentMonthIncomeTxs.length;

  // --- Auto-Selection for Fill Modal ---
  useEffect(() => {
    if (showFillModal) {
        setIsManualSelection(false);
        if (nextPaymentIndex !== -1) {
            setSelectedAllocationIndex(nextPaymentIndex);
        } else {
            setSelectedAllocationIndex(0);
        }
        
        // Auto-select latest income tx if available
        if (currentMonthIncomeTxs.length > 0) {
            setSelectedIncomeTxId(currentMonthIncomeTxs[0].id);
            setUseManualFunding(false);
            setManualFundAmount('');
        } else {
            setSelectedIncomeTxId('');
            setUseManualFunding(true); // Default to manual if no income
            // Default amount to available balance if positive
            setManualFundAmount(totalUnallocatedAvailable > 0 ? totalUnallocatedAvailable.toFixed(2) : '');
        }

        if (unallocatedOlderFunds > 0 && prevMonthStats.gap > 1 && !isStartOfYear) {
            setAllocationDateMode('previous');
        } else {
            setAllocationDateMode('current');
        }
    }
  }, [showFillModal, nextPaymentIndex, unallocatedOlderFunds, prevMonthStats.gap, currentMonthIncomeTxs, isStartOfYear, totalUnallocatedAvailable]);

  // Set default account for one-time AND quick add
  useEffect(() => {
      if (accounts.length > 0) {
          if (!selectedOneTimeAccount) setSelectedOneTimeAccount(accounts[0].id);
          if (!newTxAccount) setNewTxAccount(accounts[0].id);
      }
  }, [accounts]);

  // --- Actions --- (Same as before)
  const handleAddTransaction = () => {
    if (!newTxDesc || !newTxAmount) return;
    const amountVal = parseFloat(newTxAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const newTx: Transaction = {
        id: uuidv4(),
        date: newTxDate,
        description: newTxDesc,
        amount: amountVal,
        categoryId: newTxCat || undefined,
        type: newTxType,
        accountId: newTxAccount || undefined
    };

    setTransactions([newTx, ...transactions]);
    setShowAddTxModal(false);
    setNewTxDesc('');
    setNewTxAmount('');
    setNewTxCat('');
    setNewTxType(TransactionType.EXPENSE);
    setNewTxAccount('');
  };
  
  const deleteTransaction = (id: string) => {
      setTransactions(prev => {
          const txToDelete = prev.find(t => t.id === id);
          if (!txToDelete) return prev;
          
          const idsToDelete = new Set([id]);
          
          // Delete children if any
          const children = prev.filter(t => t.parentTransactionId === id);
          children.forEach(c => idsToDelete.add(c.id));
          
          // Delete peer if transfer
          if (txToDelete.type === TransactionType.TRANSFER && txToDelete.transferPeerId) {
              idsToDelete.add(txToDelete.transferPeerId);
          }

          return prev.filter(t => !idsToDelete.has(t.id));
      });
  };

  const openTopUpModal = (cat: Category) => {
    setTopUpCategory(cat);
    setTopUpAmount('');
    setShowTopUpModal(true);
  };

  const handleTopUp = () => {
    if (!topUpCategory || !topUpAmount) return;
    const amountVal = parseFloat(topUpAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;
    
    // Top-ups are internal budget moves (from pool to envelope)
    // They are income transactions into the category, but they don't affect an account balance
    // unless they were a deposit. Since this is "from available budget", it's purely logical.
    
    const newTx: Transaction = {
        id: uuidv4(),
        date: new Date().toISOString().split('T')[0],
        description: `Manual Top-up: ${topUpCategory.name}`,
        amount: amountVal,
        categoryId: topUpCategory.id,
        type: TransactionType.INCOME,
    };

    setTransactions([newTx, ...transactions]);
    setShowTopUpModal(false);
    setTopUpCategory(null);
    setTopUpAmount('');
  };

  const openOneTimeModal = () => {
      setOneTimeDesc('');
      setOneTimeAmount('');
      setOneTimeDate(new Date().toISOString().split('T')[0]);
      setFundingSources({});
      setPaymentSplits({});
      setIsSplitPayment(false);
      setShowOneTimeModal(true);
  };

  const handleOneTimeFundingChange = (catId: string, value: string) => {
      const val = parseFloat(value) || 0;
      setFundingSources(prev => ({ ...prev, [catId]: val }));
  };
  
  const handlePaymentSplitChange = (accId: string, value: string) => {
      const val = parseFloat(value) || 0;
      setPaymentSplits(prev => ({...prev, [accId]: val}));
  };

  const handleCreateOneTimeExpense = () => {
      const expenseAmount = parseFloat(oneTimeAmount);
      if (isNaN(expenseAmount) || expenseAmount <= 0) return;

      const totalFunded = (Object.values(fundingSources) as number[]).reduce((a: number, b: number) => a + b, 0);
      const remainderFromPool = Math.max(0, expenseAmount - totalFunded);
      
      if (remainderFromPool > totalUnallocatedAvailable + 0.01) {
          alert(`Insufficient funds.\n\nTotal Expense: ${currencySymbol}${expenseAmount}\nCovered by Envelopes: ${currencySymbol}${totalFunded}\nRemaining needed from Pool: ${currencySymbol}${remainderFromPool.toFixed(2)}\n\nAvailable in Pool: ${currencySymbol}${totalUnallocatedAvailable.toFixed(2)}`);
          return;
      }

      // Payment Split Validation
      if (isSplitPayment) {
          const totalPaid = (Object.values(paymentSplits) as number[]).reduce((sum, val) => sum + val, 0);
          if (Math.abs(totalPaid - expenseAmount) > 0.01) {
              alert(`Payment split mismatch.\n\nTotal Expense: ${currencySymbol}${expenseAmount}\nTotal Paid from Accounts: ${currencySymbol}${totalPaid}\n\nPlease adjust your account splits to match the total expense.`);
              return;
          }
      }

      // Check for either the new default name OR the legacy name to prevent duplicates
      let otherCategory = categories.find(c => c.name.toLowerCase() === 'other expenses (one time)' || c.name.toLowerCase() === 'other expenses');
      
      if (!otherCategory) {
          const newOtherCat: Category = {
              id: uuidv4(),
              name: 'Other Expenses (One Time)',
              type: 'expense',
              monthlyBudget: 0,
              rollover: 0,
              allocationRule: 0,
              color: '#64748b',
              startDate: oneTimeDate,
              scheduledChanges: []
          };
          otherCategory = newOtherCat;
          setCategories(prev => [...prev, newOtherCat]);
      }

      const txs: Transaction[] = [];

      // 1. Funding Transactions (Move from Envelopes to Other)
      Object.entries(fundingSources).forEach(([catId, amount]) => {
          const val = amount as number;
          if (val <= 0) return;
          const cat = categories.find(c => c.id === catId);
          txs.push({
              id: uuidv4(),
              date: oneTimeDate,
              description: `Moved for One-Time: ${oneTimeDesc}`,
              amount: -val,
              categoryId: catId,
              type: TransactionType.INCOME 
          });
      });

      const sourceNames = Object.entries(fundingSources)
           .filter(([_, amt]) => (amt as number) > 0)
           .map(([id, _]) => categories.find(c => c.id === id)?.name)
           .filter(Boolean)
           .join(', ');

      const finalDesc = sourceNames ? `${oneTimeDesc} (Funded by: ${sourceNames})` : oneTimeDesc;

      // 2. Expense Transaction(s)
      if (isSplitPayment) {
          Object.entries(paymentSplits).forEach(([accId, amt]) => {
              if (amt <= 0) return;
              txs.push({
                  id: uuidv4(),
                  date: oneTimeDate,
                  description: `${finalDesc} (Split)`,
                  amount: amt,
                  type: TransactionType.EXPENSE,
                  categoryId: otherCategory!.id,
                  accountId: accId
              });
          });
      } else {
          txs.push({
              id: uuidv4(),
              date: oneTimeDate,
              description: finalDesc,
              amount: expenseAmount,
              type: TransactionType.EXPENSE,
              categoryId: otherCategory.id,
              accountId: selectedOneTimeAccount || undefined
          });
      }

      setTransactions([...txs, ...transactions]);
      setShowOneTimeModal(false);
  };

  const handleDistributeIncome = () => {
    let poolAmount = 0;
    
    if (useManualFunding) {
        poolAmount = parseFloat(manualFundAmount) || 0;
        if (poolAmount <= 0) return;
    } else {
        // Normal mode (distribute all unallocated, or tied to specific income? Logic currently distributes Pool but uses Rule %)
        poolAmount = totalUnallocatedAvailable;
    }

    if (poolAmount <= 0) {
        alert("No funds available to distribute.");
        return;
    }
    
    let newTransactions: Transaction[] = [];
    
    let dateStr = new Date().toISOString().split('T')[0];
    if (allocationDateMode === 'previous') {
        dateStr = prevMonthEndStr;
    } else {
        if (!dateStr.startsWith(viewMonthStr)) {
            dateStr = `${viewMonthStr}-01`;
        }
    }
    
    // Determine Parent TX ID based on selection
    let effectiveParentTxId: string | undefined = undefined;
    if (allocationDateMode === 'current' && !useManualFunding) {
        if (selectedIncomeTxId) {
            effectiveParentTxId = selectedIncomeTxId;
        } else if (currentMonthIncomeTxs.length > 0) {
            // Fallback (though UI should prevent this)
            effectiveParentTxId = currentMonthIncomeTxs[0].id; 
        }
    }

    const targetCategories = [...expenseCategories]; 

    if (allocationDateMode === 'previous') {
        const deficits = targetCategories.map(cat => {
            const target = getBudgetForDate(cat, dateStr);
            const allocated = transactions
                .filter(t => t.categoryId === cat.id && t.type === TransactionType.INCOME && t.date.startsWith(prevMonthStr))
                .reduce((sum, t) => sum + t.amount, 0);
            return { cat, deficit: Math.max(0, target - allocated) };
        }).filter(d => d.deficit > 0);

        const totalDeficit = deficits.reduce((sum, d) => sum + d.deficit, 0);

        if (totalDeficit === 0) {
            alert("Previous month is fully funded! Switching to current month.");
            setAllocationDateMode('current');
            return;
        }

        const ratio = Math.min(1, poolAmount / totalDeficit);

        deficits.forEach(({ cat, deficit }) => {
            const amount = deficit * ratio;
            if (amount > 0.01) {
                newTransactions.push({
                    id: uuidv4(),
                    date: dateStr,
                    amount: parseFloat(amount.toFixed(2)),
                    description: `Gap Fill: ${cat.name}`,
                    categoryId: cat.id,
                    type: TransactionType.INCOME,
                    parentTransactionId: undefined 
                });
            }
        });

    } else {
        const rule = activeSource?.allocations[selectedAllocationIndex];
        if (!rule) return;
        
        // Optional warning if re-using a rule, but allowed since user selected manually
        // Check if selected TX already has allocations?
        const txHasChildren = effectiveParentTxId && transactions.some(t => t.parentTransactionId === effectiveParentTxId);
        if (txHasChildren && !useManualFunding) {
             if(!confirm(`⚠️ The selected income transaction already has allocations linked to it.\n\nAdding more may result in duplicates.\n\nContinue?`)) {
                return;
            }
        }

        const currentPaymentIndex = rule.paymentIndex;
        
        let potentialAllocation = 0;
        const targets = targetCategories.map(cat => {
            const budget = getBudgetForDate(cat, dateStr);
            let multiplier = rule.percentage / 100;
            if (cat.linkedPaymentIndex && cat.linkedPaymentIndex > 0) {
                if (cat.linkedPaymentIndex === currentPaymentIndex) {
                    multiplier = 1.0; 
                } else {
                    multiplier = 0.0; 
                }
            }
            const share = budget * multiplier;
            potentialAllocation += share;
            return { cat, share, multiplier };
        });

        let finalRatio = 1;
        if (potentialAllocation > poolAmount) {
            if(!confirm(`Warning: Budget allocation (${currencySymbol}${potentialAllocation.toFixed(2)}) exceeds available funds (${currencySymbol}${poolAmount.toFixed(2)}).\n\nDistribute proportionally?`)) {
                return;
            }
            finalRatio = poolAmount / potentialAllocation;
        }

        targets.forEach(({ cat, share, multiplier }) => {
            const finalAmount = share * finalRatio;
            if (finalAmount > 0.01) {
                const isStrict = multiplier === 1.0;
                const desc = isStrict 
                    ? `Allocated: ${cat.name} (100% via Linked Payment)` 
                    : useManualFunding ? `Manual Allocation: ${cat.name} (${rule.percentage}%)` : `Allocated: ${cat.name} (${rule.percentage}%)`;
                    
                newTransactions.push({
                    id: uuidv4(),
                    date: dateStr,
                    amount: parseFloat(finalAmount.toFixed(2)),
                    description: desc,
                    categoryId: cat.id,
                    type: TransactionType.INCOME,
                    parentTransactionId: effectiveParentTxId
                });
            }
        });
    }

    setTransactions([...transactions, ...newTransactions]);
    setShowFillModal(false);
  };

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-0 z-20">
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                 <div className="p-2 bg-slate-100 rounded-lg">
                     <LayoutDashboard className="w-6 h-6 text-slate-600" />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-slate-800">Overview</h2>
                    <p className="text-xs text-slate-500">Financial snapshot</p>
                 