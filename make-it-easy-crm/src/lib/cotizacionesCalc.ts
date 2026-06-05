import { Cotizacion } from "./types";

export function getNextCodigo(all: Cotizacion[]): string {
    const year = new Date().getFullYear();
    let maxNum = year === 2026 ? 31 : 0; // maintain continuity or base start
    
    all.forEach((c) => {
        const match = c.codigo.match(/PROP-(\d+)-(\d{4})/);
        const matchOld = c.codigo.match(/COT-(\d+)-(\d{4})/);
        
        if (match) {
            const n = parseInt(match[1], 10);
            const y = parseInt(match[2], 10);
            if (y === year && n > maxNum) maxNum = n;
        } else if (matchOld) {
            const n = parseInt(matchOld[1], 10);
            const y = parseInt(matchOld[2], 10);
            if (y === year && n > maxNum) maxNum = n;
        }
    });
    return `PROP-${String(maxNum + 1).padStart(3, "0")}-${year}`;
}
