export interface SeedStock {
  symbol: string;
  name: string;
}

export const DEFAULT_SEEDS: SeedStock[] = [
  { symbol: 'VOLTAMP.NS', name: 'Voltamp Transformers Ltd.' },
  { symbol: 'TDPOWERSYS.NS', name: 'TD Power Systems Ltd.' },
  { symbol: 'TARIL.NS', name: 'Transformers & Rectifiers (India) Ltd.' },
  { symbol: 'PRECWIRE.NS', name: 'Precision Wires India Ltd.' },
  { symbol: 'MAZDOCK.NS', name: 'Mazagon Dock Shipbuilders Ltd.' },
  { symbol: 'KIRLOSENG.NS', name: 'Kirloskar Oil Engines Ltd.' },
  { symbol: 'HSCL.NS', name: 'Himadri Speciality Chemical Ltd.' },
  { symbol: 'HFCL.NS', name: 'HFCL Ltd.' },
  { symbol: 'E2E.NS', name: 'E2E Networks Ltd.' },
  { symbol: 'BECTORFOOD.NS', name: 'Mrs. Bectors Food Specialities Ltd.' },
  { symbol: 'AURIONPRO.NS', name: 'Aurionpro Solutions Ltd.' },
  { symbol: 'KEI.NS', name: 'KEI Industries Ltd.' },
  { symbol: 'COFORGE.NS', name: 'Coforge Ltd.' },
  { symbol: 'MANORAMA.NS', name: 'Manorama Industries Ltd.' },
  { symbol: 'ZENTEC.NS', name: 'Zen Technologies Ltd.' },
  { symbol: 'APARINDS.NS', name: 'Apar Industries Ltd.' },
  { symbol: 'SHILCTECH.NS', name: 'Shilpa Medicare Ltd.' },
  { symbol: 'INOXINDIA.NS', name: 'Inox India Ltd.' },
  { symbol: 'KRN.NS', name: 'KRN Heat Exchanger and Refrigeration Ltd.' },
  { symbol: 'IDEAFORGE.NS', name: 'ideaForge Technology Ltd.' },
  { symbol: 'GRSE.NS', name: 'Garden Reach Shipbuilders & Engineers Ltd.' },
  { symbol: 'PARAS.NS', name: 'Paras Defence and Space Technologies Ltd.' },
  { symbol: 'ASTRAMICRO.NS', name: 'Astra Microwave Products Ltd.' },
  { symbol: 'SYRMA.NS', name: 'Syrma SGS Technology Ltd.' },
  { symbol: 'KAYNES.NS', name: 'Kaynes Technology India Ltd.' },
  { symbol: 'AEROFLEX.NS', name: 'Aeroflex Industries Ltd.' },
  { symbol: 'KMEW.NS', name: 'Knowledge Marine & Export Works Ltd.' },
  { symbol: 'GVT&D.NS', name: 'GE Vernova T&D India Ltd.' },
  { symbol: 'CGPOWER.NS', name: 'CG Power & Industrial Solutions Ltd.' },
  { symbol: 'APOLLO.NS', name: 'Apollo Hospitals Enterprise Ltd.' },
  { symbol: 'UNIMECH.NS', name: 'Unimech Aerospace and Manufacture Ltd.' },
  { symbol: 'DATAPATTNS.NS', name: 'Data Patterns (India) Ltd.' },
  { symbol: 'MTARTECH.NS', name: 'MTAR Technologies Ltd.' },
  { symbol: 'NETWEB.NS', name: 'Netweb Technologies India Ltd.' }
];

export const WATCHLIST_SYMBOLS = DEFAULT_SEEDS.map(item => item.symbol);
export const DEFAULT_SYMBOLS = WATCHLIST_SYMBOLS;
