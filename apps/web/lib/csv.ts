// Minimal CSV parser (handles quoted fields with embedded commas) - no
// dependency needed for the bulk-upload use case in docs/03 §2 ("supporting
// bulk Excel/CSV uploads").
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (values[i] ?? "").trim()));
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export const SAMPLE_CSV = `title,gender,subCategory,basePrice,compareAtPrice,fabric,sizes,stockRemaining,description
Printed Rayon Kurti,women,Kurtis,749,999,Rayon,S;M;L;XL,15,Everyday printed rayon kurti with 3/4 sleeves
Linen Casual Shirt,men,Shirts,1199,,Linen,M;L;XL,10,Breathable linen shirt for summer
Kids Cotton Frock,kids,Girls,599,799,Cotton,2-3Y;4-5Y;6-7Y,12,Soft cotton frock with floral print
`;
