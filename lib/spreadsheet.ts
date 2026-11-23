export type SheetCell = string | number | null;

function xml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function spreadsheetXml(sheets: { name: string; rows: SheetCell[][] }[]) {
  const body = sheets
    .map((sheet) => {
      const rows = sheet.rows
        .map((row) => {
          const cells = row
            .map((cell) => {
              if (typeof cell === "number" && Number.isFinite(cell)) {
                return `<Cell><Data ss:Type="Number">${cell}</Data></Cell>`;
              }
              return `<Cell><Data ss:Type="String">${xml(cell == null ? "" : String(cell))}</Data></Cell>`;
            })
            .join("");
          return `<Row>${cells}</Row>`;
        })
        .join("");
      const name = xml(sheet.name).slice(0, 31);
      return `<Worksheet ss:Name="${name}"><Table>${rows}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${body}
</Workbook>`;
}
