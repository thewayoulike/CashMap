import React, { useState, useMemo } from 'react';
import { Category, ScheduledBudgetChange, Transaction, TransactionType, CategoryType, IncomeSource } from '../types';
import { Plus, Trash2, RefreshCw, CalendarClock, Calendar, HelpCircle, Wallet, Edit2, TrendingUp, PiggyBank, ArrowDownLeft, Split, Lock, History } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface BudgetManagerProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  currency: string;
  transactions: Transaction[];
  incomeSources: IncomeSource[];
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ categories, setCategories, currency, transactions, incomeSources }) => {
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  
  const [newCatName, setNewCatName] = useState('');
  const [newCatLimit, setNewCatLimit] = useState('');
  const [newCatStartDate, setNewCatStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleAmount, setScheduleAmount] = useState('');

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

  // Filter categories based on active tab and hide "hardcore" default categories
  const displayedCategories = useMemo(() => {
      return categories.filter(c => {
          // Check for correct tab type
          if ((c.type || 'expense') !== activeTab) return false;

          // Hide Hardcoded/System Categories
          const isHardcoded = 
            c.id === 'cat_default_other' || 
            c.id === 'cat_default_transfer' ||
            c.name.toLowerCase() === 'other expenses (one time)' || 
            c.name.toLowerCase() === 'transfers' ||
            c.name.toLowerCase() === 'other expenses';
            
          return !isHardcoded;
      });
  }, [categories, activeTab]);

  const getCurrentMonthlyBudget = (cat: Category) => {
    const today = new Date().toISOString().split('T')[0];
    if (cat.scheduledChanges && cat.scheduledChanges.length > 0) {
        const activeChange = [...cat.scheduledChanges]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .find(change => change.date <= today);
        
        if (activeChange) {
            return { amount: activeChange.amount, isScheduled: true, activeChangeId: activeChange.id };
        }
    }
    return { amount: cat.monthlyBudget, isScheduled: false, activeChangeId: null };
  };

  const getCalculatedBalance = (cat: Category) => {
      const income = transactions
          .filter(t => t.categoryId === cat.id && t.type === TransactionType.INCOME)
          .reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions
          .filter(t => t.categoryId === cat.id && t.type === TransactionType.EXPENSE)
          .reduce((sum, t) => sum + t.amount, 0);
      
      return cat.rollover + income - expense;
  };

  const addCategory = () => {
    if (!newCatName) return;
    const newCategory: Category = {
      id: uuidv4(),
      name: newCatName,
      type: activeTab,
      monthlyBudget: parseFloat(newCatLimit) || 0,
      rollover: 0,
      allocationRule: 0, 
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      startDate: newCatStartDate,
      scheduledChanges: []
    };
    setCategories([...categories, newCategory]);
    setNewCatName('');
    setNewCatLimit('');
    setNewCatStartDate(new Date().toISOString().split('T')[0]);
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const updateCategory = (id: string, field: keyof Category, value: any) => {
    setCategories(categories.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const resetRollovers = () => {
    if(confirm("Reset all 'Start' balances for this view to 0?")) {
      const idsToReset = displayedCategories.map(c => c.id);
      setCategories(categories.map(c => idsToReset.includes(c.id) ? {...c, rollover: 0} : c));
    }
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setScheduleDate('');
      setScheduleAmount('');
    }
  };

  const addScheduledChange = (catId: string) => {
    if (!scheduleDate || !scheduleAmount) return;
    const category = categories.find(c => c.id === catId);
    if (!category) return;

    const newChange: ScheduledBudgetChange = {
      id: uuidv4(),
      date: scheduleDate,
      amount: parseFloat(scheduleAmount)
    };

    const updatedChanges = [...(category.scheduledChanges || []), newChange];
    updateCategory(catId, 'scheduledChanges', updatedChanges);
    setScheduleDate('');
    setScheduleAmount('');
  };

  const removeScheduledChange = (catId: string, changeId: string) => {
    const category = categories.find(c => c.id === catId);
    if (!category || !category.scheduledChanges) return;

    const updatedChanges = category.scheduledChanges.filter(c => c.id !== changeId);
    updateCategory(catId, 'scheduledChanges', updatedChanges);
  };

  const allocations = incomeSources[0]?.allocations || [];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-800">Budget & Categories</h2>
          <div className="flex p-1 bg-gray-100 rounded-lg">
             <button 
                onClick={() => setActiveTab('expense')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'expense' ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                 <TrendingUp className="w-4 h-4" /> Expenses
             </button>
             <button 
                onClick={() => setActiveTab('investment')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'investment' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                 <PiggyBank className="w-4 h-4" /> Investments
             </button>
             <button 
                onClick={() => setActiveTab('income')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'income' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                 <ArrowDownLeft className="w-4 h-4" /> Income Sources
             </button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
             <button onClick={resetRollovers} className="text-xs text-gray-400 hover:text-red-500 flex items-center transition-colors">
                <RefreshCw className="w-3 h-3 mr-1" /> Reset Starts
             </button>
        </div>

        {/* Add New */}
        <div className="flex flex-col xl:flex-row gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">
                {activeTab === 'income' ? 'Source Name' : 'Category Name'}
            </label>
            <input
              type="text"
              placeholder={activeTab === 'income' ? 'e.g. Consulting Side Gig' : 'e.g. Food'}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 outline-none transition-all"
            />
          </div>
          
          <div className="w-full xl:w-40">
             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Start Date</label>
             <input
               type="date"
               value={newCatStartDate}
               onChange={(e) => setNewCatStartDate(e.target.value)}
               className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 outline-none transition-all"
             />
          </div>

          <div className="relative w-full xl:w-40">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">
                 {activeTab === 'income' ? 'Est. Monthly' : 'Monthly Target'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newCatLimit}
                  onChange={(e) => setNewCatLimit(e.target.value)}
                  className="w-full px-4 py-2 pl-7 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={addCategory}
              className={`w-full xl:w-auto text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center h-[42px] ${
                  activeTab === 'income' ? 'bg-purple-600 hover:bg-purple-700' : 
                  activeTab === 'investment' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  'bg-cyan-600 hover:bg-cyan-700'
              }`}
            >
              <Plus className="w-5 h-5 mr-1" /> Add
            </button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {displayedCategories.length === 0 && (
            <p className="text-center text-gray-400 py-8">
                {activeTab === 'expense' 
                    ? 'No editable expense categories. (System categories are hidden)' 
                    : `No ${activeTab} categories defined yet.`}
            </p>
          )}

          {/* Desktop Headers */}
          {displayedCategories.length > 0 && (
            <div className="hidden md:flex items-center gap-4 px-4 pb-2">
               <div className="w-4"></div>
               <div className="flex-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Name</div>
               <div className="w-56 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                   {activeTab === 'income' ? 'Estimated' : 'Target'}
               </div>
               <div className="w-40 flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide group relative cursor-help">
                 {activeTab === 'income' ? 'Total Received' : 'Current Balance'}
                 <HelpCircle className="w-3 h-3 text-gray-400" />
               </div>
               <div className="w-20"></div>
            </div>
          )}

          {displayedCategories.map((cat) => {
            const { amount: currentBudget, isScheduled } = getCurrentMonthlyBudget(cat);
            const liveBalance = getCalculatedBalance(cat);
            
            // Income categories display just positive income usually, while expense/invest calculate remainder
            const displayBalance = activeTab === 'income' 
                ? transactions.filter(t => t.categoryId === cat.id && t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0)
                : liveBalance;

            return (
            <div key={cat.id} className="flex flex-col bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all">
              {/* Main Row */}
              <div className="flex flex-col md:flex-row items-center gap-4 p-4">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></div>
                
                <div className="flex-1 w-full relative group/edit">
                  <label className="block md:hidden text-xs text-gray-400 uppercase font-semibold mb-1">Name</label>
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => updateCategory(cat.id, 'name', e.target.value)}
                    className="w-full font-medium text-gray-800 px-2 py-1.5 rounded border border-transparent bg-transparent hover:bg-gray-50 hover:border-gray-200 focus:bg-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50 outline-none transition-all"
                  />
                  <Edit2 className="w-3 h-3 text-gray-300 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/edit:opacity-100 pointer-events-none" />
                </div>

                <div className="w-full md:w-56 relative flex flex-col justify-center">
                  <label className="block md:hidden text-xs text-gray-400 uppercase font-semibold mb-1">
                      {isScheduled ? 'Current Target' : 'Base Target'}
                  </label>
                  
                  {/* Read-Only Target Display - Forces use of Schedule */}
                  <div 
                     className="flex items-center group/input relative cursor-pointer"
                     onClick={() => toggleExpand(cat.id)}
                     title="To change the budget amount, please use the Schedule feature"
                  >
                    <span className={`text-gray-500 mr-1 ${isScheduled ? 'text-cyan-500' : ''}`}>{currencySymbol}</span>
                    
                    <span className={`text-lg font-bold px-2 py-1 ${isScheduled ? 'text-cyan-700' : 'text-gray-800'}`}>
                        {currentBudget.toLocaleString()}
                    </span>

                    {isScheduled ? (
                        <div className="flex items-center ml-2 whitespace-nowrap" title="Scheduled Budget Active">
                             <CalendarClock className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                        </div>
                    ) : (
                         <Lock className="w-3 h-3 text-gray-300 ml-2 opacity-50 group-hover:text-cyan-500 group-hover:opacity-100 transition-all" />
                    )}
                  </div>
                </div>

                 <div className="w-full md:w-40 relative flex flex-col justify-center">
                  <label className="block md:hidden text-xs text-gray-400 uppercase font-semibold mb-1">Current Balance</label>
                  <div className="flex items-center gap-2">
                      <div className={`text-sm font-bold ${activeTab === 'income' ? 'text-purple-600' : (displayBalance < 0 ? 'text-red-500' : 'text-cyan-600')}`}>
                          {displayBalance < 0 ? '-' : ''}{currencySymbol}{Math.abs(displayBalance).toLocaleString()}
                      </div>
                      
                      {activeTab !== 'income' && (
                        <div className="flex items-center bg-gray-50 rounded px-1 ml-2 border border-gray-100 focus-within:border-cyan-300 focus-within:ring-2 focus-within:ring-cyan-50 transition-all" title="Set Starting Balance">
                            <span className="text-[9px] text-gray-400 uppercase font-bold mr-1">Start:</span>
                            <input
                                type="number"
                                value={cat.rollover}
                                onChange={(e) => updateCategory(cat.id, 'rollover', parseFloat(e.target.value) || 0)}
                                className="w-12 text-xs bg-transparent outline-none text-gray-600 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                      )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {activeTab !== 'income' && (
                    <button
                        onClick={() => toggleExpand(cat.id)}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${expandedId === cat.id ? 'bg-cyan-50 text-cyan-600' : 'text-gray-400 hover:text-cyan-500 hover:bg-gray-50'}`}
                        title="Configure Strategy & Schedule"
                    >
                        <CalendarClock className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => removeCategory(cat.id)}
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Expanded Panel (Schedule + Funding Strategy) */}
              {expandedId === cat.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 ml-0 md:ml-8 mt-2 space-y-6">
                    
                    {/* Funding Strategy Section */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center border-b border-gray-200 pb-2">
                           <Split className="w-3 h-3 mr-1" /> Funding Strategy
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-400 font-semibold block mb-1">Source Payment</label>
                                <select 
                                    value={cat.linkedPaymentIndex || 0}
                                    onChange={(e) => updateCategory(cat.id, 'linkedPaymentIndex', parseInt(e.target.value) || undefined)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-sm text-gray-700 outline-none focus:border-cyan-400"
                                >
                                    <option value="0">Standard (Follow Income Splits)</option>
                                    {allocations.map(alloc => (
                                        <option key={alloc.paymentIndex} value={alloc.paymentIndex}>
                                            {alloc.name || `Payment ${alloc.paymentIndex}`} (Overrides split to 100%)
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    "Standard" uses the % split defined in Income Setup. Selecting a specific payment will fund this category 100% from that payment only.
                                </p>
                            </div>
                            <div className="flex-1"></div>
                        </div>
                    </div>

                    {/* Budget Schedule Section */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center border-b border-gray-200 pb-2">
                        <Calendar className="w-3 h-3 mr-1" /> Budget Schedule
                        </h4>
                        
                        <p className="text-xs text-gray-500 mb-4">
                            Define the original base budget and schedule any future changes.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Start Date Config */}
                            <div>
                                <label className="text-xs text-gray-400 font-semibold block mb-1">Category Start Date</label>
                                <input 
                                type="date" 
                                value={cat.startDate || ''}
                                onChange={(e) => updateCategory(cat.id, 'startDate', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-sm text-gray-700 outline-none focus:border-cyan-400"
                                />
                            </div>

                            {/* Base Budget Config */}
                            <div>
                                <label className="text-xs text-gray-400 font-semibold block mb-1">Initial / Base Budget</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                    <input 
                                        type="number" 
                                        value={cat.monthlyBudget}
                                        onChange={(e) => updateCategory(cat.id, 'monthlyBudget', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-7 px-3 py-2 bg-white border border-gray-200 rounded text-sm text-gray-700 outline-none focus:border-cyan-400 font-medium"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Fallback amount if no schedules are active.</p>
                            </div>
                        </div>
                        
                        {/* Add New Schedule Section */}
                        <div className="bg-gray-100/50 p-4 rounded-lg border border-gray-200 mb-4">
                            <label className="text-xs text-gray-500 font-bold block mb-2 uppercase">Add Budget Change</label>
                            <div className="flex gap-2">
                                <input 
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded text-sm outline-none focus:border-cyan-400"
                                />
                                <div className="relative w-32">
                                    <input 
                                    type="number" 
                                    placeholder="Amount"
                                    value={scheduleAmount}
                                    onChange={(e) => setScheduleAmount(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-sm outline-none focus:border-cyan-400"
                                    />
                                </div>
                                <button 
                                    onClick={() => addScheduledChange(cat.id)}
                                    className="px-4 py-2 bg-cyan-600 text-white rounded text-sm font-bold hover:bg-cyan-700 transition-colors shadow-sm"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* List of Scheduled Changes */}
                        {cat.scheduledChanges && cat.scheduledChanges.length > 0 && (
                        <div className="mt-4 border-t border-gray-200 pt-3">
                            <div className="space-y-2">
                            {cat.scheduledChanges.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(change => {
                                const isPast = new Date(change.date) <= new Date();
                                return (
                                <div key={change.id} className={`flex items-center justify-between p-2 rounded border ${isPast ? 'bg-cyan-50 border-cyan-100' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${isPast ? 'bg-cyan-200 text-cyan-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {change.date}
                                        </span>
                                        <span className="text-sm font-medium text-gray-700">
                                        New Budget: {currencySymbol}{change.amount}
                                        </span>
                                        {isPast && <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider ml-2">Active</span>}
                                    </div>
                                    <button 
                                        onClick={() => removeScheduledChange(cat.id, change.id)}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                                );
                            })}
                            </div>
                        </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};