const OpenAI = require('openai');

// Categories for categorization
const SHOPPING_CATEGORIES = [
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

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check API key exists
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenAI API key not configured' })
    };
  }

  try {
    const { action, data } = JSON.parse(event.body);
    const openai = new OpenAI({ apiKey });

    // Handle different actions
    if (action === 'categorize') {
      const { itemName } = data;
      
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

      const category = response.choices[0]?.message?.content?.trim();
      const validCategory = SHOPPING_CATEGORIES.includes(category) ? category : 'כללי';

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: validCategory })
      };

    } else if (action === 'validateImage') {
      const { imageDataUrl, imageType } = data;

      const systemPrompt = imageType === 'product' 
        ? `You are an image validator for a shopping list app. Accept PHYSICAL PRODUCTS that people buy and consume.

ACCEPT:
- Food items, beverages, snacks
- Household products (cleaners, toiletries)
- Physical product packages you find in stores
- Actual items on shelves

REJECT:
- Vouchers, coupons, gift cards (even with barcodes!)
- Receipts, tickets, documents
- People, selfies, portraits
- Landscapes, nature, buildings
- Screenshots, digital content
- Abstract/blank images

Key: We want PHYSICAL PRODUCTS, not payment/voucher items.

Respond ONLY in this exact JSON format: {"isValid": true/false, "reason": "brief explanation in Hebrew", "confidence": 0-100}`
        : `You are an image validator for a voucher/gift card app. You need to save storage costs while being fair.

ACCEPT:
- Gift cards, vouchers, coupons
- Barcodes and QR codes (clear ones)
- Receipts WITH visible barcodes or refund codes
- Store credit slips with codes
- Digital vouchers with numbers/codes
- Promotional codes (clear screenshots)

REJECT:
- People, selfies
- Landscapes, nature
- Random screenshots WITHOUT codes/barcodes
- Blank/blurry images where nothing is visible
- Personal documents, IDs

Key rule: If there's a BARCODE or CODE visible → ACCEPT. If it's just text/random stuff → REJECT.

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
                  detail: 'low'
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
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isValid: true, confidence: 0, reason: 'לא ניתן לאמת' })
        };
      }

      const result = JSON.parse(content);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      };

    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unknown action' })
      };
    }

  } catch (error) {
    console.error('OpenAI function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

