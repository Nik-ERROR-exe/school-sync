export interface PromotionPreview {
  studentId: number;
  studentName: string;
  rollNo: string;
  currentClassId: number;
  currentClassName: string;
  currentDivision: string;
  nextClassId: number | null; // null means graduated
  nextClassName: string;      // e.g. '2A' or 'Graduated'
  action: 'promote' | 'graduate';
}
