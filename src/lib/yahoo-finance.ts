import YahooFinance from 'yahoo-finance2';

/** Silence yahoo-finance2 Node-version advisory on stderr during build workers. */
const logger = {
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('[yahoo-finance2] Unsupported environment')) return;
    console.warn(...args);
  },
  error: (...args: unknown[]) => console.error(...args),
  dir: (...args: unknown[]) => console.dir(...args),
  debug: () => undefined,
};

export const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
  logger,
});
