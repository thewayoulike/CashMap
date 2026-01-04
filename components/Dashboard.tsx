import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Category, Transaction, IncomeSource, TransactionType } from '../types';
import { 
  DollarSign, Euro, PoundSterling, JapaneseYen, IndianRupee, 
  Search, Plus, Wallet, ArrowDownLeft, ArrowUpRight, 
  X, Check, Calendar, AlertCircle, TrendingUp, Filter, PiggyBank, Target, ChevronDown, Sparkles, History, ArrowRight, PieChart, Trash2, Lock, PlusCircle, AlertTriangle, Coins, CheckCircle2, MinusCircle, CornerDownRight, Layers, Landmark, LayoutDashboard
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Cell, Pie, PieChart as RePie, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  incomeSources: IncomeSource[];
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

export const Dashboard: React.FC<DashboardProps> = ({ categories, setCategories, transactions, setTransactions, incomeSources }) => {
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
  const [fundingSources, setFundingSources] = useState<Record<string, number>>({}); // { categoryId: amountToTake }

  const [selectedAllocationIndex, setSelectedAllocationIndex] = useState<number>(0);
  const [isManualSelection, setIsManualSelection] = useState(false);
  
  // Smart Allocation Date State
  const [allocationDateMode, setAllocationDateMode] = useState<'current' | 'previous'>('current');

  // --- Form State (Add Transaction) ---
  const [newTxDesc, setNewTxDesc] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxCat, setNewTxCat] = useState('');
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTxType, setNewTxType] = useState<TransactionType>(TransactionType.EXPENSE);

  // --- Transaction Grouping & Expansion State ---
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        return next;
    });
  };

  // --- Grouping Logic (Memoized) ---
  const { roots, childrenMap } = useMemo(() => {
      const map = new Map<string, Transaction[]>();
      const rootsArr: Transaction[] = [];
      
      // First pass: identify children and map them
      transactions.forEach(t => {
          if (t.parentTransactionId) {
              const existing = map.get(t.parentTransactionId) || [];
              existing.push(t);
              map.set(t.parentTransactionId, existing);
          }
      });

      // Second pass: identify roots (items that are NOT children)
      transactions.forEach(t => {
          if (!t.parentTransactionId) {
              rootsArr.push(t);
          }
      });

      // Sort roots by date descending
      rootsArr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return { roots: rootsArr, childrenMap: map };
  }, [transactions]);

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
  // Logic: Income Transactions assigned to an Expense or Investment Category
  const allocatedTransactions = transactions.filter(t => {
      if (t.type !== TransactionType.INCOME) return false;
      if (t.date > endOfViewMonthStr) return false;
      if (!t.categoryId) return false;

      const cat = categories.find(c => c.id === t.categoryId);
      // If income is assigned to Expense/Investment, it counts as "Allocated" (removed from Available)
      return cat && (cat.type === 'expense' || cat.type === 'investment');
  });

  const totalAllocated = allocatedTransactions.reduce((sum, t) => sum + t.amount, 0);

  // 3. Uncategorized Expenses (Money spent directly from the pool)
  // These reduce the available amount to budget.
  const uncategorizedExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE && !t.categoryId && t.date <= endOfViewMonthStr)
      .reduce((sum, t) => sum + t.amount, 0);

  // 4. Final Available to Budget
  // Include Opening Balance if defined
  const openingBalance = activeSource?.openingBalance || 0;
  const totalUnallocatedAvailable = openingBalance + totalGrossIncome - totalAllocated - uncategorizedExpenses;

  // Older funds logic (for rollover detection)
  const grossIncomeOlder = grossIncomeTransactions.filter(t => t.date < startOfMonthStr).reduce((sum, t) => sum + t.amount, 0);
  const allocatedOlder = allocatedTransactions.filter(t => t.date < startOfMonthStr).reduce((sum, t) => sum + t.amount, 0);
  const uncategorizedExpensesOlder = transactions.filter(t => t.type === TransactionType.EXPENSE && !t.categoryId && t.date < startOfMonthStr).reduce((sum, t) => sum + t.amount, 0);
  const unallocatedOlderFunds = openingBalance + grossIncomeOlder - allocatedOlder - uncategorizedExpensesOlder;

  
  // Real-time calculation of Income Transactions for the current month view
  // Used to determine if "Payment 1" or "Payment 2" has actually happened.
  const currentMonthIncomeTxs = useMemo(() => {
    return grossIncomeTransactions.filter(t => 
        t.date.startsWith(viewMonthStr) && 
        t.categoryId && 
        categories.find(c => c.id === t.categoryId)?.type === 'income'
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort Ascending to match Index
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

  // Income Breakdown Stats
  const incomeBreakdown = useMemo(() => {
      const data = incomeCategories.map(cat => {
          const totalReceived = transactions
            .filter(t => t.categoryId === cat.id && t.type === TransactionType.INCOME && t.date >= startOfMonthStr && t.date <= endOfViewMonthStr)
            .reduce((sum, t) => sum + t.amount, 0);
          
          const matchingAllocation = activeSource?.allocations.find(a => a.name === cat.name);
          const isUncertain = matchingAllocation?.isUncertain;

          return { name: cat.name, value: totalReceived, color: cat.color, isUncertain };
      }).filter(d => d.value > 0);
      
      // Also catch uncategorized income for this month (Gross Only)
      const uncategorizedIncome = grossIncomeTransactions
        .filter(t => !t.categoryId && t.date >= startOfMonthStr && t.date <= endOfViewMonthStr)
        .reduce((sum, t) => sum + t.amount, 0);
        
      if (uncategorizedIncome > 0) {
          data.push({ name: 'Uncategorized', value: uncategorizedIncome, color: '#94a3b8', isUncertain: false });
      }
      return data;
  }, [incomeCategories, transactions, startOfMonthStr, endOfViewMonthStr, grossIncomeTransactions, activeSource]);


  // 6. Transactions List (Displayed Roots)
  const displayedRoots = useMemo(() => {
    return roots
        .filter(t => {
             // Filter out legacy system transactions from view entirely
             const isLegacy = t.description === 'Funds Distributed to Envelopes' || 
                              t.description === 'Unallocated Remainder' || 
                              t.description === 'Filled Envelopes';
             if (isLegacy) return false;

             return t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.amount.toString().includes(searchTerm);
        })
        .slice(0, 50); 
  }, [roots, searchTerm]);

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
        if (unallocatedOlderFunds > 0 && prevMonthStats.gap > 1) {
            setAllocationDateMode('previous');
        } else {
            setAllocationDateMode('current');
        }
    }
  }, [showFillModal, nextPaymentIndex, unallocatedOlderFunds, prevMonthStats.gap]);

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
        type: newTxType
    };

    setTransactions([newTx, ...transactions]);
    setShowAddTxModal(false);
    setNewTxDesc('');
    setNewTxAmount('');
    setNewTxCat('');
    setNewTxType(TransactionType.EXPENSE);
  };
  
  const deleteTransaction = (id: string) => {
      setTransactions(prev => {
          const children = prev.filter(t => t.parentTransactionId === id);
          const idsToDelete = new Set([id, ...children.map(c => c.id)]);
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
    
    if (amountVal > totalUnallocatedAvailable) {
        if (!confirm(`Warning: You only have ${currencySymbol}${totalUnallocatedAvailable.toFixed(2)} available. Are you sure you want to create a deficit?`)) {
            return;
        }
    }

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
      setShowOneTimeModal(true);
  };

  const handleOneTimeFundingChange = (catId: string, value: string) => {
      const val = parseFloat(value) || 0;
      setFundingSources(prev => ({ ...prev, [catId]: val }));
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

      let otherCategory = categories.find(c => c.name.toLowerCase() === 'other expenses');
      
      if (!otherCategory) {
          const newOtherCat: Category = {
              id: uuidv4(),
              name: 'Other Expenses',
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

      txs.push({
          id: uuidv4(),
          date: oneTimeDate,
          description: finalDesc,
          amount: expenseAmount,
          type: TransactionType.EXPENSE,
          categoryId: otherCategory.id 
      });

      setTransactions([...txs, ...transactions]);
      setShowOneTimeModal(false);
  };

  const handleDistributeIncome = () => {
    const poolAmount = totalUnallocatedAvailable;
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
    
    let effectiveParentTxId: string | undefined = undefined;
    if (currentMonthIncomeTxs[selectedAllocationIndex]) {
        effectiveParentTxId = currentMonthIncomeTxs[selectedAllocationIndex].id;
    } else if (currentMonthIncomeTxs.length > 0) {
        effectiveParentTxId = currentMonthIncomeTxs[0].id;
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
        
        if (isAllocationRuleExecuted(selectedAllocationIndex)) {
            if(!confirm(`⚠️ You have already filled envelopes using "${rule.name || `Payment ${selectedAllocationIndex + 1}`}" for ${getMonthName(viewDate)}.\n\nProceeding will duplicate funds and exceed your 100% budget targets.\n\nAre you sure you want to continue?`)) {
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
                    : `Allocated: ${cat.name} (${rule.percentage}%)`;
                    
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

    if (newTransactions.length === 0) {
        alert("No allocations were created.\n\nPlease ensure your expense categories have 'Monthly Target' budgets set.");
        return;
    }

    setTransactions([...transactions, ...newTransactions]);
    setShowFillModal(false);
  };

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-800">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <div className="flex items-center gap-4">
             {/* Removed duplicate "CashMap" title here, keeping specific view controls */}
             <div className="flex items-center gap-2">
                 <div className="p-2 bg-slate-100 rounded-lg">
                     <LayoutDashboard className="w-6 h-6 text-slate-600" />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-slate-800">Overview</h2>
                    <p className="text-xs text-slate-500">Financial snapshot</p>
                 </div>
             </div>
             
             {/* Month Picker */}
             <div className="ml-4 pl-4 border-l border-slate-200">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">View Period</label>
                <input 
                    type="month" 
                    value={viewMonthInput}
                    onChange={(e) => setViewMonthInput(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:border-cyan-400 cursor-pointer"
                />
             </div>
         </div>
         
         <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
             <button 
                type="button"
                onClick={() => setShowAddTxModal(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5"
             >
                 <Plus className="w-4 h-4 text-cyan-400" /> Add Entry
             </button>
             <button 
                type="button"
                onClick={openOneTimeModal}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold shadow-sm hover:bg-purple-100 transition-all"
             >
                 <Coins className="w-4 h-4" /> One-Time
             </button>
             <button 
                type="button"
                onClick={() => setShowFillModal(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-cyan-200 text-cyan-700 px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold shadow-sm hover:bg-cyan-50 transition-all hover:border-cyan-300"
             >
                 <Wallet className="w-4 h-4" /> Fill Envelopes
             </button>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
          {/* ... LEFT PANEL ... */}
          <div className="w-full lg:w-1/3 space-y-4">
              {/* Available Card - Fallback styling inline to ensure visibility */}
              <div 
                className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl relative overflow-hidden group transition-all duration-300"
                title="Cash available to budget"
                style={{ backgroundColor: '#0f172a', color: 'white', borderRadius: '1rem' }}
              >
                  <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-cyan-500/30 transition-colors"></div>
                  <div className="relative z-10 flex justify-between items-center">
                      <div>
                          <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-widest mb-1">
                             Available to Budget
                          </h4>
                          <span className="text-3xl font-bold text-white">
                              {currencySymbol}
                              {totalUnallocatedAvailable.toLocaleString()}
                          </span>
                      </div>
                      <div className="p-3 rounded-full bg-white/10 text-cyan-400">
                          <Wallet className="w-6 h-6" />
                      </div>
                  </div>
              </div>
              
              {/* Income Breakdown Card */}
              {incomeBreakdown.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                       <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Income Sources ({getMonthName(viewDate)})</h4>
                       <div className="flex items-center gap-4">
                           <div className="h-24 w-24 flex-shrink-0">
                               <ResponsiveContainer width="100%" height="100%">
                                    <RePie>
                                        <Pie data={incomeBreakdown} dataKey="value" innerRadius={25} outerRadius={40} paddingAngle={2}>
                                            {incomeBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </RePie>
                               </ResponsiveContainer>
                           </div>
                           <div className="flex-1 space-y-1 overflow-y-auto max-h-32 pr-2 custom-scrollbar">
                               {incomeBreakdown.map(item => (
                                   <div key={item.name} className="flex justify-between items-center text-xs">
                                       <div className="flex items-center gap-1.5">
                                           <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div>
                                           <span className="text-slate-600 font-medium">{item.name}</span>
                                           {item.isUncertain && (
                                               <div className="flex gap-0.5 ml-1" title="Uncertain Estimate">
                                                   <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></div>
                                                   <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse delay-75"></div>
                                               </div>
                                           )}
                                       </div>
                                       <span className="font-bold text-slate-800">{currencySymbol}{item.value.toLocaleString()}</span>
                                   </div>
                               ))}
                           </div>
                       </div>
                  </div>
              )}

              {/* Investments Card */}
              {investmentStats.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-4">
                        <PiggyBank className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Investments</h4>
                    </div>
                    <div className="space-y-3">
                         {investmentStats.map(cat => (
                             <div key={cat.id}>
                                 <div className="flex justify-between text-xs mb-1">
                                     <span className="font-bold text-emerald-900">{cat.name}</span>
                                     <span className="text-emerald-700 font-bold">{currencySymbol}{cat.thisMonthSpent.toLocaleString()} invested</span>
                                 </div>
                                 <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                                     <div 
                                         className="h-full bg-emerald-500 rounded-full"
                                         style={{ width: `${Math.min(((cat.thisMonthSpent + 0.01) / (cat.budget || 1)) * 100, 100)}%` }}
                                     ></div>
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>
              )}

              {/* Envelopes List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-cyan-600" /> Expense Envelopes
                      </h3>
                      <span className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-400 font-medium">
                          {getMonthName(viewDate)}
                      </span>
                  </div>
                  
                  <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {expenseStats.map(cat => {
                          const isOtherExpenses = cat.name === 'Other Expenses';
                          return (
                          <div key={cat.id} className="p-4 hover:bg-slate-50 transition-colors group">
                              <div className="flex justify-between items-end mb-2">
                                  <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-8 rounded-full" style={{backgroundColor: cat.color}}></div>
                                      <div>
                                          <p className="text-sm font-bold text-slate-800">{cat.name}</p>
                                          {!isOtherExpenses && (
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                Budget: {currencySymbol}{cat.budget.toLocaleString()}
                                            </p>
                                          )}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      {isOtherExpenses ? (
                                         <>
                                            <p className="text-sm font-bold text-slate-700">
                                                {currencySymbol}{cat.thisMonthSpent.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium">total spent</p>
                                         </>
                                      ) : (
                                         <>
                                            <p className={`text-sm font-bold ${cat.remaining < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                                {currencySymbol}{cat.remaining.toFixed(2)}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium">remaining</p>
                                         </>
                                      )}
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      {isOtherExpenses ? (
                                          <div className="h-full bg-slate-300 rounded-full w-full opacity-50"></div>
                                      ) : (
                                          <div 
                                              className={`h-full rounded-full transition-all duration-500 ${cat.remaining < 0 ? 'bg-red-500' : 'bg-cyan-500'}`}
                                              style={{ width: `${Math.min((cat.thisMonthSpent / (cat.totalAvailableForMonth || 1)) * 100, 100)}%` }}
                                          ></div>
                                      )}
                                  </div>
                                  {!isOtherExpenses && (
                                      <button 
                                          onClick={() => openTopUpModal(cat)}
                                          className="text-slate-300 hover:text-cyan-600 hover:bg-cyan-50 rounded-full p-1 transition-all"
                                          title="Add funds from available budget"
                                      >
                                          <PlusCircle className="w-4 h-4" />
                                      </button>
                                  )}
                              </div>
                          </div>
                          );
                      })}
                  </div>
              </div>
          </div>

          {/* RIGHT PANEL: TRANSACTIONS (Activity) */}
          <div className="w-full lg:w-2/3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
                  {/* Toolbar */}
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                      <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input 
                             type="text" 
                             placeholder="Search transactions..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-400 w-full sm:w-64 transition-colors"
                          />
                      </div>
                  </div>

                  {/* Table */}
                  <div className="flex-1 overflow-auto">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                              <tr>
                                  <th className="w-8 px-2 py-3"></th> {/* Expand Toggle */}
                                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
                                  <th className="px-6 py-3"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {displayedRoots.length > 0 ? (
                                  displayedRoots.map(tx => {
                                      const cat = categories.find(c => c.id === tx.categoryId);
                                      const isIncome = tx.type === TransactionType.INCOME;
                                      const isAllocated = !!tx.parentTransactionId;
                                      
                                      const children = childrenMap.get(tx.id) || [];
                                      const hasChildren = children.length > 0;
                                      const isExpanded = expandedRows.has(tx.id);
                                      
                                      const childrenSum = children.reduce((sum, c) => sum + Math.abs(c.amount), 0);
                                      const remainingFromAvailable = Math.max(0, tx.amount - childrenSum);

                                      let allocationGroups: Record<string, { total: number; items: Transaction[] }> = {};
                                      if (isIncome && hasChildren) {
                                          children.forEach(c => {
                                              const match = c.description.match(/\((\d+%)\)/);
                                              const key = match ? `${match[1]} Allocation Rule` : 'Allocations';
                                              if (!allocationGroups[key]) allocationGroups[key] = { total: 0, items: [] };
                                              allocationGroups[key].items.push(c);
                                              allocationGroups[key].total += c.amount;
                                          });
                                      }
                                      const sortedGroups = Object.entries(allocationGroups).sort((a, b) => b[0].localeCompare(a[0]));
                                      
                                      return (
                                          <React.Fragment key={tx.id}>
                                              <tr className={`hover:bg-slate-50/80 transition-colors group ${isExpanded ? 'bg-slate-50' : ''}`}>
                                                  <td className="px-2 py-4 text-center">
                                                      {hasChildren && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleRow(tx.id); }}
                                                            className="text-slate-400 hover:text-cyan-600 transition-colors p-1"
                                                        >
                                                            {isExpanded ? <MinusCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                                        </button>
                                                      )}
                                                  </td>
                                                  <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">{tx.date}</td>
                                                  <td className="px-6 py-4">
                                                      <div className="flex items-center gap-2">
                                                          <div className={`p-1.5 rounded-full ${isIncome ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}>
                                                              {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                                          </div>
                                                          <span className="text-sm font-bold text-slate-700">{tx.description}</span>
                                                      </div>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      {cat ? (
                                                          <span 
                                                            className="text-[10px] font-bold px-2 py-1 rounded-full text-slate-600 border border-slate-200 bg-white whitespace-nowrap"
                                                            style={{borderColor: cat.color + '40'}}
                                                          >
                                                              {cat.name}
                                                          </span>
                                                      ) : (
                                                          <span className="text-[10px] italic text-slate-400">--</span>
                                                      )}
                                                  </td>
                                                  <td className={`px-6 py-4 text-right font-bold text-sm whitespace-nowrap ${isIncome ? 'text-cyan-600' : 'text-slate-800'}`}>
                                                      {isIncome ? '+' : '-'}{currencySymbol}{tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                  </td>
                                                  <td className="px-6 py-4 text-right">
                                                      <div className="flex justify-end items-center gap-2">
                                                          {isAllocated ? (
                                                            <div className="group/lock relative inline-block">
                                                                <button 
                                                                    className="text-slate-300 cursor-not-allowed p-1.5 rounded-md"
                                                                    title="Locked: Managed by Income Source"
                                                                    type="button"
                                                                >
                                                                    <Lock className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                          ) : (
                                                              <DeleteButton onDelete={() => deleteTransaction(tx.id)} />
                                                          )}
                                                      </div>
                                                  </td>
                                              </tr>
                                              
                                              {/* Expanded Details Row */}
                                              {hasChildren && isExpanded && (
                                                  <tr className="bg-slate-50">
                                                      <td colSpan={6} className="px-14 py-3">
                                                          <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-sm">
                                                              {isIncome ? (
                                                                  <div className="space-y-4">
                                                                      {sortedGroups.map(([groupName, groupData]) => (
                                                                          <div key={groupName} className="space-y-2">
                                                                              <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 pb-1 mb-2">
                                                                                  <div className="flex items-center">
                                                                                      <Layers className="w-3 h-3 mr-2" /> {groupName}
                                                                                  </div>
                                                                                  <span className="text-cyan-600 font-mono">Total: {currencySymbol}{groupData.total.toLocaleString()}</span>
                                                                              </div>
                                                                              {groupData.items.map(child => {
                                                                                  const childCat = categories.find(c => c.id === child.categoryId);
                                                                                  return (
                                                                                      <div key={child.id} className="flex justify-between items-center pl-2">
                                                                                          <span className="text-slate-600 font-medium">{childCat?.name}</span>
                                                                                          <span className="font-bold text-cyan-600">+{currencySymbol}{child.amount.toLocaleString()}</span>
                                                                                      </div>
                                                                                  );
                                                                              })}
                                                                          </div>
                                                                      ))}
                                                                  </div>
                                                              ) : (
                                                                  <>
                                                                    <div className="flex items-center text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-3 pb-2 border-b border-slate-100">
                                                                        <CornerDownRight className="w-3 h-3 mr-2" /> Funding Breakdown
                                                                    </div>
                                                                    
                                                                    <div className="space-y-2">
                                                                        {children.map(child => {
                                                                            const childCat = categories.find(c => c.id === child.categoryId);
                                                                            return (
                                                                                <div key={child.id} className="flex justify-between items-center">
                                                                                    <span className="text-slate-600 font-medium">
                                                                                      {isIncome ? childCat?.name : `From ${childCat?.name || 'Unknown'} Envelope`}
                                                                                    </span>
                                                                                    <span className={`font-bold ${isIncome ? 'text-cyan-600' : 'text-slate-700'}`}>
                                                                                        {isIncome ? '+' : '-'}{currencySymbol}{Math.abs(child.amount).toLocaleString()}
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        
                                                                        {!isIncome && remainingFromAvailable > 0.01 && (
                                                                            <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-1">
                                                                                <span className="text-slate-400 font-medium italic">From Available Balance</span>
                                                                                <span className="font-bold text-slate-400">-{currencySymbol}{remainingFromAvailable.toLocaleString()}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                  </>
                                                              )}
                                                          </div>
                                                      </td>
                                                  </tr>
                                              )}
                                          </React.Fragment>
                                      );
                                  })
                              ) : (
                                  <tr>
                                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                                          No transactions found matching your search.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      </div>
      
      {/* ... MODALS ... */}
      {/* (Including the modals in the response to ensure full file integrity) */}
      {showAddTxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">New Transaction</h3>
                      <button onClick={() => setShowAddTxModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      {/* Type Switch */}
                      <div className="flex p-1 bg-slate-100 rounded-lg">
                          <button 
                             onClick={() => { setNewTxType(TransactionType.EXPENSE); setNewTxCat(''); }}
                             className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newTxType === TransactionType.EXPENSE ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                          >
                              Expense
                          </button>
                          <button 
                             onClick={() => { setNewTxType(TransactionType.INCOME); setNewTxCat(''); }}
                             className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newTxType === TransactionType.INCOME ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500'}`}
                          >
                              Income
                          </button>
                      </div>

                      <div className="space-y-3">
                          <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                              <input type="date" value={newTxDate} onChange={e => setNewTxDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400" />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                              <input type="text" value={newTxDesc} onChange={e => setNewTxDesc(e.target.value)} placeholder="e.g. Grocery Store" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400" />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Amount</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currencySymbol}</span>
                                  <input type="number" value={newTxAmount} onChange={e => setNewTxAmount(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus:border-cyan-400" />
                              </div>
                          </div>
                          
                          <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">
                                  {newTxType === TransactionType.INCOME ? 'Source Category' : 'Expense Category'}
                              </label>
                              <select value={newTxCat} onChange={e => setNewTxCat(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400 bg-white">
                                  <option value="">-- Uncategorized --</option>
                                  {(newTxType === TransactionType.INCOME ? incomeCategories : [...expenseCategories, ...investmentCategories]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                          </div>
                      </div>

                      <button 
                        onClick={handleAddTransaction}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold mt-4 hover:bg-slate-800 transition-colors"
                      >
                          Save Transaction
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showTopUpModal && topUpCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-cyan-50">
                      <h3 className="font-bold text-cyan-900 flex items-center gap-2">
                          <PlusCircle className="w-4 h-4" /> Add Funds
                      </h3>
                      <button onClick={() => setShowTopUpModal(false)}><X className="w-5 h-5 text-cyan-700/50 hover:text-cyan-900" /></button>
                  </div>
                  <div className="p-6">
                      <p className="text-sm text-slate-500 mb-4">
                          Move money from <strong>Available to Budget</strong> into <strong>{topUpCategory.name}</strong>.
                      </p>
                      
                      <div className="mb-4 bg-slate-50 p-3 rounded-lg flex justify-between items-center border border-slate-100">
                          <span className="text-xs font-bold text-slate-400 uppercase">Available</span>
                          <span className="font-serif font-bold text-slate-800">{currencySymbol}{totalUnallocatedAvailable.toLocaleString()}</span>
                      </div>

                      <div className="mb-6">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Amount to Add</label>
                          <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-serif">{currencySymbol}</span>
                              <input 
                                  type="number" 
                                  value={topUpAmount} 
                                  onChange={(e) => setTopUpAmount(e.target.value)} 
                                  autoFocus
                                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                  placeholder="0.00"
                              />
                          </div>
                      </div>

                      <button 
                          onClick={handleTopUp}
                          disabled={!topUpAmount}
                          className={`w-full py-3 rounded-xl font-bold text-white transition-all ${!topUpAmount ? 'bg-slate-300 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-200'}`}
                      >
                          Confirm Transfer
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showOneTimeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-purple-100 flex justify-between items-center bg-purple-50">
                      <h3 className="font-bold text-purple-900 flex items-center gap-2">
                          <Coins className="w-5 h-5 text-purple-600" /> One-Time Expense
                      </h3>
                      <button onClick={() => setShowOneTimeModal(false)}><X className="w-5 h-5 text-purple-400 hover:text-purple-700" /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      <p className="text-sm text-slate-500 mb-6">
                          Log an unbudgeted expense. Funds can be taken from <strong>Available Balance</strong> or optionally pulled from existing <strong>Envelopes</strong>.
                      </p>

                      <div className="space-y-4 mb-6">
                          <div>
                             <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description</label>
                             <input 
                                 type="text" 
                                 value={oneTimeDesc} 
                                 onChange={e => setOneTimeDesc(e.target.value)} 
                                 placeholder="e.g. Car Repair"
                                 className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-400"
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount</label>
                                 <div className="relative">
                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currencySymbol}</span>
                                     <input 
                                         type="number" 
                                         value={oneTimeAmount} 
                                         onChange={e => setOneTimeAmount(e.target.value)} 
                                         placeholder="0.00"
                                         className="w-full pl-7 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-400 font-bold"
                                     />
                                 </div>
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date</label>
                                 <input 
                                     type="date" 
                                     value={oneTimeDate} 
                                     onChange={e => setOneTimeDate(e.target.value)} 
                                     className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-400"
                                 />
                              </div>
                          </div>
                      </div>

                      {(() => {
                          const expenseVal = parseFloat(oneTimeAmount) || 0;
                          const totalFunded = (Object.values(fundingSources) as number[]).reduce((a: number, b: number) => a + b, 0);
                          const remainingNeeded = Math.max(0, expenseVal - totalFunded);
                          const isCovered = remainingNeeded <= totalUnallocatedAvailable + 0.01; 
                          
                          if (expenseVal <= 0) return null;

                          return (
                              <div className="space-y-4">
                                  <div className={`border rounded-xl p-4 ${isCovered ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                      <div className="flex justify-between items-center mb-2">
                                          <span className="text-xs font-bold uppercase text-slate-500">Total Expense</span>
                                          <span className="font-bold text-slate-800">{currencySymbol}{expenseVal.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between items-center mb-2">
                                          <span className="text-xs font-bold uppercase text-slate-500">From Envelopes</span>
                                          <span className="font-bold text-slate-800">-{currencySymbol}{totalFunded.toLocaleString()}</span>
                                      </div>
                                      <div className="border-t border-slate-200/50 my-2"></div>
                                      <div className="flex justify-between items-center">
                                          <span className={`text-xs font-bold uppercase ${isCovered ? 'text-green-600' : 'text-red-600'}`}>
                                              {isCovered ? 'Deducted from Available' : 'Insufficient Available Funds'}
                                          </span>
                                          <span className={`font-bold ${isCovered ? 'text-green-700' : 'text-red-600'}`}>
                                              {currencySymbol}{remainingNeeded.toLocaleString()}
                                          </span>
                                      </div>
                                  </div>

                                  <div>
                                      <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                                          Use Envelope Funds (Optional)
                                      </h4>
                                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg p-2">
                                         {expenseStats.filter(c => c.name !== 'Other Expenses').map(cat => (
                                             <div key={cat.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                 <div className="flex items-center gap-2">
                                                     <div className="w-2 h-2 rounded-full" style={{backgroundColor: cat.color}}></div>
                                                     <div className="text-xs font-medium text-slate-700">
                                                         {cat.name} <span className="text-slate-400">({currencySymbol}{cat.remaining.toFixed(0)})</span>
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-2">
                                                     <input 
                                                         type="number"
                                                         placeholder="0"
                                                         className="w-20 text-right text-xs p-1.5 border border-slate-200 rounded outline-none focus:border-purple-400 font-medium"
                                                         value={fundingSources[cat.id] || ''}
                                                         onChange={(e) => handleOneTimeFundingChange(cat.id, e.target.value)}
                                                     />
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                  </div>
                              </div>
                          );
                      })()}
                  </div>
                  
                  <div className="p-6 pt-0">
                      <button 
                          onClick={handleCreateOneTimeExpense}
                          disabled={!oneTimeDesc || !oneTimeAmount}
                          className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg ${!oneTimeDesc || !oneTimeAmount ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'}`}
                      >
                          Record Expense
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showFillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                   <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-cyan-50">
                      <h3 className="font-bold text-cyan-900 flex items-center gap-2"><Wallet className="w-4 h-4" /> Distribute Income</h3>
                      <button onClick={() => setShowFillModal(false)}><X className="w-5 h-5 text-cyan-700/50 hover:text-cyan-900" /></button>
                  </div>
                  <div className="p-6">
                      <p className="text-slate-500 text-sm mb-6 text-center">
                          {totalUnallocatedAvailable > 0 ? (
                            <>You have <span className="font-bold text-slate-900">{currencySymbol}{totalUnallocatedAvailable.toLocaleString()}</span> available to distribute.</>
                          ) : (
                            <>No unallocated funds available.</>
                          )}
                      </p>

                      {totalUnallocatedAvailable > 0 && (
                          <div className="space-y-4">
                              {allocationDateMode === 'previous' && (
                                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex gap-3 items-start">
                                      <History className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                      <div>
                                          <p className="text-xs font-bold text-orange-700 uppercase mb-1">Previous Month Underfunded</p>
                                          <p className="text-xs text-orange-600">
                                              Short by <strong>{currencySymbol}{prevMonthStats.gap.toFixed(0)}</strong>.
                                              Applied to <strong>{getMonthName(prevMonthDate)}</strong>.
                                          </p>
                                      </div>
                                  </div>
                              )}
                              
                              {unallocatedOlderFunds > 0 && (
                                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                          <History className="w-4 h-4 text-blue-500" />
                                          <span className="text-xs font-bold text-blue-700">Apply old income to this month?</span>
                                      </div>
                                      <div className="flex bg-white rounded-lg p-0.5 border border-blue-100">
                                          <button 
                                            onClick={() => setAllocationDateMode('current')}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${allocationDateMode === 'current' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                          >
                                            Yes
                                          </button>
                                          <button 
                                            onClick={() => setAllocationDateMode('previous')}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${allocationDateMode === 'previous' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                          >
                                            No
                                          </button>
                                      </div>
                                  </div>
                              )}
                              
                              {allocationDateMode === 'current' && nextPaymentIndex === -1 && (
                                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
                                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                      <p className="text-xs text-green-700">
                                          All planned allocations for this month appear to be complete!
                                      </p>
                                  </div>
                              )}

                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  {allocationDateMode === 'previous' ? (
                                      <div className="mb-4">
                                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Allocation Strategy</label>
                                          <div className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex items-center gap-2">
                                              <Sparkles className="w-4 h-4 text-cyan-600" />
                                              <span><strong>Smart Fill:</strong> Auto-filling deficits from last month.</span>
                                          </div>
                                      </div>
                                  ) : (
                                      <>
                                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block flex justify-between">
                                              <span>Select Allocation Rule</span>
                                              {nextPaymentIndex !== -1 && !isManualSelection && (
                                                  <span className="text-cyan-600 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Auto-Selected</span>
                                              )}
                                          </label>
                                          <select 
                                             className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-cyan-500"
                                             value={selectedAllocationIndex}
                                             onChange={(e) => {
                                                 setSelectedAllocationIndex(parseInt(e.target.value));
                                                 setIsManualSelection(true);
                                             }}
                                          >
                                             {incomeSources[0]?.allocations?.map((alloc, idx) => (
                                                 <option key={idx} value={idx}>
                                                     {alloc.name || `Payment ${alloc.paymentIndex}`} ({alloc.percentage}%) {isAllocationRuleExecuted(idx) ? '✅ (Done)' : ''} {idx === nextPaymentIndex ? '(Next)' : ''}
                                                 </option>
                                             ))}
                                          </select>

                                          <div className={`mt-3 p-3 rounded-lg border flex items-start gap-2 ${isSourceMissing ? 'bg-yellow-50 border-yellow-100' : 'bg-green-50 border-green-100'}`}>
                                              {isSourceMissing ? (
                                                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                              ) : (
                                                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                              )}
                                              <div className="text-xs">
                                                  <span className={`font-bold block mb-0.5 ${isSourceMissing ? 'text-yellow-700' : 'text-green-700'}`}>
                                                      {isSourceMissing ? 'Source Not Found' : 'Linked to Income'}
                                                  </span>
                                                  <span className="text-slate-600">
                                                      {isSourceMissing 
                                                          ? 'No matching income transaction found for this sequence. Allocations will be deducted from your total available balance.'
                                                          : `Linked to income received on ${currentMonthIncomeTxs[selectedAllocationIndex]?.date || 'Unknown'}.`
                                                      }
                                                  </span>
                                              </div>
                                          </div>
                                      </>
                                  )}
                                  
                                  <div className="mt-4 flex gap-2">
                                      <button 
                                          onClick={() => setShowFillModal(false)}
                                          className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg"
                                      >
                                          Cancel
                                      </button>
                                      <button 
                                          onClick={handleDistributeIncome}
                                          className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                      >
                                          Apply Allocation
                                          {allocationDateMode === 'previous' && <History className="w-3 h-3 opacity-50" />}
                                      </button>
                                  </div>
                              </div>
                          </div>
                      )}
                      
                      {totalUnallocatedAvailable <= 0 && (
                          <div className="flex justify-center">
                              <button 
                                  onClick={() => setShowFillModal(false)}
                                  className="py-2 px-6 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                              >
                                  Close
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};