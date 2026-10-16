// 학년(구분) 코드: 0 어린이, 1~6 초등 학년, 7 중학생, 8 고등학생, 9 성인
export const GRADE_MIN = 0;
export const GRADE_MAX = 9;

export function gradeLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) return '';
  if (code === 0) return '어린이';
  if (code >= 1 && code <= 6) return `${code}학년`;
  return ({ 7: '중학생', 8: '고등학생', 9: '성인' } as Record<number, string>)[code] ?? '';
}

/** 쉬운 문제를 기본으로 할 구분: 어린이, 초등 1~3학년 */
export function isEasyByDefault(code: number | null | undefined): boolean {
  return code === undefined || code === null || code <= 3;
}
