import React, { useEffect, useState } from 'react';
import { IncomeSource, AllocationRule, PaymentFrequency } from '../types';
import { Settings, Plus, Trash2, Save, CheckCircle2, Landmark, Calculator, CalendarDays, StickyNote, HelpCircle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface IncomeConfigProps {
  incomeSources: IncomeSource[];
  onUpdate: (sources: IncomeSource[]) => void;
}

export const IncomeConfig: React.FC<IncomeConfigProps> = ({ incomeSources, onUpdate }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);

  // Ensure we have a primary source to work with
  const source = incomeSources[0] || {
    id: uuidv4(),
    name: 'Main Budget',
    currency: 'USD',
    estimatedAmount: 0,
    frequency: 'monthly',
    allocations: [{ paymentIndex: 1, percentage: 100, amount: 0, name: 'Salary 1', isUncertain: false }],
    openingBalance: 0
  };

  // Initialize if empty on mount
  useEffect(() => {
    if (incomeSources.length === 0) {
      onUpdate([source]);
    }
  }, []);

  const updateSource = (updatedSource: IncomeSource) => {
    onUpdate([updatedSource]);
    setIsSaved(false); // Reset saved state on change
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Helper to redistribute 100% evenly
  const getEvenAllocations = (currentAllocations: AllocationRule[]): AllocationRule[] => {
    const count = currentAllocations.length;
    if (count === 0) return [];
    
    const newAllocations = [...currentAllocations];
    const share = Math.floor(100 / count);
    const remainder = 100 - (share * count);

    for (let i = 0; i < count; i++) {
        newAllocations[i].percentage = i === count - 1 ? share + remainder : share;
    }
    return newAllocations;
  };

  // Re-calculate allocation amounts based on their current percentages and a new Total
  const recalculateAmountsFromTotal = (total: number, allocations: AllocationRule[]) => {
      return allocations.map(a => ({
          ...a,
          amount: parseFloat(((total * a.percentage) / 100).toFixed(2))
      }));
  };

  const updateTotalEstimate = (newTotal: number) => {
      const updatedAllocations = recalculateAmountsFromTotal(newTotal, source.allocations);
      updateSource({
          ...source,
          estimatedAmount: newTotal,
          allocations: updatedAllocations
      });
  };

  const updateFrequency = (newFreq: PaymentFrequency) => {
     // Estimate number of paychecks based on frequency
     let count = 1;
     if (newFreq === 'semi-monthly') count = 2;
     if (newFreq === 'weekly') count = 4;
     if (newFreq === 'monthly') count = 1;

     const shouldReset = confirm(`Change frequency to ${newFreq}? This will reset allocations to ${count} paycheck(s).`);
     if (!shouldReset) return;

     const newAllocations: AllocationRule[] = [];
     for(let i=0; i<count; i++) {
         newAllocations.push({
             paymentIndex: i+1,
             percentage: 0,
             amount: 0,
             name: `Paycheck ${i+1}`,
             isUncertain: false
         });
     }
     
     const balanced = getEvenAllocations(newAllocations);
     const amountAdjusted = recalculateAmountsFromTotal(source.estimatedAmount, balanced);

     updateSource({
         ...source,
         frequency: newFreq,
         allocations: amountAdjusted
     });
  };

  const addPayment = () => {
    const newPaymentIndex = source.allocations.length + 1;
    // New payment starts with 0 amount
    const newAllocations = [...source.allocations, { 
        paymentIndex: newPaymentIndex, 
        percentage: 0, 
        amount: 0,
        name: `Paycheck #${newPaymentIndex}`,
        isUncertain: false
    }];
    
    // Balance percentages automatically
    const balanced = getEvenAllocations(newAllocations);
    // Recalculate amounts based on total
    const amountAdjusted = recalculateAmountsFromTotal(source.estimatedAmount, balanced);
    
    updateSource({ ...source, allocations: amountAdjusted });
  };

  const removePayment = (indexToRemove: number) => {
    if (source.allocations.length <= 1) return;

    let newAllocations = source.allocations.filter((_, i) => i !== indexToRemove);
    // Re-index
    newAllocations = newAllocations.map((a, i) => ({...a, paymentIndex: i + 1}));
    // Re-balance
    newAllocations = getEvenAllocations(newAllocations);
    // Recalculate amounts
    const amountAdjusted = recalculateAmountsFromTotal(source.estimatedAmount, newAllocations);

    updateSource({ 
        ...source, 
        allocations: amountAdjusted
    });
  };

  const updateAmount = (allocIndex: number, newAmount: number) => {
    const newAllocations = source.allocations.map(a => 
        a.paymentIndex === allocIndex ? { ...a, amount: newAmount } : a
    );
    // When manually updating a single amount, we update the total sum
    const newTotal = newAllocations.reduce((sum, a) => sum + a.amount, 0);
    updateSource({ 
        ...source, 
        allocations: newAllocations,
        estimatedAmount: newTotal
    });
  };

  const updateAllocationName = (allocIndex: number, newName: string) => {
    const newAllocations = source.allocations.map(a => 
        a.paymentIndex === allocIndex ? { ...a, name: newName } : a
    );
    updateSource({ ...source, allocations: newAllocations });
  };

  const updateAllocationNote = (allocIndex: number, newNote: string) => {
    const newAllocations = source.allocations.map(a => 
        a.paymentIndex === allocIndex ? { ...a, note: newNote } : a
    );
    updateSource({ ...source, allocations: newAllocations });
  };
  
  const toggleUncertainty = (allocIndex: number) => {
    const newAllocations = source.allocations.map(a => 
        a.paymentIndex === allocIndex ? { ...a, isUncertain: !a.isUncertain } : a
    );
    updateSource({ ...source, allocations: newAllocations });
  };

  const updatePercentage = (allocIndex: number, newValue: number) => {
    if (newValue < 0) newValue = 0;
    if (newValue > 100) newValue = 100;

    const currentAllocations = [...source.allocations];
    const changedAlloc = currentAllocations.find(a => a.paymentIndex === allocIndex);
    if (!changedAlloc) return;
    
    if (currentAllocations.length === 1) return; 

    changedAlloc.percentage = newValue;

    // Auto-balance logic
    const targetRemainder = 100 - newValue;
    const others = currentAllocations.filter(a => a.paymentIndex !== allocIndex);
    const currentOthersSum = others.reduce((sum, a) => sum + a.percentage, 0);

    if (currentOthersSum === 0) {
        const share = Math.floor(targetRemainder / others.length);
        const remainder = targetRemainder - (share * others.length);
        others.forEach((a, i) => {
            a.percentage = i === others.length - 1 ? share + remainder : share;
        });
    } else {
        let assignedSum = 0;
        others.forEach((a, i) => {
            if (i === others.length - 1) {
                a.percentage = targetRemainder - assignedSum;
            } else {
                const ratio = a.percentage / currentOthersSum;
                const newVal = Math.floor(targetRemainder * ratio);
                a.percentage = newVal;
                assignedSum += newVal;
            }
        });
    }

    // After percentages settle, recalculate amounts based on total
    const finalAllocations = recalculateAmountsFromTotal(source.estimatedAmount, currentAllocations);
    updateSource({ ...source, allocations: finalAllocations });
  };

  const updateCurrency = (newCurrency: string) => {
    updateSource({ ...source, currency: newCurrency });
  };
  
  const updateOpeningBalance = (val: number) => {
      updateSource({ ...source, openingBalance: val });
  };

  const currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'JPY', symbol: '¥' },
    { code: 'INR', symbol: '₹' },
    { code: 'PKR', symbol: 'Rs' },
    { code: 'CAD', symbol: 'C$' },
    { code: 'AUD', symbol: 'A$' },
  ];

  const currentSymbol = currencies.find(c => c.code === source.currency)?.symbol || '$';

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-4xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-2">
         <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-cyan-600" />
            Income Configuration
         </h2>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
          Add your income sources below. If a payment amount is unknown, mark it as an <strong>Estimate</strong>.
      </p>

      {/* Opening Balance / Equity Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600" />
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wide">Opening Balance / Equity</div>
          </div>
          <div className="p-6 flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1">
                  <p className="text-sm text-gray-500">
                      Starting cash available before any tracked income. Use this for existing savings or checking account buffers that you want to allocate.
                  </p>
              </div>
              <div className="w-full sm:w-48">
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Initial Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                        {currentSymbol}
                    </span>
                    <input
                        type="number"
                        value={source.openingBalance || ''}
                        onChange={(e) => updateOpeningBalance(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                        placeholder="0.00"
                    />
                  </div>
              </div>
          </div>
      </div>

      {/* Main Container Box */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Header with Currency & Frequency */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="text-sm font-bold text-gray-500 uppercase tracking-wide">Income Sources</div>
             <div className="flex flex-wrap items-center gap-4">
                
                {/* Frequency Selector */}
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <select
                        value={source.frequency || 'monthly'}
                        onChange={(e) => updateFrequency(e.target.value as PaymentFrequency)}
                        className="px-2 py-1 border border-gray-200 rounded text-xs font-bold text-gray-700 focus:border-cyan-500 outline-none bg-white uppercase tracking-wide cursor-pointer"
                    >
                        <option value="monthly">Monthly</option>
                        <option value="semi-monthly">Semi-Monthly (2x)</option>
                        <option value="weekly">Weekly (4x)</option>
                    </select>
                </div>

                {/* Currency Selector */}
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Currency:</label>
                    <select
                        value={source.currency}
                        onChange={(e) => updateCurrency(e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded text-sm font-medium text-gray-700 focus:border-cyan-500 outline-none bg-white cursor-pointer"
                    >
                        {currencies.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                    </select>
                </div>
             </div>
        </div>

        <div className="p-6">
            
            {/* Total Estimated Income Input */}
            <div className="bg-cyan-50/50 rounded-xl p-4 border border-cyan-100 mb-6 flex flex-col sm:flex-row items-center gap-4">
                 <div className="p-3 bg-white rounded-full text-cyan-500 shadow-sm">
                     <Calculator className="w-6 h-6" />
                 </div>
                 <div className="flex-1 text-center sm:text-left">
                     <h3 className="text-sm font-bold text-gray-700">Estimated Total Monthly Income</h3>
                     <p className="text-xs text-gray-500">
                         Set your total expected income. Allocations will calculate automatically based on %.
                     </p>
                 </div>
                 <div className="w-full sm:w-48">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                            {currentSymbol}
                        </span>
                        <input
                            type="number"
                            value={source.estimatedAmount || ''}
                            onChange={(e) => updateTotalEstimate(parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-4 py-3 bg-white border border-cyan-200 rounded-xl text-lg font-bold text-cyan-700 focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 outline-none transition-all placeholder-cyan-200"
                            placeholder="0.00"
                        />
                    </div>
                 </div>
            </div>

            {/* Payments List */}
            <div className="space-y-4">
                <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Incoming Credits & Estimates</label>
                    <span className="text-[10px] text-gray-400 italic">Define each expected credit/salary deposit ({source.allocations.length} items)</span>
                </div>
                
                {source.allocations.map((alloc, index) => (
                    <div key={alloc.paymentIndex} className={`bg-white p-4 rounded-xl border transition-all group relative ${alloc.isUncertain ? 'border-red-200 shadow-[0_0_15px_-3px_rgba(239,68,68,0.1)]' : 'border-gray-200 hover:border-cyan-300'}`}>
                        
                        <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4">
                            {/* Index Badge */}
                            <div className={`hidden xl:flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shrink-0 ${alloc.isUncertain ? 'bg-red-50 text-red-600' : 'bg-cyan-50 text-cyan-600'}`}>
                                {alloc.paymentIndex}
                            </div>
                            
                            {/* Description Input */}
                            <div className="w-full xl:w-1/3">
                                <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-2">
                                    Description
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={alloc.name || ''}
                                        onChange={(e) => updateAllocationName(alloc.paymentIndex, e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm font-medium focus:ring-2 outline-none ${alloc.isUncertain ? 'border-red-200 text-red-800 focus:ring-red-100 focus:border-red-400 placeholder-red-300' : 'border-gray-200 text-gray-800 focus:ring-cyan-100 focus:border-cyan-400'}`}
                                        placeholder="e.g. Salary, Side Gig"
                                    />
                                    {alloc.isUncertain && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded text-[9px] font-bold text-red-600 animate-pulse">
                                            <AlertCircle className="w-3 h-3" /> Estimate
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="w-full xl:w-1/4">
                                <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">
                                    {alloc.isUncertain ? 'Approx. Amount' : 'Amount'}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                                        {currentSymbol}
                                    </span>
                                    <input
                                        type="number"
                                        value={alloc.amount}
                                        onChange={(e) => updateAmount(alloc.paymentIndex, parseFloat(e.target.value) || 0)}
                                        className={`w-full pl-8 pr-4 py-2 bg-gray-50 border rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 outline-none transition-all ${alloc.isUncertain ? 'border-red-200 text-red-800 focus:ring-red-100 focus:border-red-400' : 'border-gray-200 text-gray-800 focus:ring-cyan-100 focus:border-cyan-400'}`}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Allocation Slider */}
                            <div className="flex-1 w-full">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] uppercase text-gray-400 font-bold">Share of Total</label>
                                    <span className={`text-xs font-bold ${alloc.percentage > 0 ? 'text-cyan-600' : 'text-gray-400'}`}>
                                        {alloc.percentage}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={alloc.percentage}
                                    onChange={(e) => updatePercentage(alloc.paymentIndex, parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-cyan-600 hover:bg-gray-200 transition-colors"
                                />
                            </div>

                            {/* Actions: Uncertain Toggle & Delete */}
                            <div className="flex items-center gap-2 pt-6 xl:pt-0">
                                {/* Estimate Toggle Switch */}
                                <button 
                                    onClick={() => toggleUncertainty(alloc.paymentIndex)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all border ${
                                        alloc.isUncertain 
                                        ? 'bg-red-50 text-red-600 border-red-200' 
                                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                    }`}
                                    title="Toggle if this amount is an estimate or uncertain"
                                >
                                    {alloc.isUncertain ? <ToggleRight className="w-5 h-5 text-red-500" /> : <ToggleLeft className="w-5 h-5 text-gray-300" />}
                                    <span className="text-[10px] font-bold uppercase whitespace-nowrap">Estimate?</span>
                                </button>
                                
                                <div className="w-px h-6 bg-gray-200 mx-1"></div>

                                <button 
                                    onClick={() => setActiveNoteIndex(activeNoteIndex === index ? null : index)}
                                    className={`p-2 rounded-lg transition-colors ${alloc.note ? 'text-yellow-600 bg-yellow-50' : 'text-gray-300 hover:text-yellow-500 hover:bg-yellow-50'}`}
                                    title={alloc.note ? "Edit Note" : "Add Note"}
                                >
                                    <StickyNote className="w-4 h-4" />
                                </button>
                                
                                {source.allocations.length > 1 && (
                                    <button 
                                        onClick={() => removePayment(index)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove Payment"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Note Input Area (Conditional) */}
                        {activeNoteIndex === index && (
                             <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                                 <label className="block text-[10px] text-gray-400 font-bold uppercase mb-2">Estimate Notes / Details</label>
                                 <textarea
                                    value={alloc.note || ''}
                                    onChange={(e) => updateAllocationNote(alloc.paymentIndex, e.target.value)}
                                    className="w-full p-3 border border-yellow-200 bg-yellow-50/50 rounded-lg text-sm text-gray-700 outline-none focus:border-yellow-400 focus:bg-yellow-50 resize-y min-h-[80px]"
                                    placeholder="Enter details about this estimate (e.g., 'Depends on overtime hours', 'Pending confirmation')..."
                                 />
                             </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Payment Button */}
            <button
                onClick={addPayment}
                className="mt-4 w-full py-3 border border-dashed border-gray-300 rounded-xl text-gray-500 font-medium text-sm hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all flex items-center justify-center group"
            >
                <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" /> Add Income Credit
            </button>
        </div>
        
        {/* Footer with Totals and Save */}
        <div className="bg-gray-50 p-6 border-t border-gray-100">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                 <div className="text-sm text-gray-600">
                     Calculated Total: <span className="font-bold text-gray-900">{currentSymbol}{source.estimatedAmount.toLocaleString()}</span>
                 </div>
                 <div className={`text-sm font-bold ${source.allocations.reduce((sum, a) => sum + a.percentage, 0) === 100 ? 'text-cyan-600' : 'text-orange-500'}`}>
                     Total Allocation: {source.allocations.reduce((sum, a) => sum + a.percentage, 0)}%
                 </div>
             </div>

             <button 
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center ${isSaved ? 'bg-green-500 hover:bg-green-600' : 'bg-cyan-600 hover:bg-cyan-700'}`}
             >
                {isSaved ? (
                    <>
                        <CheckCircle2 className="w-5 h-5 mr-2 text-white" /> Configuration Saved
                    </>
                ) : (
                    <>
                        <Save className="w-5 h-5 mr-2" /> Save Configuration
                    </>
                )}
             </button>
        </div>

      </div>
    </div>
  );
};