import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export class JsonRepository<T extends object> {
  private readonly file: string;
  private readonly initial: T;
  private data: T;

  constructor(filename: string, initial: T) {
    this.file = join(__dirname, '../../data', filename);
    this.initial = initial;
    this.data = this.read();
  }

  private read(): T {
    try {
      if (!existsSync(this.file)) return structuredClone(this.initial);
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as T;
      return parsed && typeof parsed === 'object' ? parsed : structuredClone(this.initial);
    } catch {
      return structuredClone(this.initial);
    }
  }

  get(): T {
    return structuredClone(this.data);
  }

  set(next: T): void {
    this.data = structuredClone(next);
    mkdirSync(dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp`;
    writeFileSync(temp, JSON.stringify(this.data, null, 2), 'utf8');
    renameSync(temp, this.file);
  }
}
