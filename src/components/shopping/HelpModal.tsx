import React, { useState } from "react";
import { X, ShoppingCart, MinusCircle, AlertCircle, Camera, History, Sparkles, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";
import Modal from "react-modal";

// וידוא שהספרייה יודעת מי האלמנט השורש של האפליקציה
if (typeof window !== 'undefined') {
  Modal.setAppElement('#root');
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    id: 1,
    icon: <Sparkles className="w-12 h-12 text-blue-500" />,
    title: "ברוכים הבאים ל-Carto! 🛒",
    description: "רשימת קניות חכמה שעוזרת לכם לא לפספס אף מוצר",
    features: [
      { icon: <CheckCircle className="w-5 h-5 text-green-500" />, text: "סימון חכם של מוצרים" },
      { icon: <Camera className="w-5 h-5 text-blue-500" />, text: "הוספת תמונות למוצרים" },
      { icon: <History className="w-5 h-5 text-purple-500" />, text: "היסטוריית קניות" },
    ]
  },
  {
    id: 2,
    icon: <ShoppingCart className="w-12 h-12 text-green-500" />,
    title: "סימון במהלך הקניות",
    description: "לחצו על המוצר כדי לסמן שהוא בעגלה",
    highlight: "💡 זה עוזר לכם לא לפספס מוצרים!",
    statusDemo: [
      { icon: <ShoppingCart className="w-6 h-6 text-green-500" />, label: "בעגלה", color: "bg-green-50 border-green-200" },
      { icon: <MinusCircle className="w-6 h-6 text-yellow-500" />, label: "חלקי", color: "bg-yellow-50 border-yellow-200" },
      { icon: <AlertCircle className="w-6 h-6 text-red-500" />, label: "חסר", color: "bg-red-50 border-red-200" },
    ]
  },
  {
    id: 3,
    icon: <MinusCircle className="w-12 h-12 text-yellow-500" />,
    title: "לקחתם רק חלק מהכמות?",
    description: "סמנו כ'חלקי' ובסיום הקניות תוכלו לעדכן כמה לקחתם",
    example: "דוגמה: צריכים 5 יוגורטים אבל נשארו רק 3? סמנו 'חלקי' ועדכנו בסוף!",
    tip: "המוצר ישאר ברשימה עם הכמות המעודכנת"
  },
  {
    id: 4,
    icon: <AlertCircle className="w-12 h-12 text-red-500" />,
    title: "מוצר חסר במלאי?",
    description: "סמנו אותו כ'חסר' כדי לזכור לקנות בפעם הבאה",
    highlight: "בסיום הקניות, המוצר יחזור למצב רגיל",
    tip: "כך לא תשכחו לקנות אותו בביקור הבא!"
  },
  {
    id: 5,
    icon: <History className="w-12 h-12 text-purple-500" />,
    title: "היסטוריית מוצרים 🚀",
    description: "כל המוצרים שקניתם נשמרים בהיסטוריה",
    features: [
      "הוספה מהירה מההיסטוריה",
      "תמונות נשמרות אוטומטית",
      "חיסכון בזמן בקניות הבאות"
    ]
  }
];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TUTORIAL_STEPS[currentStep];

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl max-w-lg w-11/12 max-h-[85vh] overflow-hidden flex flex-col"
      overlayClassName="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-white/20 transition-colors" 
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex justify-center mb-3">
          {step.icon}
        </div>
        <h2 className="text-2xl font-bold text-center">{step.title}</h2>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 py-4 bg-gray-50">
        {TUTORIAL_STEPS.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-gray-700 text-center mb-4 text-lg leading-relaxed">
          {step.description}
        </p>

        {step.highlight && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 font-medium text-center">{step.highlight}</p>
          </div>
        )}

        {step.features && (
          <div className="space-y-3">
            {step.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {typeof feature === 'object' && 'icon' in feature ? (
                  <>
                    {feature.icon}
                    <span className="text-gray-700">{feature.text}</span>
                  </>
                ) : (
                  <span className="text-gray-700">{feature}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {step.statusDemo && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {step.statusDemo.map((status, index) => (
              <div key={index} className={`${status.color} border-2 rounded-lg p-4 flex flex-col items-center gap-2`}>
                {status.icon}
                <span className="text-sm font-medium text-gray-700">{status.label}</span>
              </div>
            ))}
          </div>
        )}

        {step.example && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
            <p className="text-purple-800 text-sm">{step.example}</p>
          </div>
        )}

        {step.tip && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
            <p className="text-yellow-800 text-sm">💡 {step.tip}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
          <span>הקודם</span>
        </button>

        <span className="text-sm text-gray-500">
          {currentStep + 1} / {TUTORIAL_STEPS.length}
        </span>

        {currentStep < TUTORIAL_STEPS.length - 1 ? (
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            <span>הבא</span>
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            <CheckCircle className="w-5 h-5" />
            <span>סיימתי!</span>
          </button>
        )}
      </div>
    </Modal>
  );
}; 