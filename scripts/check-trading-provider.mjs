// Read-only diagnostics. Never print secrets, request URLs, or provider errors.
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const key = process.env.TWELVE_DATA_API_KEY;
console.log(JSON.stringify({ configured: Boolean(key), provider: process.env.TRADING_MARKET_DATA_PROVIDER, localDatabase: /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(process.env.NEXT_PUBLIC_SUPABASE_URL || '') }));
if (!key) process.exit(1);
if (process.argv.includes('--catalogue')) {
  for (const endpoint of ['forex_pairs','cryptocurrencies','stocks','etf','commodities','indices']) {
    try {
      const url = new URL(`https://api.twelvedata.com/${endpoint}`);
      url.searchParams.set('apikey', key);
      if(endpoint==='stocks' || endpoint==='etf' || endpoint==='indices') url.searchParams.set('country','United States');
      const data=await (await fetch(url,{signal:AbortSignal.timeout(15000)})).json();
      const names=new Set(['BTC/USD','ETH/USD','SOL/USD','XRP/USD','EUR/USD','GBP/USD','USD/JPY','AUD/USD','XAU/USD','XAG/USD','AAPL','MSFT','NVDA','TSLA','SPY','QQQ','WTI','SPX','NDX','DJI']);
      console.log(JSON.stringify({endpoint,code:data.code,matches:(data.data??[]).filter(r=>names.has(r.symbol)).map(r=>({symbol:r.symbol,name:r.name,exchange:r.exchange,currency:r.currency}))}));
    } catch {console.log(JSON.stringify({endpoint,error:'unavailable'}));}
  }
  process.exit(0);
}
for (const symbol of ['XAU/USD', 'BTC/USD', 'EUR/USD', 'AAPL']) {
  try {
    const url = new URL('https://api.twelvedata.com/quote');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', process.argv.includes('--daily') ? '1day' : '1min');
    url.searchParams.set('apikey', key);
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const data = await response.json();
    console.log(JSON.stringify({ requested: symbol, httpStatus: response.status, code: data.code, status: data.status, symbol: data.symbol, price: data.close, timestamp: data.timestamp, lastQuoteAt: data.last_quote_at, marketOpen: data.is_market_open, currency: data.currency, exchange: data.exchange, hasBid: data.bid != null, hasAsk: data.ask != null }));
  } catch { console.log(JSON.stringify({ requested: symbol, error: 'network_error' })); }
}
