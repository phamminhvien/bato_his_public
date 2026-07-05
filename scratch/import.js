const xlsx = require('xlsx');
const sql = require('mssql/msnodesqlv8');

const excelPath = "C:\\Users\\VienPham\\OneDrive\\Documents\\HIS\\Document\\ICD10\\icd10.xlsx";
const connectionString = 'Driver={ODBC Driver 17 for SQL Server};Server=(localdb)\\MSSQLLocalDB;Database=BATO_HOSPITAL;Trusted_Connection=yes;';

const keyMap = {
  'STT': 'STT',
  'STT CHƯƠNG': 'STT_CHUONG',
  'PHẠM VI MÃ NHÓM BỆNH': 'PHAM_VI_MA_NHOM_BENH',
  'CHAPTER NAME': 'CHAPTER_NAME',
  'TÊN CHƯƠNG': 'TEN_CHUONG',
  'MÃ KHỐI': 'MA_KHOI',
  'BLOCK NAME': 'BLOCK_NAME',
  'TÊN KHỐI': 'TEN_KHOI',
  'MÃ TIỂU KHỐI CẤP 1': 'MA_TIEU_KHOI_CAP_1',
  'FIRST SUB- DIVISION NAME': 'FIRST_SUB_DIVISION_NAME', 
  'TÊN TIỂU KHỐI CẤP 1': 'TEN_TIEU_KHOI_CAP_1',
  'MÃ TIỂU KHỐI CẤP 2': 'MA_TIEU_KHOI_CAP_2',
  'SECOND SUB- DIVISION NAME': 'SECOND_SUB_DIVISION_NAME', 
  'TÊN TIỂU KHỐI CẤP 2': 'TEN_TIEU_KHOI_CAP_2',
  'MÃ NHÓM BỆNH 3 KÝ TỰ': 'MA_NHOM_BENH_3_KY_TU',
  '3-CHARACTER SUB-CATEGORY NAME': 'THREE_CHARACTER_SUB_CATEGORY_NAME',
  'TÊN NHÓM BỆNH 3 KÝ TỰ': 'TEN_NHOM_BENH_3_KY_TU',
  'MÃ BỆNH': 'MA_BENH',
  'MÃ BỆNH KHÔNG DẤU': 'MA_BENH_KHONG_DAU',
  'DISEASE NAME WHO 2019 (ENGLISH)': 'DISEASE_NAME_WHO_2019_ENGLISH',
  'ADDITIONAL CODING GUIDANCE WHO 2019 (ENGLISH)': 'ADDITIONAL_CODING_GUIDANCE_WHO_2019_ENGLISH',
  'TÊN BỆNH': 'TEN_BENH',
  'HƯỚNG DẪN MÃ HÓA BỔ SUNG CỦA WHO 2019': 'HUONG_DAN_MA_HOA_BO_SUNG_CUA_WHO_2019',
  'MÃ KHÔNG ĐƯỢC DÙNG LÀ BỆNH CHÍNH': 'MA_KHONG_DUOC_DUNG_LA_BENH_CHINH',
  'MÃ KHÔNG KHUYẾN KHÍCH DÙNG LÀ BỆNH CHÍNH': 'MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH',
  'MÃ KHÔNG ĐƯỢC SỬ DỤNG VÌ CÓ MÃ 4 HOẶC 5 KÝ TỰ CỤ THỂ HƠN': 'MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON',
  'CHỈ SỬ DỤNG MÃ HÓA NGUYÊN NHÂN TỬ VONG': 'CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG',
  'CÁC MÃ BỆNH CHỈ CÓ HOẶC CHỦ YẾU CÓ Ở NỮ GIỚI': 'CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI',
  'CÁC MÃ BỆNH CHỈ CÓ HOẶC CHỦ YẾU CÓ Ở NAM GIỚI': 'CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI'
};

async function run() {
  try {
    console.log("Reading Excel file...");
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: null });

    console.log(`Found ${rawData.length} rows. Mapping columns...`);

    const mappedData = rawData.map(row => {
      const newRow = {};
      for (const [excelKey, sqlKey] of Object.entries(keyMap)) {
        let val = row[excelKey];
        if (typeof val === 'string') val = val.trim();
        newRow[sqlKey] = val;
      }
      return newRow;
    });

    console.log("Connecting to SQL Server...");
    await sql.connect({
      connectionString: connectionString
    });
    console.log("Connected! Emptying existing table data just in case...");
    
    await sql.query`TRUNCATE TABLE [dbo].[ICD10_NEW]`;

    console.log("Inserting data in batches...");
    
    // Create Table for Bulk Insert
    const table = new sql.Table('ICD10_NEW');
    table.create = false;
    
    table.columns.add('STT', sql.Int, {nullable: true});
    table.columns.add('STT_CHUONG', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('PHAM_VI_MA_NHOM_BENH', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('CHAPTER_NAME', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('TEN_CHUONG', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('MA_KHOI', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('BLOCK_NAME', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('TEN_KHOI', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('MA_TIEU_KHOI_CAP_1', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('FIRST_SUB_DIVISION_NAME', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('TEN_TIEU_KHOI_CAP_1', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('MA_TIEU_KHOI_CAP_2', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('SECOND_SUB_DIVISION_NAME', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('TEN_TIEU_KHOI_CAP_2', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('MA_NHOM_BENH_3_KY_TU', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('THREE_CHARACTER_SUB_CATEGORY_NAME', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('TEN_NHOM_BENH_3_KY_TU', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('MA_BENH', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('MA_BENH_KHONG_DAU', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('DISEASE_NAME_WHO_2019_ENGLISH', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('ADDITIONAL_CODING_GUIDANCE_WHO_2019_ENGLISH', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('TEN_BENH', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('HUONG_DAN_MA_HOA_BO_SUNG_CUA_WHO_2019', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('MA_KHONG_DUOC_DUNG_LA_BENH_CHINH', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI', sql.NVarChar(sql.MAX), {nullable: true});
    table.columns.add('CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI', sql.NVarChar(sql.MAX), {nullable: true});

    for (const row of mappedData) {
      table.rows.add(
        row.STT ? parseInt(row.STT) : null,
        row.STT_CHUONG,
        row.PHAM_VI_MA_NHOM_BENH,
        row.CHAPTER_NAME,
        row.TEN_CHUONG,
        row.MA_KHOI,
        row.BLOCK_NAME,
        row.TEN_KHOI,
        row.MA_TIEU_KHOI_CAP_1,
        row.FIRST_SUB_DIVISION_NAME,
        row.TEN_TIEU_KHOI_CAP_1,
        row.MA_TIEU_KHOI_CAP_2,
        row.SECOND_SUB_DIVISION_NAME,
        row.TEN_TIEU_KHOI_CAP_2,
        row.MA_NHOM_BENH_3_KY_TU,
        row.THREE_CHARACTER_SUB_CATEGORY_NAME,
        row.TEN_NHOM_BENH_3_KY_TU,
        row.MA_BENH,
        row.MA_BENH_KHONG_DAU,
        row.DISEASE_NAME_WHO_2019_ENGLISH,
        row.ADDITIONAL_CODING_GUIDANCE_WHO_2019_ENGLISH,
        row.TEN_BENH,
        row.HUONG_DAN_MA_HOA_BO_SUNG_CUA_WHO_2019,
        row.MA_KHONG_DUOC_DUNG_LA_BENH_CHINH,
        row.MA_KHONG_KHUYEN_KHICH_DUNG_LA_BENH_CHINH,
        row.MA_KHONG_DUOC_SU_DUNG_VI_CO_MA_4_HOAC_5_KY_TU_CU_THE_HON,
        row.CHI_SU_DUNG_MA_HOA_NGUYEN_NHAN_TU_VONG,
        row.CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NU_GIOI,
        row.CAC_MA_BENH_CHI_CO_HOAC_CHU_YEU_CO_O_NAM_GIOI
      );
    }

    const request = new sql.Request();
    const result = await request.bulk(table);

    console.log(`✅ Successfully imported ${result.rowsAffected} rows into [ICD10_NEW]!`);
    
  } catch (error) {
    console.error("❌ Error occurred:", error);
  } finally {
    sql.close();
  }
}

run();
