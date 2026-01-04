import { GoogleGenAI, Type } from "@google/genai";
import { Category, Transaction } from "../types";

// Removed global instance relying on process.env to support user-supplied keys
const modelId = "gemini-3-flash-preview";

export const categorizeTransaction = async (
  apiKey: string,
  description: string,
  categories: Category[]
): Promise<string | null> => {
  if (!categories.length || !apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const categoryNames = categories.map((c) => c.name).join(", ");
  const prompt = `Match this transaction description: "${description}" to one of these categories: [${categoryNames}]. Return only the exact category name. If no match is likely, return "Uncategorized".`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categoryName: { type: Type.STRING },
          },
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    if (result.categoryName) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === result.categoryName.toLowerCase()
      );
      return match ? match.id : null;
    }
    return null;
  } catch (error) {
    console.error("AI Categorization failed:", error);
    return null;
  }
};

export const categorizeTransactionsBatch = async (
  apiKey: string,
  descriptions: string[],
  categories: Category[]
): Promise<Record<string, string>> => {
  if (!categories.length || !descriptions.length || !apiKey) return {};

  const ai = new GoogleGenAI({ apiKey });
  const categoryNames = categories.map((c) => c.name).join(", ");
  const prompt = `
    You are a transaction classifier.
    Categories: [${categoryNames}]
    
    Task: Map the following transaction descriptions to the best fitting category from the list above.
    If a transaction is ambiguous or doesn't fit well, return "Uncategorized".
    
    Transactions:
    ${JSON.stringify(descriptions)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  categoryName: { type: Type.STRING }
                }
              }
            }
          }
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    const map: Record<string, string> = {};
    
    if (result.matches && Array.isArray(result.matches)) {
      result.matches.forEach((item: any) => {
        const cat = categories.find(c => c.name.toLowerCase() === item.categoryName?.toLowerCase());
        if (cat) {
            map[item.description] = cat.id;
        }
      });
    }
    
    return map;
  } catch (error) {
    console.error("Batch categorization failed:", error);
    return {};
  }
};

export const getFinancialAdvice = async (
  apiKey: string,
  state: { income: number; expenses: number; categories: Category[]; transactions: Transaction[] }
): Promise<string> => {
  if (!apiKey) return "API Key missing.";
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    const summary = `
      Income Estimate: ${state.income}
      Total Spent this month: ${state.expenses}
      Categories: ${state.categories.map(c => `${c.name} (Budget: ${c.monthlyBudget}, Rollover: ${c.rollover})`).join(', ')}
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: `You are a financial advisor. Analyze this monthly snapshot and give 3 brief, bulleted actionable tips for better budgeting or allocation adjustments. \n\nData: ${summary}`,
    });
    return response.text || "Unable to generate advice at this time.";
  } catch (e) {
    console.error(e);
    return "AI service unavailable.";
  }
};