export class SeededRandom {
  private state: number;

  constructor(seed = 0x58534543) {
    this.state = seed >>> 0;
  }

  next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x100000000;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)]!;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
      const other = this.int(0, index);
      [result[index], result[other]] = [result[other]!, result[index]!];
    }
    return result;
  }
}

export const daysAgo = (days: number, random: SeededRandom, now: Date) =>
  new Date(now.getTime() - (days * 24 + random.int(0, 20)) * 60 * 60 * 1000);
