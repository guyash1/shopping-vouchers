// קובץ קונפיגורציית OpenAI
// הקונפיגורציה נטענת ממשתני סביבה

// יש להגדיר את משתנה הסביבה הבא ב-.env.local:
// REACT_APP_OPENAI_API_KEY

// וודא כי .env.local נמצא ב-.gitignore ולא נשלח לגיט
export const openaiConfig = {
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
};
