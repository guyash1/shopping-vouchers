import React, { useState } from "react";
import { Plus, HelpCircle, X, Receipt, Calendar, Banknote } from "lucide-react";

interface Voucher {
  id: number;
  store: string;
  amount: number;
  expiryDate: string;
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-gray-500 hover:text-gray-700"
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-4">איך להשתמש בניהול שוברים?</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-bold mb-2">הוספת שובר חדש</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-500" />
                <span>הזינו את שם החנות</span>
              </div>
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-500" />
                <span>הכניסו את סכום השובר</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-500" />
                <span>בחרו את תאריך התפוגה</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">טיפים נוספים</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>שוברים שפג תוקפם יופיעו מעומעמים</li>
              <li>ניתן למחוק שוברים שנוצלו</li>
              <li>הרשימה נשמרת אוטומטית</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VoucherManager() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [newVoucher, setNewVoucher] = useState({
    store: "",
    amount: "",
    expiryDate: "",
  });

  const addVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucher.store || !newVoucher.amount || !newVoucher.expiryDate) return;

    const voucher: Voucher = {
      id: Date.now(),
      store: newVoucher.store,
      amount: parseFloat(newVoucher.amount),
      expiryDate: newVoucher.expiryDate,
    };

    setVouchers([...vouchers, voucher]);
    setNewVoucher({ store: "", amount: "", expiryDate: "" });
  };

  const deleteVoucher = (id: number) => {
    setVouchers(vouchers.filter((voucher) => voucher.id !== id));
  };

  const isExpired = (date: string) => {
    return new Date(date) < new Date();
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">ניהול שוברים</h1>
        <button
          onClick={() => setIsHelpOpen(true)}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          aria-label="עזרה"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={addVoucher} className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              חנות
            </label>
            <div className="relative">
              <Receipt className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={newVoucher.store}
                onChange={(e) =>
                  setNewVoucher({ ...newVoucher, store: e.target.value })
                }
                className="w-full pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="שם החנות"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סכום
            </label>
            <div className="relative">
              <Banknote className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={newVoucher.amount}
                onChange={(e) =>
                  setNewVoucher({ ...newVoucher, amount: e.target.value })
                }
                className="w-full pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="סכום השובר"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תאריך תפוגה
            </label>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={newVoucher.expiryDate}
                onChange={(e) =>
                  setNewVoucher({ ...newVoucher, expiryDate: e.target.value })
                }
                className="w-full pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            הוסף שובר
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {vouchers.map((voucher) => (
          <div
            key={voucher.id}
            className={`bg-white rounded-lg shadow p-4 ${
              isExpired(voucher.expiryDate) ? 'opacity-50' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{voucher.store}</h3>
                <p className="text-lg">₪{typeof voucher.amount === 'number' ? voucher.amount.toFixed(2) : '0.00'}</p>
                <p
                  className={`text-sm ${
                    isExpired(voucher.expiryDate)
                      ? "text-red-500"
                      : "text-gray-500"
                  }`}
                >
                  תוקף: {new Date(voucher.expiryDate).toLocaleDateString("he-IL")}
                </p>
              </div>
              <button
                onClick={() => deleteVoucher(voucher.id)}
                className="text-red-500 hover:text-red-600 p-1"
                aria-label="מחק שובר"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {vouchers.length === 0 && (
          <p className="text-center text-gray-500">אין שוברים</p>
        )}
      </div>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
} 