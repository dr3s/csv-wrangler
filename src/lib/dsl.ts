export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      return word.replace(word[0], word[0].toUpperCase());
    })
    .join(' ');
}

export function value(row: any, name: string): string {
  return row[name];
}

export function integer(row: any, name: string): number {
  return Math.floor(row[name]);
}

export function float(row: any, name: string): number {
  return Number.parseFloat(row[name]);
}
