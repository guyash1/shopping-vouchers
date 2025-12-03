import { ShoppingCategory } from '../types/shopping';

export interface ImageValidationResult {
  isValid: boolean;
  reason?: string;
  confidence: number;
}

export type ImageType = 'product' | 'voucher';

export const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  'פירות, ירקות ופיצוחים',
  'מוצרי חלב וביצים',
  'בשר, עוף ודגים',
  'לחמים ומוצרי מאפה',
  'משקאות, יין, אלכוהול וסנקים',
  'מזון מקורר, קפוא ונקניקים',
  'בישול אפיה ושימורים',
  'חטיפים מתוקים ודגני בוקר',
  'פארם וטיפוח',
  'עולם התינוקות',
  'ניקיון לבית וחד פעמי',
  'ויטמינים ותוספי תזונה',
  'כללי'
];

/**
 * Call the Netlify serverless function for OpenAI operations
 * This keeps the API key secure on the server side
 */
async function callOpenAIFunction(action: string, data: Record<string, unknown>): Promise<unknown> {
  const response = await fetch('/.netlify/functions/openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, data }),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Validate image using AI vision to ensure it's appropriate for the context
 * Uses serverless function to keep API key secure
 */
async function validateImage(
  imageDataUrl: string,
  imageType: ImageType
): Promise<ImageValidationResult> {
  try {
    const result = await callOpenAIFunction('validateImage', {
      imageDataUrl,
      imageType,
    }) as ImageValidationResult;
    
    return result;
  } catch (error) {
    console.error('Image validation error:', error);
    // On error, allow upload (fail open) but log it
    return { 
      isValid: true, 
      reason: 'לא ניתן לאמת את התמונה',
      confidence: 0 
    };
  }
}

export const aiService = {
  validateImage,
  async categorizeItem(itemName: string): Promise<ShoppingCategory> {
    try {
      const result = await callOpenAIFunction('categorize', {
        itemName,
      }) as { category: ShoppingCategory };
      
      return SHOPPING_CATEGORIES.includes(result.category) ? result.category : 'כללי';
    } catch (error) {
      console.error('שגיאה בסיווג מוצר:', error);
      return 'כללי';
    }
  }
};
