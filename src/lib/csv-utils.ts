export type ParsedCard = {
  name: string;
  set: string;
  quantity: number;
  condition: string;
  foil: boolean;
  price?: number;
};

// Helper: Remove spaces, special chars, and lowercases everything
const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

export const parseCSV = async (file: File): Promise<ParsedCard[]> => {
  console.log("📂 [Parser] Starting processing for:", file.name);
  
  let text = await file.text();
  
  // FIX 1: Remove "Byte Order Mark" (BOM) that Excel often adds to the start
  // This invisible character (\uFEFF) breaks the first header match
  text = text.replace(/^\uFEFF/, ''); 

  const lines = text.split(/\r\n|\n/);
  
  if (lines.length < 2) {
    console.error("❌ [Parser] File is too short (less than 2 lines).");
    return [];
  }

  // 1. Identify Headers
  const rawHeaders = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const headers = rawHeaders.map(normalize);
  
  console.log("🔍 [Parser] Cleaned Headers:", headers);

  // 2. Find Columns (Expanded List)
  const idx = {
    // Look for: "qty", "quantity", "count", "amount"
    qty: headers.findIndex(h => ["qty", "quantity", "count", "amount"].includes(h)),
    
    // Look for: "name", "cardname", "card", "title", "englishname"
    name: headers.findIndex(h => ["name", "cardname", "card", "title", "englishname"].includes(h)),
    
    // Look for: "set", "setcode", "edition", "code"
    set: headers.findIndex(h => ["set", "setcode", "edition", "code", "setname"].includes(h)),
    
    // Look for: "condition", "cond", "quality"
    cond: headers.findIndex(h => ["condition", "cond", "quality"].includes(h)),
    
    // Look for: "foil", "isfoil", "finish"
    foil: headers.findIndex(h => ["foil", "isfoil", "printing", "finish"].includes(h)),
    
    // Look for: "price", "marketprice", "tcgprice"
    price: headers.findIndex(h => ["price", "marketprice", "tcgprice"].includes(h))
  };

  console.log("📍 [Parser] Mappings Found:", idx);

  // 3. Fallback: If we still can't find "Name", try index 0 as a last resort
  if (idx.name === -1) {
    console.warn("⚠️ [Parser] 'Name' column not found by name. Trying first column as fallback.");
    // Only do this if we are desperate
    if (headers[0]) idx.name = 0;
  }

  if (idx.name === -1) {
    console.error("❌ [Parser] CRITICAL: Still could not find a Name column.");
    return [];
  }

  const parsedCards: ParsedCard[] = [];

  // 4. Process Rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    
    const getVal = (index: number) => {
      if (index === -1 || !cols[index]) return "";
      return cols[index].replace(/^"|"$/g, "").trim(); 
    };

    const name = getVal(idx.name);
    if (!name) continue; 

    const foilRaw = getVal(idx.foil).toLowerCase();
    const isFoil = ["true", "yes", "foil", "etched"].includes(foilRaw);

    parsedCards.push({
      name: name,
      set: getVal(idx.set) || "Unknown",
      quantity: parseInt(getVal(idx.qty)) || 1, 
      condition: getVal(idx.cond) || "NM",      
      foil: isFoil,
      price: parseFloat(getVal(idx.price)) || 0
    });
  }

  console.log(`✅ [Parser] Finished. Valid Rows: ${parsedCards.length}`);
  return parsedCards;
};