const xlsx = require('xlsx');

const excelPath = "C:\\Users\\VienPham\\OneDrive\\Documents\\HIS\\Document\\ICD10\\icd10.xlsx";
console.log("Reading Excel file...");
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
console.log("Sheet Name:", sheetName);

const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

if (data.length > 0) {
  console.log("First row keys:");
  Object.keys(data[0]).forEach(k => console.log(`'${k}'`));
  console.log("Total rows:", data.length);
} else {
  console.log("No data found");
}
