export const redactText = (key: string): string => {
    if (key.length <= 8) {
        return '***';
    }
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
};
