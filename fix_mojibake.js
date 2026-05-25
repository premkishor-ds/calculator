const fs = require('fs');
const path = require('path');

const win1252ToByte = {
  0x20ac: 0x80, 0x81: 0x81, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89,
  0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x8d: 0x8d, 0x017d: 0x8e,
  0x8f: 0x8f, 0x90: 0x90, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x9d: 0x9d,
  0x017e: 0x9e, 0x0178: 0x9f
};

function getByte(code) {
  if (code < 0x80) return code;
  if (code >= 0xa0 && code <= 0xff) return code;
  if (win1252ToByte[code] !== undefined) return win1252ToByte[code];
  return null;
}

function fixMojibake(text) {
  let result = '';
  let i = 0;
  let changed = false;
  while (i < text.length) {
    let charCode = text.charCodeAt(i);
    let byte = getByte(charCode);
    
    if (byte !== null && byte >= 0xC2) {
      let expectedLen = 0;
      if (byte >= 0xC2 && byte <= 0xDF) expectedLen = 2;
      else if (byte >= 0xE0 && byte <= 0xEF) expectedLen = 3;
      else if (byte >= 0xF0 && byte <= 0xF4) expectedLen = 4;
      
      if (expectedLen > 0) {
        let tempBytes = [byte];
        let isValidSequence = true;
        let j = i + 1;
        
        for (let k = 1; k < expectedLen; k++) {
          if (j >= text.length) { isValidSequence = false; break; }
          let b = getByte(text.charCodeAt(j));
          if (b === null || b < 0x80 || b > 0xBF) {
            isValidSequence = false; break;
          }
          tempBytes.push(b);
          j++;
        }
        
        if (isValidSequence) {
          while (j < text.length) {
            if (j + 2 < text.length) {
               let b1 = getByte(text.charCodeAt(j));
               let b2 = getByte(text.charCodeAt(j+1));
               let b3 = getByte(text.charCodeAt(j+2));
               if (b1 === 0xEF && b2 === 0xB8 && b3 === 0x8F) {
                 tempBytes.push(0xEF, 0xB8, 0x8F);
                 j += 3;
                 continue;
               }
            }
            break;
          }
          
          try {
            let decoded = Buffer.from(tempBytes).toString('utf8');
            if (decoded.indexOf('\uFFFD') === -1) {
              result += decoded;
              i = j;
              changed = true;
              continue;
            }
          } catch(e) {}
        }
      }
    }
    result += text[i];
    i++;
  }
  return { result, changed };
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const { result, changed } = fixMojibake(content);
      if (changed) {
        fs.writeFileSync(fullPath, result, 'utf8');
        console.log('Fixed:', fullPath);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
