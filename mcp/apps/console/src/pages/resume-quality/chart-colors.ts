// 색 역할은 검증한 기본 팔레트를 따른다. 범주 색은 지표가 처음 나온 순서대로 고정하고 순환하지 않는다
export const seriesColors = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#6250d6",
  "#e34948",
] as const;

// 상태 색은 범주 색과 겹치지 않는 고정 값이며 기호와 이름을 함께 붙인다
export const statusColors = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
  neutral: "#c3c2b7",
} as const;

export const inkColors = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
} as const;

// 크기 순서를 나타내는 막대는 한 가지 색조를 쓴다
export const magnitudeColor = seriesColors[0];
