import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
}

loadEnv();
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  statement_timeout: 60000,
  query_timeout: 60000,
});

async function run(label, sql) {
  try {
    const result = await pool.query(sql);
    console.log(`  OK: ${label} (${result.rowCount || 0} rows)`);
    return true;
  } catch (err) {
    console.log(`  FAIL: ${label} -> ${err.message.slice(0, 200)}`);
    return false;
  }
}

async function main() {
  console.log('=== Seeding Fixed Data ===\n');

  // organizational_entities with correct legal_form enum: syndicate, association, federation, cooperative, foundation
  console.log('organizational_entities...');
  await run('org_entities', `INSERT INTO organizational_entities (unified_code, registration_number, entity_type, classification, sector, name_ar, name_en, governorate, city, establishment_date, registration_date, status, member_count, phone, email, legal_form)
    VALUES
      ('UNI-ENG-001', 'REG-ENG-001', 'union', 'professional', 'construction', 'نقابة المهندسين اليمنية', 'Yemen Engineers Syndicate', 'صنعاء', 'صنعاء', '1970-01-01', '1970-01-01', 'active', 3200, '+967-1-234567', 'info@engineers-ye.org', 'syndicate'),
      ('UNI-TEA-001', 'REG-TEA-001', 'union', 'labor', 'education', 'نقابة المعلمين اليمنيين', 'Yemen Teachers Syndicate', 'صنعاء', 'صنعاء', '1965-03-15', '1965-03-15', 'active', 15000, '+967-1-345678', 'info@teachers-ye.org', 'syndicate'),
      ('UNI-DOC-001', 'REG-DOC-001', 'union', 'professional', 'healthcare', 'نقابة الأطباء اليمنيين', 'Yemen Doctors Syndicate', 'صنعاء', 'صنعاء', '1975-06-20', '1975-06-20', 'active', 8500, '+967-1-456789', 'info@doctors-ye.org', 'syndicate'),
      ('UNI-LAW-001', 'REG-LAW-001', 'union', 'professional', 'other', 'نقابة المحامين اليمنيين', 'Yemen Lawyers Syndicate', 'صنعاء', 'صنعاء', '1968-09-10', '1968-09-10', 'active', 2100, '+967-1-567890', 'info@lawyers-ye.org', 'syndicate'),
      ('UNI-JOU-001', 'REG-JOU-001', 'union', 'professional', 'other', 'نقابة الصحفيين اليمنيين', 'Yemen Journalists Syndicate', 'صنعاء', 'صنعاء', '1980-02-28', '1980-02-28', 'active', 950, '+967-1-678901', 'info@journalists-ye.org', 'syndicate'),
      ('UNI-BUI-001', 'REG-BUI-001', 'union', 'labor', 'construction', 'نقابة عمال البناء', 'Construction Workers Union', 'عدن', 'عدن', '1985-05-01', '1985-05-01', 'active', 5600, '+967-2-123456', 'info@buildings-ye.org', 'syndicate'),
      ('UNI-TRA-001', 'REG-TRA-001', 'federation', 'labor', 'transportation', 'اتحاد عمال النقل', 'Transport Workers Federation', 'عدن', 'عدن', '1978-11-15', '1978-11-15', 'active', 4200, '+967-2-234567', 'info@transport-ye.org', 'federation'),
      ('UNI-OFF-001', 'REG-OFF-001', 'union', 'labor', 'services', 'اتحاد موظفي الدولة', 'Civil Servants Union', 'صنعاء', 'صنعاء', '1972-04-01', '1972-04-01', 'active', 25000, '+967-1-789012', 'info@civilservants-ye.org', 'federation')
    ON CONFLICT (unified_code) DO NOTHING`);

  // isic4_classifications with correct level values: section, division, group, class
  console.log('\nisic4_classifications...');
  await run('isic4', `INSERT INTO isic4_classifications (isic_code, description_ar, description_en, section_code, section_name, sector, activity_type, level)
    VALUES
      ('A', 'الزراعة والغابات والصيد', 'Agriculture, Forestry and Fishing', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary', 'section'),
      ('B', 'التعدين والمحاجر', 'Mining and Quarrying', 'B', 'التعدين والمحاجر', 'industry', 'primary', 'section'),
      ('C', 'الصناعة التحويلية', 'Manufacturing', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'section'),
      ('D', 'إمداد الكهرباء والغاز', 'Electricity, Gas, Steam', 'D', 'الطاقة', 'industry', 'secondary', 'section'),
      ('E', 'إمداد المياه والصرف الصحي', 'Water Supply; Sewerage', 'E', 'المياه', 'industry', 'secondary', 'section'),
      ('F', 'البناء', 'Construction', 'F', 'البناء', 'construction', 'secondary', 'section'),
      ('G', 'التجارة بالجملة والمفردة', 'Wholesale and Retail Trade', 'G', 'التجارة', 'trade', 'tertiary', 'section'),
      ('H', 'النقل والتخزين', 'Transportation and Storage', 'H', 'النقل', 'transportation', 'tertiary', 'section'),
      ('I', 'الضيافة وخدمات الطعام', 'Accommodation and Food Service', 'I', 'الضيافة', 'tourism', 'tertiary', 'section'),
      ('J', 'المعلومات والاتصالات', 'Information and Communication', 'J', 'التقنية', 'technology', 'quaternary', 'section'),
      ('K', 'الخدمات المالية والتأمين', 'Financial and Insurance Services', 'K', 'المالية', 'finance', 'quaternary', 'section'),
      ('L', 'العقارات', 'Real Estate Activities', 'L', 'العقارات', 'services', 'tertiary', 'section'),
      ('M', 'الخدمات المهنية والفنية', 'Professional, Scientific and Technical', 'M', 'الخدمات المهنية', 'services', 'quaternary', 'section'),
      ('N', 'خدمات الدعم وإدارة المنشآت', 'Administrative and Support Services', 'N', 'خدمات الدعم', 'services', 'tertiary', 'section'),
      ('O', 'الإدارة العامة', 'Public Administration', 'O', 'الإدارة العامة', 'services', 'quaternary', 'section'),
      ('P', 'التعليم', 'Education', 'P', 'التعليم', 'education', 'quaternary', 'section'),
      ('Q', 'الصحة البشرية', 'Human Health Activities', 'Q', 'الصحة', 'healthcare', 'quaternary', 'section'),
      ('R', 'الفنون والترفيه', 'Arts, Entertainment and Recreation', 'R', 'الفنون', 'services', 'tertiary', 'section'),
      ('S', 'خدمات أخرى', 'Other Service Activities', 'S', 'الخدمات الشخصية', 'services', 'tertiary', 'section'),
      ('T', 'الكيانات المنزلية', 'Household Employers', 'T', 'الأنشطة المنزلية', 'services', 'tertiary', 'section'),
      ('U', 'المنظمات الدولية', 'International Organisations', 'U', 'المنظمات الدولية', 'services', 'quaternary', 'section'),
      ('A01', 'زراعة المحاصيل وإنتاج الحيوانات', 'Crop and Animal Production', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary', 'division'),
      ('A02', 'الغابات', 'Forestry', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary', 'division'),
      ('A03', 'الصيد وאוטובוס الأسماك', 'Fishing and Aquaculture', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary', 'division'),
      ('B05', 'استخراج الفحم', 'Mining of Coal', 'B', 'التعدين والمحاجر', 'industry', 'primary', 'division'),
      ('B06', 'استخراج البترول والغاز', 'Extraction of Petroleum and Gas', 'B', 'التعدين والمحاجر', 'industry', 'primary', 'division'),
      ('B07', 'استخراج خامات المعادن', 'Mining of Metal Ores', 'B', 'التعدين والمحاجر', 'industry', 'primary', 'division'),
      ('B08', 'التعدين والمحاجر الأخرى', 'Other Mining and Quarrying', 'B', 'التعدين والمحاجر', 'industry', 'primary', 'division'),
      ('B09', 'الخدمات المساندة للتعدين', 'Support Activities for Mining', 'B', 'التعدين والمحاجر', 'industry', 'support', 'division'),
      ('C10', 'صناعة المنتجات الغذائية', 'Manufacture of Food Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C11', 'صناعة المشروبات', 'Manufacture of Beverages', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C13', 'صناعة المنسوجات', 'Manufacture of Textiles', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C14', 'صناعة الملابس', 'Manufacture of Wearing Apparel', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C15', 'صناعة المنتجات الجلدية', 'Manufacture of Leather Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C20', 'صناعة المواد الكيميائية', 'Manufacture of Chemicals', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C22', 'صناعة المطاط والبلاستيك', 'Manufacture of Rubber and Plastics', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C25', 'صناعة منتجات المعادن', 'Manufacture of Metal Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C26', 'صناعة الإلكترونيات', 'Manufacture of Electronic Equipment', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C28', 'صناعة الآلات والمعدات', 'Manufacture of Machinery', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C31', 'صناعة الأثاث', 'Manufacture of Furniture', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('C33', 'إصلاح وتركيب الآلات', 'Repair and Installation of Machinery', 'C', 'الصناعة التحويلية', 'industry', 'secondary', 'division'),
      ('F41', 'إنشاء المباني', 'Construction of Buildings', 'F', 'البناء', 'construction', 'secondary', 'division'),
      ('F42', 'البنية التحتية', 'Civil Engineering', 'F', 'البناء', 'construction', 'secondary', 'division'),
      ('F43', 'البناء المتخصص', 'Specialised Construction', 'F', 'البناء', 'construction', 'secondary', 'division'),
      ('G46', 'التجارة بالجملة', 'Wholesale Trade', 'G', 'التجارة', 'trade', 'tertiary', 'division'),
      ('G47', 'التجارة بالمفردة', 'Retail Trade', 'G', 'التجارة', 'trade', 'tertiary', 'division'),
      ('H49', 'النقل البري', 'Land Transport', 'H', 'النقل', 'transportation', 'tertiary', 'division'),
      ('H50', 'النقل المائي', 'Water Transport', 'H', 'النقل', 'transportation', 'tertiary', 'division'),
      ('H51', 'النقل الجوي', 'Air Transport', 'H', 'النقل', 'transportation', 'tertiary', 'division'),
      ('H52', 'التخزين والخدمات المساعدة', 'Warehousing and Support Activities', 'H', 'النقل', 'transportation', 'tertiary', 'division'),
      ('I55', 'الإقامة', 'Accommodation', 'I', 'الضيافة', 'tourism', 'tertiary', 'division'),
      ('I56', 'خدمات الطعام', 'Food and Beverage Service', 'I', 'الضيافة', 'tourism', 'tertiary', 'division'),
      ('J62', 'برمجة الحاسوب', 'Computer Programming', 'J', 'التقنية', 'technology', 'quaternary', 'division'),
      ('J61', 'الاتصالات', 'Telecommunications', 'J', 'التقنية', 'technology', 'quaternary', 'division'),
      ('K64', 'الخدمات المالية', 'Financial Services', 'K', 'المالية', 'finance', 'quaternary', 'division'),
      ('K65', 'التأمين', 'Insurance', 'K', 'المالية', 'finance', 'quaternary', 'division'),
      ('M69', 'الأنشطة القانونية والمحاسبية', 'Legal and Accounting Activities', 'M', 'الخدمات المهنية', 'services', 'quaternary', 'division'),
      ('M70', 'الإدارة والاستشارات', 'Management Consultancy', 'M', 'الخدمات المهنية', 'services', 'quaternary', 'division'),
      ('M71', 'الهندسة المعمارية والاستشارات', 'Architecture and Engineering', 'M', 'الخدمات المهنية', 'services', 'quaternary', 'division'),
      ('O84', 'الإدارة العامة', 'Public Administration', 'O', 'الإدارة العامة', 'services', 'quaternary', 'division'),
      ('P85', 'التعليم', 'Education', 'P', 'التعليم', 'education', 'quaternary', 'division'),
      ('Q86', 'الصحة البشرية', 'Human Health Activities', 'Q', 'الصحة', 'healthcare', 'quaternary', 'division'),
      ('N80', 'الأمن والحراسة', 'Security and Investigation', 'N', 'خدمات الدعم', 'services', 'tertiary', 'division'),
      ('S94', 'المنظمات الأهلية', 'Membership Organisations', 'S', 'الخدمات الشخصية', 'services', 'tertiary', 'division'),
      ('S96', 'الخدمات الشخصية الأخرى', 'Other Personal Service Activities', 'S', 'الخدمات الشخصية', 'services', 'tertiary', 'division')
    ON CONFLICT (isic_code) DO NOTHING`);

  await pool.end();
  console.log('\nDone.');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
