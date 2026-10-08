// 별명·소속 금칙어 검사 (서버에서도 한 번 더 검사한다)
const BLOCKED = [
  '시발', '씨발', '씨바', '시바', 'ㅅㅂ', 'ㅆㅂ', '병신', '븅신', 'ㅂㅅ', 'ㅄ', '개새', '새끼', 'ㅅㄲ', '좆', '존나', 'ㅈㄴ',
  '지랄', 'ㅈㄹ', '미친', 'ㅁㅊ', '닥쳐', '꺼져', '염병', '엠창', '느금', '니애미', '애미', '애비', '창녀', '찐따', '장애인',
  '보지', '자지', '섹스', '야동', '똥꼬', '죽어', '죽일', '살인', 'fuck', 'shit', 'bitch', 'sex', 'porn', 'dick',
];

const squash = (text: string) => text.toLowerCase().replace(/[\s\d._\-~!@#$%^&*()+=|\\/?,'"`<>[\]{}:;]/g, '');

export function isClean(text: string): boolean {
  const s = squash(text);
  return !BLOCKED.some((word) => s.includes(word));
}

export const NICKNAME_RE = /^[가-힣a-zA-Z0-9]{2,8}$/;

export function nicknameProblem(name: string): string | null {
  if (name.length < 2) return '두 글자 이상 써 주세요.';
  if (name.length > 8) return '여덟 글자까지 쓸 수 있어요.';
  if (!NICKNAME_RE.test(name)) return '한글, 영어, 숫자만 쓸 수 있어요.';
  if (!isClean(name)) return '다른 별명을 써 주세요.';
  return null;
}

/** 소속 대항전 집계용 이름 정리: 공백 제거, '초등학교' → '초' */
export function affiliationKey(raw: string): string {
  return raw
    .replace(/\s+/g, '')
    .replace(/초등학교$/, '초')
    .replace(/초등$/, '초')
    .replace(/중학교$/, '중')
    .replace(/고등학교$/, '고');
}

export function affiliationProblem(raw: string): string | null {
  const key = affiliationKey(raw);
  if (key.length < 2) return '두 글자 이상 써 주세요.';
  if (key.length > 12) return '열두 글자까지 쓸 수 있어요.';
  if (!/^[가-힣a-zA-Z0-9]+$/.test(key)) return '한글, 영어, 숫자만 쓸 수 있어요.';
  if (!isClean(key)) return '다른 이름을 써 주세요.';
  return null;
}
