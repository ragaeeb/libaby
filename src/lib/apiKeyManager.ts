export class ApiKeyManager {
    private keys: string[];
    private currentIndex: number = 0;

    constructor(keys: string[] | string) {
        if (typeof keys === 'string') {
            keys = keys
                .split(',')
                .map((k) => k.trim())
                .filter((k) => k);
        }

        if (keys.length === 0) {
            throw new Error('No API keys provided');
        }

        this.keys = keys;

        console.log(`Loaded ${this.getCount()} API key(s)`);
    }

    getNext(): string {
        const key = this.keys[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        return key;
    }

    getCount(): number {
        return this.keys.length;
    }
}
