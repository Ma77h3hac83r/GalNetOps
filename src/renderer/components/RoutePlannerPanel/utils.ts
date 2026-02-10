/** Array move helper for drag-and-drop reorder. */

export function moveItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) {
    return arr;
  }
  const copy = [...arr];
  const [item] = copy.splice(fromIndex, 1);
  if (item === undefined) {
    return copy;
  }
  copy.splice(toIndex, 0, item);
  return copy;
}
