export interface UserRole {
  id: number;
  RoleName: string;
}

export interface Personnel {
  id: number;
  FirstName: string;
  LastName: string;
  IdentityNumber: string;
  Username: string;
  Department?: string;
  IsActive: boolean;
  user_role?: UserRole;
}

export interface Visitor {
  id: number;
  documentId?: string;
  identityNumber?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  visitedTeacher?: string;
  createdAt?: string;
  exitTime?: string;
  entryGuard?: string;
  exitGuard?: string;
}
export type Ziyaretci = Visitor;
export interface FormState {
  tc: string;
  adSoyad: string;
  telefon: string;
  hoca: string;
}



export interface VisitLog {
  id: number;
  EntryTime: string;
  ExitTime?: string;
  visitor?: Visitor;
  personnel?: Personnel;
}