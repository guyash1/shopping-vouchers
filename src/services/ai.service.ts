import OpenAI from 'openai';
import { ShoppingCategory } from '../types/shopping';
import { openaiConfig } from '../config/ai.config';

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
 * Validate image using AI vision to ensure it's appropriate for the context
 * Uses GPT-4o-mini vision for cost-effective validation (~$0.0001-0.0003 per image)
 */
async function validateImage(
  imageDataUrl: string,
  imageType: ImageType
): Promise<ImageValidationResult> {
  if (!openaiConfig.apiKey) {
    console.warn('OpenAI API key not configured, skipping image validation');
    return { isValid: true, confidence: 0 };
  }

  try {
    const openai = new OpenAI({
      apiKey: openaiConfig.apiKey,
      dangerouslyAllowBrowser: true
    });

    const systemPrompt = imageType === 'product' 
      ? `You are an image validator for a shopping list app. Verify if the image shows a PRODUCT that people buy in stores.

ACCEPT: Food, beverages, household items, cosmetics, medicines, baby products, cleaning supplies, any purchasable product.

REJECT: People, selfies, landscapes, buildings, random objects not for sale, abstract images.

Respond ONLY in this exact JSON format: {"isValid": true/false, "reason": "brief explanation in Hebrew", "confidence": 0-100}`
      : `You are an image validator for a voucher app. Verify if the image shows a VOUCHER, COUPON, or GIFT CARD.

ACCEPT: 
- Barcodes (any type)
- QR codes
- Voucher cards, gift cards
- Coupon screenshots (including digital coupons with URLs/links)
- Messages/screenshots containing voucher codes or links
- Promotional codes
- Discount tickets
- Any digital voucher or coupon image

REJECT: 
- People, selfies, landscapes
- Regular products without voucher codes
- Random screenshots (not vouchers)
- Personal documents, IDs

Respond ONLY in this exact JSON format: {"isValid": true/false, "reason": "brief explanation in Hebrew", "confidence": 0-100}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: imageType === 'product' 
                ? 'האם זו תמונה של מוצר שקונים בחנות?' 
                : 'האם זו תמונה של שובר/קופון/ברקוד?'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
                detail: 'low' // Low detail = cheaper + faster
              }
            }
          ]
        }
      ],
      max_tokens: 150,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    const result: ImageValidationResult = JSON.parse(content);
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
      if (!openaiConfig.apiKey) {
        console.error('❌ OpenAI API key is missing!');
        return 'כללי';
      }

      const openai = new OpenAI({
        apiKey: openaiConfig.apiKey,
        dangerouslyAllowBrowser: true
      });

      const prompt = `
        אתה מומחה לסיווג מוצרי מזון וצרכים ישראליים. סווג את המוצר הבא לאחת מהקטגוריות הבאות בדיוק:
        
        1. פירות, ירקות ופיצוחים - ירקות, פירות ופיצוחים שונים (עגבניות, מלפפונים, תפוחים, בננות, אגוזים, בוטנים)
        2. מוצרי חלב וביצים - מוצרי חלב, גבינות וביצים (חלב, יוגורט, גבינה צהובה, גבינה לבנה, ביצים, חמאה, שמנת)
        3. בשר, עוף ודגים - בשר טרי וקפוא, עוף ודגים (בשר בקר, כבש, עוף, הודו, סלמון, דג, קבנוס, נקניק, נקניקיות)
        4. לחמים ומוצרי מאפה - לחמים, מאפים טריים ומאפים תעשייתיים (לחם, פיתה, חלה, רולדה, עוגיות, עוגות)
        5. משקאות, יין, אלכוהול וסנקים - מגוון משקאות, יינות, בירה ואלכוהול וכן חטיפים מלוחים (מים, קולה, בירה, יין, ביסלי, במבה, חטיפי תירס)
        6. מזון מקורר, קפוא ונקניקים - מוצרי מקרר, מזון קפוא ונקניקים, בשרים מעושנים, דגים מעושנים (נקניקיות, קבנוס, סלמי, נקניק, דג מעושן)
        7. בישול אפיה ושימורים - קמח, תבלינים, שמן, שימורים, קטניות (קמח, שמן, סוכר, מלח, פלפל, חומוס, טונה, עגבניות חתוכות)
        8. חטיפים מתוקים ודגני בוקר - שוקולדים, עוגיות, דגני בוקר ומתוקים נוספים (שוקולד, דליס, קרמבו, קורנפלקס, מועדון)
        9. פארם וטיפוח - מוצרי היגיינה וטיפוח (סבון, שמפו, משחת שיניים, דאודורנט, מגבונים, קרם)
        10. עולם התינוקות - מוצרים לתינוקות (טיטולים, מגבונים לתינוקות, בקבוקים, מזון לתינוקות, חיתולים)
        11. ניקיון לבית וחד פעמי - חומרי ניקוי לבית, כלים חד-פעמיים ומוצרי נייר (נייר טואלט, נייר סופג, צלחות פלסטיק, אבקת כביסה)
        12. ויטמינים ותוספי תזונה - ויטמינים ותוספי תזונה לבריאות (ויטמין C, אומגה 3, חלבון בודד, סידן)
        13. כללי - כל השאר
        
        דוגמאות חשובות:
        - "חטיפי מיני קבנוס" = בשר, עוף ודגים (כי קבנוס זה מוצר בשר)
        - "סלים דליס" = חטיפים מתוקים ודגני בוקר (כי דליס זה שוקולד)
        - "נייר סופג למטבח" = ניקיון לבית וחד פעמי
        
        החזר רק את שם הקטגוריה המדויק בדיוק כמו שרשום למעלה (ללא מספר או הסבר):
        
        מוצר: "${itemName}"
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "אתה מומחה לסיווג מוצרים. תחזיר רק את שם הקטגוריה המתאימה." },
          { role: "user", content: prompt }
        ],
        max_tokens: 50,
        temperature: 0.1
      });

      const category = response.choices[0]?.message?.content?.trim() as ShoppingCategory;
      
      // אם הקטגוריה תקינה, החזר אותה, אחרת החזר 'כללי'
      return SHOPPING_CATEGORIES.includes(category) ? category : 'כללי';
      
    } catch (error) {
      console.error('שגיאה בסיווג מוצר:', error);
      return 'כללי';
    }
  }
};
