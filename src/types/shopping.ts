export type ItemStatus = 'pending' | 'inCart' | 'missing' | 'partial' | 'purchased';

export interface Item {
  id: string;
  name: string;
  quantity: number;
  status: ItemStatus;
  imageUrl: string | null;
  purchaseCount: number;
  lastPurchaseDate?: Date;
  lastPartialPurchaseDate?: Date;
  householdId?: string;
  addedBy: string;
}

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  frequentItems: string[];
  onItemSelect: (item: string, imageUrl?: string) => void;
  historyItemsData: { 
    name: string; 
    imageUrl?: string; 
    purchaseCount: number;
    lastPurchaseDate?: Date;
    lastPartialPurchaseDate?: Date;
  }[];
  onDeleteFromHistory: (itemName: string) => void;
}

export interface EditQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSave: (id: string, newQuantity: number) => void;
}

export interface PartialItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  onSave: (updates: { id: string; newQuantity: number }[]) => void;
} 