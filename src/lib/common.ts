export const chunkArray = <T>(arr: T[], size: number): T[][] => {
    return [...Array(Math.ceil(arr.length / size))].map((_, i) => arr.slice(size * i, size + size * i));
};

export const validateChunks = <T>(chunks: T[][], expectedTotal: number) => {
    const totalInChunks = chunks.reduce((sum, c) => sum + c.length, 0);
    if (totalInChunks !== expectedTotal) {
        throw new Error(`Sanity check failed: chunks total ${totalInChunks} but unprocessed is ${expectedTotal}`);
    }
    console.log(`✓ Sanity check passed: ${totalInChunks} items in chunks match ${expectedTotal} unprocessed items`);
};
