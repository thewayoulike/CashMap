import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, Category, TransactionType, Account } from '../types';
import { Upload, Plus, Wand2, ArrowDownLeft, ArrowUpRight, CheckCircle2, Loader2, Info, X, TableProperties, Edit2, Columns, SplitSquareHorizontal, Trash2, Coins, AlertTriangle, Check, CornerDownRight, Layers, PlusCircle, MinusCircle, Filter, Search, Calendar, Key, CreditCard, ArrowRightLeft, ArrowRight, Wallet, Split } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { categorizeTransaction, categorizeTransactionsBatch } from '../services/geminiService';

interface TransactionsProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  categories: Category[];
  currency: string;
  accounts: Account[];
}

interface CsvMapping {
  dateIndex: number;
  descIndex: number;
  mode: 'single' | 'split'; 
  amountIndex: number;
  debitIndex: number;
  creditIndex: number;
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
        h-8 rounded-lg transition-all duration-200 flex items-center justify-center font-bold text-[10px] uppercase tracking-wide
        ${step === 'confirm' 
          ? 'bg-red-500 text-white w-14 shadow-md' 
          : 'text-slate-400 hover:text-red-500 hover:bg-red-50 w-8'
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

export const Transactions: React.FC<TransactionsProps> = ({ transactions, setTransactions, categories, currency, accounts }) => {
  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(''); 
  const [transferToAccount, setTransferToAccount] = useState(''); // New State for Transfer
  const [newTxType, setNewTxType] = useState<TransactionType>(TransactionType.EXPENSE);

  // CSV Import Account Selection
  const [csvTargetAccount, setCsvTargetAccount] = useState('');

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  // API Key State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');

  // View State
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // --- FILTER STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL'); // 'ALL', 'UNCATEGORIZED', or CategoryID
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // --- Fund / One-Time Expense State ---
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundingTx, setFundingTx] = useState<Transaction | null>(null);
  const [fundingSources, setFundingSources] = useState<Record<string, number>>({});

  // CSV State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);
  const [csvFullData, setCsvFullData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CsvMapping>({
    dateIndex: 0,
    descIndex: 1,
    mode: 'single',
    amountIndex: 2,
    debitIndex: 2,
    creditIndex: 3
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default account on load if available
  useEffect(() => {
      if (accounts.length > 0 && !selectedAccount) {
          setSelectedAccount(accounts[0].id);
          setCsvTargetAccount(accounts[0].id);
          // Set secondary account if available for transfer
          if (accounts.length > 1) {
              setTransferToAccount(accounts[1].id);
          }
      }
  }, [accounts]);

  const currencySymbol = useMemo(() => {
    switch(currency) {
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'JPY': return '¥';
        case 'INR': return '₹';
        case 'PKR': return 'Rs';
        default: return '$';
    }
  }, [currency]);

  // Derived filtered categories for dropdown (Add Form)
  const formCategories = useMemo(() => {
      if (newTxType === TransactionType.INCOME) {
          return categories.filter(c => c.type === 'income');
      } else {
          return categories.filter(c => c.type === 'expense' || c.type === 'investment');
      }
  }, [categories, newTxType]);

  const historyMap = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach(t => {
      if (t.categoryId && t.description) {
        map.set(t.description.toLowerCase().trim(), t.categoryId);
      }
    });
    return map;
  }, [transactions]);

  // Calculate total funded for the Fund Modal to avoid repetition and type errors
  const totalFunded = useMemo(() => {
    return (Object.values(fundingSources) as number[]).reduce((a, b) => a + b, 0);
  }, [fundingSources]);

  // --- Grouping Logic (Calculated on ALL transactions first to preserve structure) ---
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

  // --- Filtering Logic (Applied to Roots) ---
  const filteredRoots = useMemo(() => {
      return roots.filter(tx => {
          // 1. Search Term
          if (searchTerm) {
              const term = searchTerm.toLowerCase();
              const matchDesc = tx.description.toLowerCase().includes(term);
              const matchAmt = tx.amount.toString().includes(term);
              if (!matchDesc && !matchAmt) return false;
          }

          // 2. Type Filter
          if (filterType !== 'ALL') {
              if (tx.type !== filterType) return false;
          }

          // 3. Category Filter
          if (filterCategory !== 'ALL') {
              if (filterCategory === 'UNCATEGORIZED') {
                  if (tx.categoryId) return false;
              } else {
                  if (tx.categoryId !== filterCategory) return false;
              }
          }

          // 4. Date Range
          if (dateStart && tx.date < dateStart) return false;
          if (dateEnd && tx.date > dateEnd) return false;

          return true;
      });
  }, [roots, searchTerm, filterType, filterCategory, dateStart, dateEnd]);

  // --- Handlers ---

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

  const handleDescriptionBlur = () => {
    if (!description || selectedCat) return;
    const matchId = historyMap.get(description.toLowerCase().trim());
    if (matchId) {
        const cat = categories.find(c => c.id === matchId);
        if (cat) {
            const isIncomeType = newTxType === TransactionType.INCOME;
            const isCatIncome = cat.type === 'income';
            if (isIncomeType === isCatIncome) {
                setSelectedCat(matchId);
            }
        }
    }
  };

  const handleAddManual = () => {
    if (!amount) return;
    if (newTxType !== TransactionType.TRANSFER && !description) return;
    
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    if (newTxType === TransactionType.TRANSFER) {
        if (!selectedAccount || !transferToAccount || selectedAccount === transferToAccount) {
            alert("Please select two different accounts.");
            return;
        }
        const accFrom = accounts.find(a => a.id === selectedAccount);
        const accTo = accounts.find(a => a.id === transferToAccount);
        const id1 = uuidv4();
        const id2 = uuidv4();
        
        const txOut: Transaction = {
            id: id1,
            date: new Date().toISOString().split('T')[0],
            description: `Transfer to ${accTo?.name}`,
            amount: amountVal,
            type: TransactionType.TRANSFER,
            accountId: selectedAccount,
            transferDirection: 'out',
            transferPeerId: id2
        };

        const txIn: Transaction = {
            id: id2,
            date: new Date().toISOString().split('T')[0],
            description: `Transfer from ${accFrom?.name}`,
            amount: amountVal,
            type: TransactionType.TRANSFER,
            accountId: transferToAccount,
            transferDirection: 'in',
            transferPeerId: id1
        };
        
        setTransactions([txOut, txIn, ...transactions]);
    } else {
        const newTx: Transaction = {
          id: uuidv4(),
          date: new Date().toISOString().split('T')[0],
          description,
          amount: amountVal,
          categoryId: selectedCat || undefined,
          type: newTxType,
          accountId: selectedAccount || undefined
        };
        setTransactions([newTx, ...transactions]);
    }
    
    setDescription('');
    setAmount('');
    setSelectedCat('');
  };

  const updateTransactionDirect = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleEditClick = (tx: Transaction) => {
      setEditingId(tx.id);
      setEditForm({ ...tx });
  };

  const handleSaveEdit = () => {
      if (!editingId) return;
      
      const original = transactions.find(t => t.id === editingId);
      if (!original) return;

      const newAmount = editForm.amount !== undefined ? editForm.amount : original.amount;

      let updatedTransactions = transactions.map(t => {
          if (t.id === editingId) {
              return { ...t, ...editForm };
          }
          return t;
      });

      if (original.amount !== newAmount && original.amount !== 0) {
          const ratio = newAmount / original.amount;
          updatedTransactions = updatedTransactions.map(t => {
              if (t.parentTransactionId === editingId) {
                  return { ...t, amount: parseFloat((t.amount * ratio).toFixed(2)) };
              }
              return t;
          });
      }

      setTransactions(updatedTransactions);
      setEditingId(null);
      setEditForm({});
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
      
      if (editingId === id) {
          setEditingId(null);
          setEditForm({});
      }
  };

  const updateCategory = (txId: string, catId: string) => {
     updateTransactionDirect(txId, { categoryId: catId });
     if (editingId !== txId) {
        setEditingId(null);
     }
  };

  const saveApiKey = () => {
      if (!tempKey.trim()) return;
      localStorage.setItem('gemini_api_key', tempKey.trim());
      setApiKey(tempKey.trim());
      setShowKeyModal(false);
  };

  const openFundModal = (tx: Transaction) => {
      setFundingTx(tx);
      
      // Load existing funding if any
      const children = transactions.filter(t => t.parentTransactionId === tx.id);
      const existingSources: Record<string, number> = {};
      
      children.forEach(c => {
          // Identify source transactions (Negative Income withdrawn from envelope)
          if (c.type === TransactionType.INCOME && c.amount < 0 && c.categoryId) {
              const absAmount = Math.abs(c.amount);
              existingSources[c.categoryId] = (existingSources[c.categoryId] || 0) + absAmount;
          }
      });
      
      setFundingSources(existingSources);
      setShowFundModal(true);
  };

  const handleFundingChange = (catId: string, value: string) => {
      const val = parseFloat(value) || 0;
      setFundingSources(prev => ({ ...prev, [catId]: val }));
  };

  const executeFunding = () => {
      if (!fundingTx || !fundingTx.categoryId) return;
      
      // 1. Remove ALL existing funding children for this transaction (Clean Slate)
      const cleanTransactions = transactions.filter(t => t.parentTransactionId !== fundingTx.id);
      
      const newTxs: Transaction[] = [];
      const date = fundingTx.date;
      
      Object.entries(fundingSources).forEach(([sourceCatId, amountVal]) => {
          const amount = amountVal as number;
          if (amount <= 0) return;
          const sourceCat = categories.find(c => c.id === sourceCatId);
          
          // 1. Take from Source
          newTxs.push({
              id: uuidv4(),
              date,
              description: `Covering: ${fundingTx.description}`,
              amount: -amount,
              categoryId: sourceCatId,
              type: TransactionType.INCOME,
              parentTransactionId: fundingTx.id
          });
          
          // 2. Give to Target
          newTxs.push({
              id: uuidv4(),
              date,
              description: `Funded from: ${sourceCat?.name}`,
              amount: amount,
              categoryId: fundingTx.categoryId, // Target
              type: TransactionType.INCOME,
              parentTransactionId: fundingTx.id
          });
      });
      
      setTransactions([...cleanTransactions, ...newTxs]);
      setShowFundModal(false);
      setFundingTx(null);
  };


  // CSV Helpers
  const parseDate = (str: string): string => {
    if (!str) return new Date().toISOString().split('T')[0];
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
    const parts = str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (parts) {
        const p1 = parseInt(parts[1]); 
        const p2 = parseInt(parts[2]);
        const y = parts[3];
        return `${y}-${p2.toString().padStart(2, '0')}-${p1.toString().padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      const parsedData = lines.map(line => {
         return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
      });

      if (parsedData.length > 0) {
        setCsvFullData(parsedData);
        setCsvPreviewRows(parsedData.slice(0, 5));
        
        // ... Auto-detection logic (existing) ...
        const firstRow = parsedData[0] || [];
        const dateIdx = firstRow.findIndex(c => c.toLowerCase().includes('date'));
        const descIdx = firstRow.findIndex(c => c.toLowerCase().includes('desc') || c.toLowerCase().includes('detail'));
        const debitIdx = firstRow.findIndex(c => c.toLowerCase().includes('debit') || c.toLowerCase().includes('dr') || c.toLowerCase().includes('withdrawal'));
        const creditIdx = firstRow.findIndex(c => c.toLowerCase().includes('credit') || c.toLowerCase().includes('cr') || c.toLowerCase().includes('deposit'));
        const amountIdx = firstRow.findIndex(c => c.toLowerCase().includes('amount'));

        let mode: 'single' | 'split' = 'single';
        if (debitIdx !== -1 && creditIdx !== -1 && debitIdx !== creditIdx) {
            mode = 'split';
        }

        setMapping({
            dateIndex: dateIdx !== -1 ? dateIdx : 0,
            descIndex: descIdx !== -1 ? descIdx : 1,
            mode: mode,
            amountIndex: amountIdx !== -1 ? amountIdx : 2,
            debitIndex: debitIdx !== -1 ? debitIdx : 2,
            creditIndex: creditIdx !== -1 ? creditIdx : 3
        });
        setShowImportModal(true);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
      const newTxs: Transaction[] = [];
      let autoMatchedCount = 0;
      
      csvFullData.forEach((row, idx) => {
          if (row.length < 2) return;
          const rawDate = row[mapping.dateIndex];
          const rawDesc = row[mapping.descIndex];
          if (!rawDate || !rawDesc) return; 

          const dateStr = parseDate(rawDate);
          if (rawDate.toLowerCase().includes('date') && idx === 0) return; 

          let amountVal = 0;
          let type = TransactionType.EXPENSE;

          if (mapping.mode === 'single') {
              const rawAmt = row[mapping.amountIndex];
              if (!rawAmt) return;
              const cleanAmt = parseFloat(rawAmt.replace(/[^0-9.-]/g, ''));
              if (isNaN(cleanAmt)) return; 
              amountVal = Math.abs(cleanAmt);
              type = cleanAmt < 0 ? TransactionType.EXPENSE : (cleanAmt > 0 ? TransactionType.INCOME : TransactionType.EXPENSE);
          } else {
              const debitRaw = row[mapping.debitIndex] || '0';
              const creditRaw = row[mapping.creditIndex] || '0';
              const debitVal = parseFloat(debitRaw.replace(/[^0-9.-]/g, ''));
              const creditVal = parseFloat(creditRaw.replace(/[^0-9.-]/g, ''));

              if (isNaN(debitVal) && isNaN(creditVal)) return;

              if (debitVal > 0) {
                  amountVal = debitVal;
                  type = TransactionType.EXPENSE;
              } else if (creditVal > 0) {
                  amountVal = creditVal;
                  type = TransactionType.INCOME;
              } else {
                  return; 
              }
          }

          const matchedCatId = historyMap.get(rawDesc.toLowerCase().trim());
          if (matchedCatId) autoMatchedCount++;

          newTxs.push({
            id: uuidv4(),
            date: dateStr,
            description: rawDesc,
            amount: amountVal,
            type: type,
            categoryId: matchedCatId || undefined,
            accountId: csvTargetAccount || undefined 
          });
      });

      setTransactions([...newTxs, ...transactions]);
      setShowImportModal(false);
      alert(`Successfully imported ${newTxs.length} transactions.\n✨ ${autoMatchedCount} matched existing categories.`);
  };

  const autoCategorizeSingle = async (txId: string, desc: string) => {
    if (!apiKey) {
        setShowKeyModal(true);
        return;
    }
    setIsProcessing(true);
    const catId = await categorizeTransaction(apiKey, desc, categories);
    setIsProcessing(false);
    if (catId) updateCategory(txId, catId);
    else alert("AI couldn't confidently categorize this. Please select manually.");
  };

  const autoCategorizeAll = async () => {
    if (!apiKey) {
        setShowKeyModal(true);
        return;
    }
    const uncategorized = transactions.filter(t => !t.categoryId && t.type === TransactionType.EXPENSE);
    if (uncategorized.length === 0) return;
    setBulkProcessing(true);
    const uniqueDescs = Array.from(new Set(uncategorized.map(t => t.description))) as string[];
    const matches = await categorizeTransactionsBatch(apiKey, uniqueDescs, categories);
    setTransactions(prev => prev.map(t => {
        if (!t.categoryId && matches[t.description]) {
            return { ...t, categoryId: matches[t.description] };
        }
        return t;
    }));
    setBulkProcessing(false);
  };

  const uncategorizedCount = transactions.filter(t => !t.categoryId && t.type === TransactionType.EXPENSE).length;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setFilterCategory('ALL');
    setDateStart('');
    setDateEnd('');
  };

  const hasActiveFilters = searchTerm || filterType !== 'ALL' || filterCategory !== 'ALL' || dateStart || dateEnd;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Import Modal */}
      {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                              <TableProperties className="w-5 h-5 text-blue-600" /> Import & Map CSV
                          </h3>
                      </div>
                      <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-8">
                       <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                           <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                               <CreditCard className="w-5 h-5" />
                           </div>
                           <div className="flex-1">
                               <label className="text-xs font-bold text-blue-800 uppercase block mb-1">Link to Account</label>
                               <select
                                  value={csvTargetAccount}
                                  onChange={(e) => setCsvTargetAccount(e.target.value)}
                                  className="w-full md:w-64 px-3 py-2 text-sm border border-blue-200 rounded-lg outline-none focus:border-blue-400 bg-white"
                               >
                                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                               </select>
                           </div>
                       </div>

                       {/* ... Existing CSV UI Logic ... */}
                        <p className="text-sm text-gray-500">
                            Verify your CSV column mapping below. 
                        </p>
                        {/* ... Existing CSV UI Logic ... */}
                        <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button 
                            onClick={executeImport}
                            className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all transform hover:scale-[1.02]"
                        >
                            Process Import
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Fund Transaction Modal */}
      {showFundModal && fundingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                <div className="px-6 py-4 border-b border-purple-100 flex justify-between items-center bg-purple-50">
                    <h3 className="font-bold text-purple-900 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-purple-600" /> Fund Transaction
                    </h3>
                    <button onClick={() => setShowFundModal(false)}><X className="w-5 h-5 text-purple-400 hover:text-purple-700" /></button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-slate-500 mb-6">
                        Cover this expense by moving funds from other envelopes.
                    </p>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-slate-500">Expense Amount</span>
                            <span className="font-bold text-slate-800">{currencySymbol}{fundingTx.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-slate-500">Funded from Envelopes</span>
                            <span className="font-bold text-purple-600">
                                {totalFunded > 0 ? '-' : ''}{currencySymbol}{totalFunded.toLocaleString()}
                            </span>
                        </div>
                        <div className="border-t border-slate-200/50"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-slate-500">Remaining to Pay (Pool)</span>
                            <span className={`font-bold ${Math.max(0, fundingTx.amount - totalFunded) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {currencySymbol}{Math.max(0, fundingTx.amount - totalFunded).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                        Select Source Envelopes
                    </h4>
                    <div className="space-y-2 border border-slate-100 rounded-lg p-2 max-h-60 overflow-y-auto">
                        {categories.filter(c => c.type === 'expense' && c.id !== fundingTx.categoryId).map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: cat.color}}></div>
                                    <div className="text-xs font-medium text-slate-700">
                                        {cat.name} 
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number"
                                        placeholder="0"
                                        className="w-20 text-right text-xs p-1.5 border border-slate-200 rounded outline-none focus:border-purple-400 font-medium"
                                        value={fundingSources[cat.id] || ''}
                                        onChange={(e) => handleFundingChange(cat.id, e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 pt-0 bg-white border-t border-slate-50">
                    <button 
                        onClick={executeFunding}
                        disabled={!fundingTx.categoryId}
                        className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg ${!fundingTx.categoryId ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'}`}
                    >
                        Save Funding
                    </button>
                    {!fundingTx.categoryId && (
                        <p className="text-xs text-center text-red-500 mt-2">Transaction must be categorized to receive funds.</p>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* API Key Modal - Truncated for brevity */}
      {/* ... */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Add Transaction Form (Left Column) */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
                <h3 className="font-serif font-bold text-slate-800 mb-6 flex items-center gap-2 text-xl">
                    <Plus className="w-5 h-5 text-cyan-600" />
                    New Entry
                </h3>
                
                <div className="space-y-5">
                      {/* Type Switch */}
                      <div className="flex p-1 bg-slate-100 rounded-lg mb-2">
                          <button 
                             onClick={() => { setNewTxType(TransactionType.EXPENSE); setSelectedCat(''); }}
                             className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newTxType === TransactionType.EXPENSE ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                          >
                              Expense
                          </button>
                          <button 
                             onClick={() => { setNewTxType(TransactionType.INCOME); setSelectedCat(''); }}
                             className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newTxType === TransactionType.INCOME ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500'}`}
                          >
                              Income
                          </button>
                          <button 
                             onClick={() => { setNewTxType(TransactionType.TRANSFER); setSelectedCat(''); }}
                             className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newTxType === TransactionType.TRANSFER ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                          >
                              Transfer
                          </button>
                      </div>

                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wide">Date</label>
                        <input
                        type="date"
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 bg-slate-50 focus:bg-white transition-all text-sm font-medium text-slate-700"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {newTxType === TransactionType.TRANSFER ? (
                        <>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wide">From Account</label>
                                <select
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-sm font-medium text-slate-700"
                                >
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-center -my-2">
                                <ArrowDownLeft className="w-5 h-5 text-indigo-300" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wide">To Account</label>
                                <select
                                    value={transferToAccount}
                                    onChange={(e) => setTransferToAccount(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-sm font-medium text-slate-700"
                                >
                                    <option value="">-- Select Account --</option>
                                    {accounts.filter(a => a.id !== selectedAccount).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wide">Bank Account</label>
                                <select
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 bg-white text-sm font-medium text-slate-700"
                                >
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wide">Description</label>
                                <input
                                type="text"
                                placeholder="e.g. Whole Foods Market"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={handleDescriptionBlur}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 transition-all text-sm font-medium"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wide">Amount</label>
                        <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-400 font-serif font-medium">{currencySymbol}</span>
                            <input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 transition-all font-serif font-bold text-slate-800"
                            />
                        </div>
                    </div>
                    
                    {newTxType !== TransactionType.TRANSFER && (
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wide">
                                {newTxType === TransactionType.INCOME ? 'Source Category' : 'Expense Category'}
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedCat}
                                    onChange={(e) => setSelectedCat(e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 appearance-none bg-white transition-all text-sm font-medium ${selectedCat ? 'text-slate-900 border-cyan-200 bg-cyan-50/30' : 'text-slate-500 border-slate-200'}`}
                                >
                                    <option value="">-- Uncategorized --</option>
                                    {formCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <ArrowDownLeft className="w-4 h-4 text-slate-400 rotate-[-45deg]" />
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleAddManual}
                        disabled={!amount || (newTxType !== TransactionType.TRANSFER && !description)}
                        className={`w-full py-3.5 rounded-lg font-bold shadow-lg transition-all flex items-center justify-center transform hover:scale-[1.01] uppercase tracking-wide text-xs ${(!amount || (newTxType !== TransactionType.TRANSFER && !description)) ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : newTxType === TransactionType.TRANSFER ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-100'}`}
                    >
                        {newTxType === TransactionType.TRANSFER ? 'Execute Transfer' : 'Add Transaction'}
                    </button>
                    
                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                        <div className="relative flex justify-center"><span className="px-3 bg-white text-[10px] font-bold text-slate-300 uppercase tracking-widest">Or Import</span></div>
                    </div>

                    <label className="flex flex-col items-center justify-center w-full h-24 border border-slate-200 border-dashed rounded-lg cursor-pointer bg-slate-50/50 hover:bg-cyan-50/50 hover:border-cyan-300 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-6 h-6 mb-2 text-slate-300 group-hover:text-cyan-500 transition-colors" />
                        <p className="text-[10px] text-slate-400 text-center group-hover:text-cyan-600 font-bold uppercase tracking-wide">Upload CSV Statement</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>
        </div>

        {/* Transaction List (Right Column) */}
        <div className="lg:col-span-2 space-y-4">
            
            {/* --- RESTORED FILTER TOOLBAR --- */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder="Search description or amount..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-400"
                        />
                    </div>
                    <div className="flex gap-2">
                         {/* Type Filter */}
                         <select 
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-400 bg-white"
                         >
                             <option value="ALL">All Types</option>
                             <option value={TransactionType.EXPENSE}>Expenses</option>
                             <option value={TransactionType.INCOME}>Income</option>
                             <option value={TransactionType.TRANSFER}>Transfers</option>
                         </select>

                         {/* Category Filter */}
                         <select 
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-400 bg-white max-w-[150px]"
                         >
                             <option value="ALL">All Categories</option>
                             <option value="UNCATEGORIZED">Uncategorized</option>
                             {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                        <div className="relative flex-1 min-w-[140px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">From</span>
                            <input 
                                type="date" 
                                value={dateStart}
                                onChange={(e) => setDateStart(e.target.value)}
                                className="w-full pl-12 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:border-cyan-400 outline-none"
                            />
                        </div>
                        <div className="relative flex-1 min-w-[140px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">To</span>
                            <input 
                                type="date" 
                                value={dateEnd}
                                onChange={(e) => setDateEnd(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:border-cyan-400 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {hasActiveFilters && (
                            <button 
                                onClick={clearFilters}
                                className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                        <button 
                            onClick={autoCategorizeAll}
                            disabled={uncategorizedCount === 0 || bulkProcessing}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${uncategorizedCount > 0 ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                        >
                            {bulkProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            {bulkProcessing ? 'Categorizing...' : `Auto-Categorize (${uncategorizedCount})`}
                        </button>
                    </div>
                </div>
            </div>
             
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                {filteredRoots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-300">
                        <div className="bg-slate-50 p-6 rounded-full mb-4">
                            {hasActiveFilters ? <Filter className="w-8 h-8 opacity-50 text-cyan-400" /> : <Info className="w-8 h-8 opacity-50" />}
                        </div>
                        <p className="font-medium text-slate-400">{hasActiveFilters ? 'No transactions match filters' : 'No transactions yet'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="divide-y divide-slate-50 min-w-[600px] md:min-w-0">
                            {filteredRoots.map(tx => {
                            const category = categories.find(c => c.id === tx.categoryId);
                            const account = accounts.find(a => a.id === tx.accountId);
                            const isIncome = tx.type === TransactionType.INCOME;
                            const isExpense = tx.type === TransactionType.EXPENSE;
                            const isTransfer = tx.type === TransactionType.TRANSFER;
                            
                            const children = childrenMap.get(tx.id) || [];
                            const hasChildren = children.length > 0;
                            const isExpanded = expandedRows.has(tx.id);
                            
                            const isEditing = editingId === tx.id;

                            if (isEditing) {
                                return (
                                   <div key={tx.id} className="bg-blue-50/30 border-b border-slate-100">
                                       <div className="flex flex-col md:flex-row items-center gap-2 p-4">
                                           <div className="hidden md:block w-6"></div>
                                           <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                               <input 
                                                   type="date" 
                                                   value={editForm.date || ''} 
                                                   onChange={e => setEditForm({...editForm, date: e.target.value})} 
                                                   className="w-full px-3 py-2 border border-blue-200 rounded bg-white text-sm outline-none focus:border-blue-400"
                                               />
                                               <input 
                                                   type="text" 
                                                   value={editForm.description || ''} 
                                                   onChange={e => setEditForm({...editForm, description: e.target.value})} 
                                                   className="w-full px-3 py-2 border border-blue-200 rounded bg-white text-sm outline-none focus:border-blue-400"
                                                   placeholder="Description"
                                               />
                                               <select 
                                                   value={editForm.categoryId || ''} 
                                                   onChange={e => setEditForm({...editForm, categoryId: e.target.value})}
                                                   className="w-full px-3 py-2 border border-blue-200 rounded bg-white text-sm outline-none focus:border-blue-400"
                                               >
                                                   <option value="">Uncategorized</option>
                                                   {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                               </select>
                                               <div className="relative w-full">
                                                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{currencySymbol}</span>
                                                   <input 
                                                       type="number" 
                                                       value={editForm.amount || ''} 
                                                       onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})} 
                                                       className="w-full pl-6 px-3 py-2 border border-blue-200 rounded bg-white text-sm outline-none focus:border-blue-400 text-right font-medium"
                                                   />
                                               </div>
                                           </div>
                                           <div className="w-full md:w-28 flex justify-end gap-2 mt-2 md:mt-0">
                                               <button onClick={handleSaveEdit} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors flex-1 md:flex-none flex justify-center">
                                                   <CheckCircle2 className="w-4 h-4" />
                                               </button>
                                               <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors flex-1 md:flex-none flex justify-center">
                                                   <X className="w-4 h-4" />
                                               </button>
                                           </div>
                                       </div>
                                   </div>
                                )
                            }

                            return (
                                <div key={tx.id}>
                                    {/* Main Parent Row */}
                                    <div className="group flex items-center gap-3 p-5 hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 relative">
                                        
                                        {/* Expansion Toggle */}
                                        <div className="w-6 flex-shrink-0 flex justify-center">
                                            {hasChildren && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleRow(tx.id); }}
                                                    className="text-slate-400 hover:text-cyan-600 transition-colors"
                                                >
                                                    {isExpanded ? <MinusCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>

                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${
                                            isTransfer ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                                            isExpense ? 'bg-white border-slate-200 text-slate-400' : 
                                            'bg-cyan-50 border-cyan-100 text-cyan-600'
                                        }`}>
                                            {isTransfer ? <ArrowRightLeft className="w-4 h-4" /> :
                                             isExpense ? <ArrowUpRight className="w-4 h-4" /> : 
                                             <ArrowDownLeft className="w-4 h-4" />}
                                        </div>

                                        {/* Description & Account */}
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="font-bold text-slate-800 text-sm truncate" title={tx.description}>{tx.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[11px] text-slate-400 font-medium font-mono">{tx.date}</p>
                                                {account && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                                        <CreditCard className="w-2.5 h-2.5" /> {account.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Category Column */}
                                        <div className="w-48 flex justify-end">
                                            <div className="relative flex items-center justify-end gap-2">
                                                 {isTransfer ? (
                                                     <span className="text-[10px] font-bold px-2 py-1 rounded-full text-indigo-600 border border-indigo-100 bg-indigo-50 whitespace-nowrap">
                                                         Transfer
                                                     </span>
                                                 ) : tx.categoryId ? (
                                                        <div className="group/chip flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: category?.color}}></div>
                                                            <span className="text-[11px] font-bold text-slate-600 truncate max-w-[100px] tracking-wide">{category?.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] italic text-slate-300">Uncategorized</span>
                                                    )
                                                 }
                                            </div>
                                        </div>

                                        {/* Amount Column */}
                                        <div className={`w-32 text-right font-serif font-bold text-sm tabular-nums ${
                                            isTransfer ? (tx.transferDirection === 'in' ? 'text-indigo-600' : 'text-slate-800') :
                                            isExpense ? 'text-slate-900' : 'text-cyan-600'
                                        }`}>
                                            {isExpense || (isTransfer && tx.transferDirection === 'out') ? '-' : '+'}{currencySymbol}{tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="w-28 flex justify-end items-center gap-1 z-50 flex-shrink-0 relative">
                                             {!isTransfer && (
                                                <>
                                                 {isExpense && tx.categoryId && (
                                                    <button 
                                                        onClick={() => openFundModal(tx)}
                                                        className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                                        title="Fund from Envelopes"
                                                    >
                                                        <Coins className="w-4 h-4" />
                                                    </button>
                                                 )}
                                                 <button 
                                                    onClick={() => handleEditClick(tx)}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all"
                                                    title="Edit Transaction"
                                                 >
                                                     <Edit2 className="w-4 h-4" />
                                                 </button>
                                                </>
                                             )}
                                             <DeleteButton onDelete={() => deleteTransaction(tx.id)} />
                                        </div>
                                    </div>

                                    {/* Nested Children (Details Panel) */}
                                    {isExpanded && hasChildren && (
                                        <div className="bg-slate-50/50 border-b border-slate-100">
                                            {/* Header for group */}
                                            {isIncome ? (
                                                 <div className="px-16 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 flex items-center gap-2 border-b border-slate-100">
                                                     <Split className="w-3 h-3" /> Allocations
                                                 </div>
                                            ) : (
                                                 <div className="px-16 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 flex items-center gap-2 border-b border-slate-100">
                                                     <Layers className="w-3 h-3" /> Funding Sources
                                                 </div>
                                            )}
                                            
                                            {/* List */}
                                            {children.map(child => {
                                                 const childCat = categories.find(c => c.id === child.categoryId);
                                                 // Filtering Logic for Cleaner UI:
                                                 // For expense funding: We have (-X from Source) and (+X to Target).
                                                 // We only show (-X from Source) to show where money came from.
                                                 
                                                 let shouldShow = true;
                                                 if (isExpense) {
                                                     if (child.amount > 0) shouldShow = false;
                                                 }
                                                 
                                                 if (!shouldShow) return null;
                                                 
                                                 return (
                                                     <div key={child.id} className="flex items-center gap-3 py-3 pl-16 pr-5 hover:bg-slate-100/50 transition-colors border-b border-slate-100/50 last:border-0">
                                                         <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                                                             <CornerDownRight className="w-3 h-3" />
                                                         </div>
                                                         
                                                         <div className="flex-1">
                                                             <p className="text-xs font-bold text-slate-700">{child.description}</p>
                                                             {childCat && (
                                                                 <div className="flex items-center gap-1 mt-0.5">
                                                                     <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: childCat.color}}></div>
                                                                     <span className="text-[10px] text-slate-500">{childCat.name}</span>
                                                                 </div>
                                                             )}
                                                         </div>
                                                         
                                                         <div className={`text-sm font-bold ${child.amount < 0 ? 'text-slate-600' : 'text-cyan-600'}`}>
                                                             {currencySymbol}{Math.abs(child.amount).toLocaleString()}
                                                         </div>
                                                     </div>
                                                 )
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}