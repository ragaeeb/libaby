export function Badge({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="inline rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-500 text-sm hover:bg-secondary/90">
            {children}
        </div>
    );
}
