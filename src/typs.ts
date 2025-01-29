export interface Distributor {
  name_en?: string;
  name_ar: string;
  status: number;
  logo?: string;
  website?: string;
  mobile_no?: string;
  email?: string;
  created_by: number;
  fee: number;
  isfixed: boolean;
}

  export interface Bulk {
    id?: number;
    bulk_name: string;
    created_by: number;
    bulk_count: number;
    bulk_status: number;
    valid_from: string;
    valid_until: string;
    bulk_value: number;
    bulk_balance: number;
    bulk_category: string;
    dist_id: number;
  }
  export interface Voucher {
    serialNumber: string;
    redemptionCode: string;
    status: string;
    value: number;
    currency: string;
    distributorId: number;
    templateId?: number | null;
    expiryDate: string;
  }
  

