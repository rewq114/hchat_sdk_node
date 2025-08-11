// 에러 관련 타입 정의
export interface FeatureError {
  code: string;
  feature?: string;
  model?: string;
  message: string;
  suggestion?: string;
}
