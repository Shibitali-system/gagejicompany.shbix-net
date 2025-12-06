// server/lib/checksum.js
import crypto from "crypto";

export function checksum(dataObj) {
  // Sort keys
  const keys = Object.keys(dataObj).sort();
  let concat = "";
  keys.forEach((k) => {
    concat += String(dataObj[k]);
  });

  // Append today's date (Y-m-d)
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const final = concat + today;

  return crypto.createHash("sha256").update(final).digest("hex");
}
