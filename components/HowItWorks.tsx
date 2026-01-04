import React from 'react';
import { Wallet, PieChart, CreditCard, LayoutDashboard, Info, Coins, Split, AlertCircle } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const FeatureSection = ({ icon: Icon, title, description, children }: any) => (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-slate-100 rounded-xl">
                  <Icon className="w-6 h-6 text-slate-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">{description}</p>
          {children && <div className="mt-4 pt-4 border-t border-slate-100">{children}</div>}
      </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
        <div className="text-center py-8">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">How CashMap Works</h1>
            <p className="text-slate-500 max-w-2xl mx-auto">
                A guide to the zero-based envelope budgeting system.
                Every unit of money has a job, and every expense is tracked.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureSection 
                icon={Wallet} 
                title="1. Income Setup" 
                description="Define your monthly income sources. Unlike traditional apps, you can split a single paycheck into multiple 'allocations' (e.g., 60% for bills, 40% for spending). You can also mark income amounts as 'Estimates' if they vary (like freelance work)."
            >
                <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">Frequency Settings</span>
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">% Allocations</span>
                    <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold">Uncertain Estimates</span>
                </div>
            </FeatureSection>

            <FeatureSection 
                icon={PieChart} 
                title="2. Categories & Budgeting" 
                description="Create envelopes (categories) for your expenses. Set a 'Base Target' for regular months, or use the Schedule feature to plan for months with higher expenses (like December holidays)."
            >
                <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">Rollover Balances</span>
                    <span className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs font-bold">Scheduled Changes</span>
                </div>
            </FeatureSection>

            <FeatureSection 
                icon={CreditCard} 
                title="3. Transactions & Imports" 
                description="Log every expense. You can add them manually or upload a CSV file from your bank. Our AI Auto-Categorize feature helps you sort hundreds of transactions in seconds."
            >
                 <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">CSV Import</span>
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-bold">AI Categorization</span>
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">Splits</span>
                </div>
            </FeatureSection>

             <FeatureSection 
                icon={LayoutDashboard} 
                title="4. Dashboard & Distribution" 
                description="The heart of the app. All income lands in a central 'Available to Budget' pool. Use the 'Fill Envelopes' tool to distribute this money into your categories based on your Income Setup rules."
            >
                 <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold">Available Pool</span>
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">Smart Fill</span>
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">One-Time Expenses</span>
                </div>
            </FeatureSection>
        </div>

        {/* New Section for Managing Unexpected Expenses */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-purple-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                    <Coins className="w-6 h-6 text-purple-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Handling Unexpected & Other Expenses</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-purple-500" /> The "Other Expenses" Category
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        If you create a "One-Time Expense" (via the dashboard button), it is automatically assigned to a special category called <strong>Other Expenses</strong>. This category is for non-recurring costs like car repairs, medical bills, or gifts.
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Unlike normal categories, "Other Expenses" usually has a budget of 0, meaning any spending here needs to be funded explicitly.
                    </p>
                </div>

                <div className="space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <Split className="w-4 h-4 text-purple-500" /> Assigning Funds from Envelopes
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        When recording a One-Time Expense, you can choose how to pay for it:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
                        <li>
                            <strong>Available Balance:</strong> If you have unallocated money in your pool, you can use that directly.
                        </li>
                        <li>
                            <strong>Existing Envelopes:</strong> If your pool is empty, you can "rob Peter to pay Paul". The modal allows you to select existing categories (e.g., take 50 from 'Dining Out') to cover the new expense. This keeps your total budget balanced.
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-6 flex gap-4">
            <Info className="w-6 h-6 text-cyan-600 flex-shrink-0 mt-1" />
            <div>
                <h4 className="font-bold text-cyan-900 mb-1">Pro Tip: The Zero-Based Method</h4>
                <p className="text-sm text-cyan-800/80 leading-relaxed">
                    The goal is to give every unit of income a job. If you have money left in "Available to Budget", assign it to savings or a future month's buffer. 
                    If a category goes negative (red), use the "One-Time Expense" tool or move money from another category to cover it.
                </p>
            </div>
        </div>
    </div>
  );
};