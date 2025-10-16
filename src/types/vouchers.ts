export interface Voucher {
    id: string;
    storeName: string;
    amount: number;
    expiryDate?: string;
    imageUrl?: string;
    userId: string;
    createdAt: Date;
    isUsed: boolean;
    category?: string;
    isPartial?: boolean;
    remainingAmount?: number;
} 

export enum VoucherSort {
    EXPIRY_ASC = 'expiry_asc',
    EXPIRY_DESC = 'expiry_desc',
    AMOUNT_ASC = 'amount_asc',
    AMOUNT_DESC = 'amount_desc',
    DATE_ADDED_ASC = 'date_added_asc',
    DATE_ADDED_DESC = 'date_added_desc'
} 