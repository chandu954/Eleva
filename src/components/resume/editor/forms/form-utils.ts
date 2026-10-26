export function reorderIndexMap<T>(map: Record<number, T>, from: number, to: number): Record<number, T> {
  const updated: Record<number, T> = {};

  Object.entries(map).forEach(([key, value]) => {
    const idx = Number(key);

    if (idx === from) {
      updated[to] = value;
    } else if (from < to && idx > from && idx <= to) {
      updated[idx - 1] = value;
    } else if (from > to && idx >= to && idx < from) {
      updated[idx + 1] = value;
    } else {
      updated[idx] = value;
    }
  });

  return updated;
}
