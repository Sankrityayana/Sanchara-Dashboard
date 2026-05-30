export function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function max(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Math.max(...values);
}

export function healthClass(score: number) {
  if (score < 60) {
    return "critical";
  }
  if (score < 78) {
    return "warning";
  }
  return "healthy";
}
