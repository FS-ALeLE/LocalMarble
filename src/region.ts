// 지역 팩 선택: 주소 뒤에 ?region=cheonan 처럼 붙이면 그 지역으로 바뀐다 (기본: 홍성).
export interface RegionInfo {
  id: string;
  /** 화면에 쓰는 지역 이름 */
  name: string;
  /** 로고 첫 줄 */
  slogan: string;
  /** 출발·골인 장소 이름 */
  start: string;
  /** '조양문으로'처럼 조사를 붙인 꼴 */
  startTo: string;
  /** '홍성을'처럼 조사를 붙인 꼴 */
  nameObj: string;
  /** 소속 입력칸 예시 */
  schoolExample: string;
  /** 시작 화면에 떠다니는 그림 */
  floaters: string[];
}

const REGIONS: Record<string, RegionInfo> = {
  hongseong: { id: 'hongseong', name: '홍성', slogan: '다 같이 돌자,', start: '조양문', startTo: '조양문으로', nameObj: '홍성을', schoolExample: '홍성초등학교', floaters: ['🦐', '🏯', '⛰️', '🏺', '🦆', '⛵', '🎨', '📚'] },
  cheonan: { id: 'cheonan', name: '천안', slogan: '다 함께 돌자,', start: '천안삼거리', startTo: '천안삼거리로', nameObj: '천안을', schoolExample: '천안초등학교', floaters: ['🌰', '🏛️', '⛰️', '🍐', '🚩', '🌳', '🎶', '📚'] },
};

const requested = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('region') ?? '' : '';
export const REGION: RegionInfo = REGIONS[requested] ?? REGIONS.hongseong;

/** 다른 지역일 때 주소에 붙일 쿼리 (화면 이동 링크용) */
export const REGION_QUERY = REGION.id === 'hongseong' ? '' : `?region=${REGION.id}`;
