export const formatRelativeTime = (
    date: Date,
    locale: string,
    fallback: string,
) => {
    try {
        const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);

        const divisions = [
            { amount: 60, unit: 'second' },
            { amount: 60, unit: 'minute' },
            { amount: 24, unit: 'hour' },
            { amount: 30, unit: 'day' },
            { amount: 12, unit: 'month' },
            { amount: Number.POSITIVE_INFINITY, unit: 'year' },
        ] as const;

        let duration = diffInSeconds;
        for (const division of divisions) {
            if (Math.abs(duration) < division.amount) {
                return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
                    Math.round(duration),
                    division.unit,
                );
            }

            duration /= division.amount;
        }

        return fallback;
    } catch {
        return fallback;
    }
};
