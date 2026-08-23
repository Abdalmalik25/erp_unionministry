-- ============================================================================
-- official_national_classifications.sql — السجلات المعيارية الرسمية النهائية
-- المحتوى الرسمي الكامل وفق المراجع الدولية والوطنية:
--   • ISCO-08 (منظمة العمل الدولية): 10 مجموعات رئيسية + 43 مجموعة فرعية رئيسية
--   • ISIC Rev.4 (الأمم المتحدة): 21 قسماً + 88 فرعاً (رمزان رقميان)
--   • قانون الشركات اليمني رقم 4 لسنة 2009: الأشكال القانونية الرسمية
--   • تصنيف التملك المؤسسي المعتمد
--
-- منهجية هرمية معيارية: parent_code يربط كل مستوى بأبيه الرسمي
-- ============================================================================

-- ============================================================================
-- 1) ISCO-08 — المجموعات الرئيسية العشر (تحديث + إضافة القوات المسلحة)
-- ============================================================================
INSERT INTO national_directories (directory_type, code, name_ar, name_en, level, sort_order)
VALUES
  ('occupation', 'ISCO-0', 'القوات المسلحة', 'Armed Forces Occupations', 1, 0),
  ('occupation', 'ISCO-1', 'المديرون', 'Managers', 1, 1),
  ('occupation', 'ISCO-2', 'المهنيون', 'Professionals', 1, 2),
  ('occupation', 'ISCO-3', 'الفنيون والمهنيون المساعدون', 'Technicians and Associate Professionals', 1, 3),
  ('occupation', 'ISCO-4', 'موظفو الخدمات المكتبية', 'Clerical Support Workers', 1, 4),
  ('occupation', 'ISCO-5', 'عاملو الخدمات والبيع', 'Service and Sales Workers', 1, 5),
  ('occupation', 'ISCO-6', 'العاملون المهرة في الزراعة والحراجة وصيد الأسماك', 'Skilled Agricultural, Forestry and Fishery Workers', 1, 6),
  ('occupation', 'ISCO-7', 'الحرفيون والعاملون في الصناعات والبناء', 'Craft and Related Trades Workers', 1, 7),
  ('occupation', 'ISCO-8', 'مشغلو المصانع والآلات والتجميع', 'Plant and Machine Operators and Assemblers', 1, 8),
  ('occupation', 'ISCO-9', 'المهن الابتدائية', 'Elementary Occupations', 1, 9)
ON CONFLICT (directory_type, code) DO UPDATE SET name_ar = EXCLUDED.name_ar;

-- ============================================================================
-- 2) ISCO-08 — المجموعات الفرعية الرئيسية الثلاث والأربعون (رمزان رقميان)
-- ============================================================================
INSERT INTO national_directories (directory_type, code, name_ar, name_en, parent_code, level, sort_order)
VALUES
  -- المجموعة 0: القوات المسلحة
  ('occupation','ISCO-01','ضباط القوات المسلحة المفوضون','Commissioned Armed Forces Officers','ISCO-0',2,1),
  ('occupation','ISCO-02','ضباط صف القوات المسلحة','Non-commissioned Armed Forces Officers','ISCO-0',2,2),
  ('occupation','ISCO-03','مهن القوات المسلحة — رتب أخرى','Armed Forces Occupations, Other Ranks','ISCO-0',2,3),
  -- المجموعة 1: المديرون
  ('occupation','ISCO-11','المدراء التنفيذيون وكبار المسؤولين والمشرعون','Chief Executives, Senior Officials and Legislators','ISCO-1',2,1),
  ('occupation','ISCO-12','المديرون الإداريون والتجاريون','Administrative and Commercial Managers','ISCO-1',2,2),
  ('occupation','ISCO-13','مديرو الإنتاج والخدمات المتخصصة','Production and Specialised Services Managers','ISCO-1',2,3),
  ('occupation','ISCO-14','مديرو الضيافة وتجارة التجزئة والخدمات الأخرى','Hospitality, Retail and Other Services Managers','ISCO-1',2,4),
  -- المجموعة 2: المهنيون
  ('occupation','ISCO-21','المهنيون في العلوم والهندسة','Science and Engineering Professionals','ISCO-2',2,1),
  ('occupation','ISCO-22','المهنيون الصحيون','Health Professionals','ISCO-2',2,2),
  ('occupation','ISCO-23','المهنيون التعليميون','Teaching Professionals','ISCO-2',2,3),
  ('occupation','ISCO-24','مهنيو الأعمال والإدارة','Business and Administration Professionals','ISCO-2',2,4),
  ('occupation','ISCO-25','مهنيو تقنية المعلومات والاتصالات','Information and Communications Technology Professionals','ISCO-2',2,5),
  ('occupation','ISCO-26','المهنيون القانونيون والاجتماعيون والثقافيون','Legal, Social and Cultural Professionals','ISCO-2',2,6),
  -- المجموعة 3: الفنيون والمهنيون المساعدون
  ('occupation','ISCO-31','مساعدو مهنيو العلوم والهندسة','Science and Engineering Associate Professionals','ISCO-3',2,1),
  ('occupation','ISCO-32','مساعدو المهنيين الصحيين','Health Associate Professionals','ISCO-3',2,2),
  ('occupation','ISCO-33','مساعدو مهنيو الأعمال والإدارة','Business and Administration Associate Professionals','ISCO-3',2,3),
  ('occupation','ISCO-34','مساعدو المهنيين القانونيين والاجتماعيين والثقافيين','Legal, Social, Cultural and Related Associate Professionals','ISCO-3',2,4),
  ('occupation','ISCO-35','فنيو تقنية المعلومات والاتصالات','Information and Communications Technicians','ISCO-3',2,5),
  -- المجموعة 4: موظفو الخدمات المكتبية
  ('occupation','ISCO-41','موظفو المكاتب العامون ولوحات المفاتيح','General and Keyboard Clerks','ISCO-4',2,1),
  ('occupation','ISCO-42','موظفو خدمات العملاء','Customer Services Clerks','ISCO-4',2,2),
  ('occupation','ISCO-43','موظفو التسجيل الرقمي والمادي','Numerical and Material Recording Clerks','ISCO-4',2,3),
  ('occupation','ISCO-44','عاملو الدعم المكتب الآخرون','Other Clerical Support Workers','ISCO-4',2,4),
  -- المجموعة 5: عاملو الخدمات والبيع
  ('occupation','ISCO-51','عاملو الخدمات الشخصية','Personal Service Workers','ISCO-5',2,1),
  ('occupation','ISCO-52','عاملو البيع','Sales Workers','ISCO-5',2,2),
  ('occupation','ISCO-53','عاملو الرعاية الشخصية','Personal Care Workers','ISCO-5',2,3),
  ('occupation','ISCO-54','عاملو الخدمات الوقائية','Protective Services Workers','ISCO-5',2,4),
  -- المجموعة 6: الزراعة والحراجة وصيد الأسماك
  ('occupation','ISCO-61','العمال المهرة الزراعيون الموجهون للسوق','Market-oriented Skilled Agricultural Workers','ISCO-6',2,1),
  ('occupation','ISCO-62','العمال المهرة في الحراجة وصيد الأسماك والصيد الموجه للسوق','Market-oriented Skilled Forestry, Fishery and Hunting Workers','ISCO-6',2,2),
  ('occupation','ISCO-63','المزارعون وصيادو الأسماك والصيادون والجامعون للاكتفاء الذاتي','Subsistence Farmers, Fishers, Hunters and Gatherers','ISCO-6',2,3),
  -- المجموعة 7: الحرفيون والصناعات والبناء
  ('occupation','ISCO-71','عمال البناء والحرف ذات الصلة (عدا الكهربائيين)','Building and Related Trades Workers (excluding Electricians)','ISCO-7',2,1),
  ('occupation','ISCO-72','عمال المعادن والآلات والحرف ذات الصلة','Metal, Machinery and Related Trades Workers','ISCO-7',2,2),
  ('occupation','ISCO-73','عمال الحرف اليدوية والطباعة','Handicraft and Printing Workers','ISCO-7',2,3),
  ('occupation','ISCO-74','عمال حرف الكهرباء والإلكترونيات','Electrical and Electronic Trades Workers','ISCO-7',2,4),
  ('occupation','ISCO-75','عمال معالجة الأغذية والأعمال الخشبية والملابس وحرف أخرى ذات صلة','Food Processing, Wood Working, Garment and Other Craft and Related Trades Workers','ISCO-7',2,5),
  -- المجموعة 8: مشغلو المصانع والآلات
  ('occupation','ISCO-81','مشغلو المنشآت الثابتة والآلات','Stationary Plant and Machine Operators','ISCO-8',2,1),
  ('occupation','ISCO-82','المجمّعون','Assemblers','ISCO-8',2,2),
  ('occupation','ISCO-83','السائقون ومشغلو المعدات المتنقلة','Drivers and Mobile Plant Operators','ISCO-8',2,3),
  -- المجموعة 9: المهن الابتدائية
  ('occupation','ISCO-91','عمال النظافة والمساعدون','Cleaning and Helpers','ISCO-9',2,1),
  ('occupation','ISCO-92','عمالة زراعية وحراجية وأسماك','Agricultural, Forestry and Fishery Labourers','ISCO-9',2,2),
  ('occupation','ISCO-93','عمالة التعدين والبناء والتصنيع والنقل','Labourers in Mining, Construction, Manufacturing and Transport','ISCO-9',2,3),
  ('occupation','ISCO-94','مساعدو إعداد الطعام','Food Preparation Assistants','ISCO-9',2,4),
  ('occupation','ISCO-95','عمال البيع والخدمات في الشوارع وذوو الصلة','Street and Related Sales and Service Workers','ISCO-9',2,5),
  ('occupation','ISCO-96','عمال النفايات وعمال ابتدائيون آخرون','Refuse Workers and Other Elementary Workers','ISCO-9',2,6)
ON CONFLICT (directory_type, code) DO NOTHING;

-- ============================================================================
-- 3) ISIC Rev.4 — الفروع الثمانية والثمانون (رمزان رقميان) تحت أقسامها
-- ============================================================================
INSERT INTO national_directories (directory_type, code, name_ar, name_en, parent_code, level, sort_order)
VALUES
  -- القسم A: الزراعة والحراجة وصيد الأسماك
  ('activity','ISIC-01','زراعة وثروة حيوانية وصيد','Crop and Animal Production, Hunting','A',2,1),
  ('activity','ISIC-02','حراجة واستخراج أخشاب','Forestry and Logging','A',2,2),
  ('activity','ISIC-03','صيد أسماك وتربية أحياء مائية','Fishing and Aquaculture','A',2,3),
  -- القسم B: التعدين
  ('activity','ISIC-05','استخراج الفحم','Mining of Coal and Lignite','B',2,1),
  ('activity','ISIC-06','استخراج النفط الخام والغاز الطبيعي','Extraction of Crude Petroleum and Natural Gas','B',2,2),
  ('activity','ISIC-07','استخراج خامات المعادن','Mining of Metal Ores','B',2,3),
  ('activity','ISIC-08','أنشطة تعدينية أخرى','Other Mining and Quarrying','B',2,4),
  ('activity','ISIC-09','خدمات دعم أنشطة التعدين','Mining Support Service Activities','B',2,5),
  -- القسم C: الصناعات التحويلية
  ('activity','ISIC-10','صناعة الأغذية','Manufacture of Food Products','C',2,1),
  ('activity','ISIC-11','صناعة المشروبات','Manufacture of Beverages','C',2,2),
  ('activity','ISIC-12','منتجات التبغ','Manufacture of Tobacco Products','C',2,3),
  ('activity','ISIC-13','صناعة النسيج','Manufacture of Textiles','C',2,4),
  ('activity','ISIC-14','صناعة الملابس','Manufacture of Wearing Apparel','C',2,5),
  ('activity','ISIC-15','صناعة الجلود ومنتجاتها','Manufacture of Leather and Related Products','C',2,6),
  ('activity','ISIC-16','صناعة الأخشاب ومنتجاتها عدا الأثاث','Manufacture of Wood and Products of Wood','C',2,7),
  ('activity','ISIC-17','صناعة الورق ومنتجاته','Manufacture of Paper and Paper Products','C',2,8),
  ('activity','ISIC-18','الطباعة وإعادة إنتاج الوسائط المسجلة','Printing and Reproduction of Recorded Media','C',2,9),
  ('activity','ISIC-19','صناعة فحم الكوك والمنتجات النفطية المكررة','Manufacture of Coke and Refined Petroleum Products','C',2,10),
  ('activity','ISIC-20','صناعة المواد الكيميائية','Manufacture of Chemicals and Chemical Products','C',2,11),
  ('activity','ISIC-21','صناعة المستحضرات الصيدلانية','Manufacture of Pharmaceuticals','C',2,12),
  ('activity','ISIC-22','صناعة المطاط والبلاستيك','Manufacture of Rubber and Plastics Products','C',2,13),
  ('activity','ISIC-23','صناعة المنتجات المعدنية غير المعدنية الأخرى','Manufacture of Other Non-metallic Mineral Products','C',2,14),
  ('activity','ISIC-24','صناعة المعادن الأساسية','Manufacture of Basic Metals','C',2,15),
  ('activity','ISIC-25','تصنيع المنتجات المعدنية المصنعة عدا الآلات','Fabrication of Metal Products except Machinery','C',2,16),
  ('activity','ISIC-26','صناعة أجهزة الحاسوب والإلكترونيات والبصريات','Manufacture of Computer, Electronic and Optical Products','C',2,17),
  ('activity','ISIC-27','صناعة المعدات الكهربائية','Manufacture of Electrical Equipment','C',2,18),
  ('activity','ISIC-28','صناعة الآلات والمعدات','Manufacture of Machinery and Equipment','C',2,19),
  ('activity','ISIC-29','صناعة السيارات والمقطورات','Manufacture of Motor Vehicles and Trailers','C',2,20),
  ('activity','ISIC-30','صناعة وسائل النقل الأخرى','Manufacture of Other Transport Equipment','C',2,21),
  ('activity','ISIC-31','صناعة الأثاث','Manufacture of Furniture','C',2,22),
  ('activity','ISIC-32','صناعات التصنيع الأخرى','Other Manufacturing','C',2,23),
  ('activity','ISIC-33','إصلاح وتركيب الآلات والمعدات','Repair and Installation of Machinery and Equipment','C',2,24),
  -- القسم D: الكهرباء والغاز
  ('activity','ISIC-35','إمداد الكهرباء والغاز والبخار وتكييف الهواء','Electricity, Gas, Steam and Air Conditioning Supply','D',2,1),
  -- القسم E: المياه والصرف والنفايات
  ('activity','ISIC-36','جمع ومعالجة وتوزيع المياه','Water Collection, Treatment and Supply','E',2,1),
  ('activity','ISIC-37','صرف الصحي','Sewerage','E',2,2),
  ('activity','ISIC-38','جمع ومعالجة والتخلص من النفايات','Waste Collection, Treatment and Disposal','E',2,3),
  ('activity','ISIC-39','أعمال المعالجة والتدبير البيئي الأخرى','Remediation and Other Waste Management Services','E',2,4),
  -- القسم F: التشييد والبناء
  ('activity','ISIC-41','إنشاء المباني','Construction of Buildings','F',2,1),
  ('activity','ISIC-42','أعمال الهندسة المدنية','Civil Engineering','F',2,2),
  ('activity','ISIC-43','أنشطة البناء المتخصصة','Specialized Construction Activities','F',2,3),
  -- القسم G: التجارة
  ('activity','ISIC-45','تجارة الجملة والمفردة وإصلاح المركبات الآلية','Wholesale/Retail Trade and Repair of Motor Vehicles','G',2,1),
  ('activity','ISIC-46','تجارة الجملة عدا المركبات الآلية','Wholesale Trade except Motor Vehicles','G',2,2),
  ('activity','ISIC-47','تجارة التجزئة عدا المركبات الآلية','Retail Trade except Motor Vehicles','G',2,3),
  -- القسم H: النقل والتخزين
  ('activity','ISIC-49','نقل بري وأنابيب','Land Transport and Transport via Pipelines','H',2,1),
  ('activity','ISIC-50','نقل بحري','Water Transport','H',2,2),
  ('activity','ISIC-51','نقل جوي','Air Transport','H',2,3),
  ('activity','ISIC-52','تخزين وأنشطة دعم النقل','Warehousing and Support Activities for Transportation','H',2,4),
  ('activity','ISIC-53','بريد وخدمات توصيل','Postal and Courier Activities','H',2,5),
  -- القسم I: الإقامة والطعام
  ('activity','ISIC-55','خدمات الإقامة','Accommodation','I',2,1),
  ('activity','ISIC-56','خدمات الطعام والمشروبات','Food and Beverage Service Activities','I',2,2),
  -- القسم J: المعلومات والاتصالات
  ('activity','ISIC-58','أنشطة النشر','Publishing Activities','J',2,1),
  ('activity','ISIC-59','إنتاج الأفلام والفيديو والتلفزيون والموسيقى','Motion Picture, Video, TV and Sound Recording','J',2,2),
  ('activity','ISIC-60','أنشطة البث','Broadcasting Activities','J',2,3),
  ('activity','ISIC-61','اتصالات سلكية ولاسلكية','Telecommunications','J',2,4),
  ('activity','ISIC-62','تطوير أنظمة الحاسوب والاستشارات','Computer Programming and Consultancy','J',2,5),
  ('activity','ISIC-63','أنشطة خدمات المعلومات','Information Service Activities','J',2,6),
  -- القسم K: المالية والتأمين
  ('activity','ISIC-64','الخدمات المالية عدا التأمين وصناديق التقاعد','Financial Service Activities except Insurance','K',2,1),
  ('activity','ISIC-65','التأمين وإعادة التأمين وصناديق التقاعد','Insurance, Reinsurance and Pension Funding','K',2,2),
  ('activity','ISIC-66','أنشطة مساعدة الخدمات المالية والتأمين','Activities Auxiliary to Financial and Insurance','K',2,3),
  -- القسم L: العقارات
  ('activity','ISIC-68','أنشطة عقارية','Real Estate Activities','L',2,1),
  -- القسم M: المهنية والعلمية والتقنية
  ('activity','ISIC-69','أنشطة قانونية ومحاسبية','Legal and Accounting Activities','M',2,1),
  ('activity','ISIC-70','المكاتب الرئيسية والاستشارات الإدارية','Head Offices; Management Consultancy','M',2,2),
  ('activity','ISIC-71','عمارة وهندسة والاختبار والتحليل التقني','Architectural, Engineering; Technical Testing','M',2,3),
  ('activity','ISIC-72','البحث العلمي والتطوير','Scientific Research and Development','M',2,4),
  ('activity','ISIC-73','الإعلان وأبحاث السوق','Advertising and Market Research','M',2,5),
  ('activity','ISIC-74','أنشطة مهنية وعلمية وتقنية أخرى','Other Professional, Scientific and Technical','M',2,6),
  ('activity','ISIC-75','أنشطة بيطرية','Veterinary Activities','M',2,7),
  -- القسم N: الخدمات الإدارية والدعم
  ('activity','ISIC-77','تأجير وتشغيل الأصول الملموسة وغير الملموسة','Rental and Leasing Activities','N',2,1),
  ('activity','ISIC-78','أنشطة التوظيف','Employment Activities','N',2,2),
  ('activity','ISIC-79','وكالات السفر والأنشطة السياحية','Travel Agency and Tour Operator Activities','N',2,3),
  ('activity','ISIC-80','أنشطة أمن وتحقيق','Security and Investigation Activities','N',2,4),
  ('activity','ISIC-81','خدمات المباني والتنسيق','Services to Buildings and Landscape','N',2,5),
  ('activity','ISIC-82','أنشطة مكتبية إدارية ودعم أعمال','Office Administrative and Business Support','N',2,6),
  -- القسم O: الإدارة العامة
  ('activity','ISIC-84','الإدارة العامة والدفاع؛ الضمان الاجتماعي الإلزامي','Public Administration and Defence; Compulsory Social Security','O',2,1),
  -- القسم P: التعليم
  ('activity','ISIC-85','التعليم','Education','P',2,1),
  -- القسم Q: الصحة والعمل الاجتماعي
  ('activity','ISIC-86','أنشطة الرعاية الصحية البشرية','Human Health Activities','Q',2,1),
  ('activity','ISIC-87','أنشطة الرعاية السكنية','Residential Care Activities','Q',2,2),
  ('activity','ISIC-88','أنشطة عمل اجتماعي دون إقامة','Social Work Activities without Accommodation','Q',2,3),
  -- القسم R: الفنون والترفيه
  ('activity','ISIC-90','أنشطة إبداعية وفنية وترفيهية','Creative, Arts and Entertainment Activities','R',2,1),
  ('activity','ISIC-91','مكتبات وأرشيف ومتاحف وأنشطة ثقافية','Libraries, Archives, Museums and Cultural Activities','R',2,2),
  ('activity','ISIC-92','أنشطة المقامرة والمراهنات','Gambling and Betting Activities','R',2,3),
  -- القسم S: الخدمات الأخرى
  ('activity','ISIC-94','أنشطة المنظمات الأعضاء','Activities of Membership Organizations','S',2,1),
  ('activity','ISIC-95','إصلاح أجهزة الحاسوب والممتلكات الشخصية والمنزلية','Repair of Computers and Personal Goods','S',2,2),
  ('activity','ISIC-96','أنشطة شخصية أخرى','Other Personal Service Activities','S',2,3),
  -- القسم T: الأسر المعيشية
  ('activity','ISIC-97','أنشطة الأسر المعيشية كأرباب عمل لموظفي منازل','Households as Employers of Domestic Personnel','T',2,1),
  ('activity','ISIC-98','أنشطة غير متمايزة للأسر المعيشية المنتجة','Undifferentiated Goods-Producing Households','T',2,2),
  -- القسم U: خارج الحدود الإقليمية
  ('activity','ISIC-99','أنشطة المنظمات والهيئات خارج الحدود الإقليمية','Extraterritorial Organizations and Bodies','U',2,1)
ON CONFLICT (directory_type, code) DO NOTHING;

-- ============================================================================
-- 4) الأشكال القانونية الرسمية — قانون الشركات اليمني رقم 4 لسنة 2009
-- ============================================================================
INSERT INTO national_directories (directory_type, code, name_ar, name_en, level, sort_order)
VALUES
  ('legal_form','LF-SA','شركة مساهمة','Joint Stock Company',1,1),
  ('legal_form','LF-LLC','شركة ذات مسؤولية محدودة','Limited Liability Company',1,2),
  ('legal_form','LF-GP','شركة تضامن','General Partnership',1,3),
  ('legal_form','LF-LP','شركة توصية بسيطة','Limited Partnership',1,4),
  ('legal_form','LF-JSP','شركة توصية بالأسهم','Joint Stock Partnership (Commandite by Shares)',1,5),
  ('legal_form','LF-SOLE','مؤسسة فردية','Sole Proprietorship',1,6),
  ('legal_form','LF-PROF','شراكة مهنية','Professional Partnership',1,7),
  ('legal_form','LF-FBR','فرع شركة أجنبية','Branch of Foreign Company',1,8),
  ('legal_form','LF-NGO','منظمة غير حكومية / جمعية أهلية','Non-Governmental Organization',1,9),
  ('legal_form','LF-COOP','جمعية تعاونية','Cooperative Society',1,10),
  ('legal_form','LF-UNION','نقابة أو اتحاد مهني/عمالي','Trade Union / Professional Association',1,11),
  ('legal_form','LF-PUB','منشأة حكومية / مؤسسة عامة','Public Establishment',1,12),
  ('legal_form','LF-MICRO','مشروع متناهي الصغر (نشاط فردي)','Micro Enterprise (Individual Activity)',1,13)
ON CONFLICT (directory_type, code) DO NOTHING;

-- تعطيل الأشكال العامة القديمة بعد اعتماد الرسمية (حذف ناعم يحفظ التاريخ)
UPDATE national_directories SET is_active = FALSE
WHERE directory_type = 'legal_form' AND code IN ('COM','EST','SHOP','OFF','CTR');

-- ============================================================================
-- 5) أنواع التملك المؤسسية المعتمدة
-- ============================================================================
INSERT INTO national_directories (directory_type, code, name_ar, name_en, level, sort_order)
VALUES
  ('ownership','OW-GOV','حكومي','Government',1,1),
  ('ownership','OW-PUB','قطاع عام / مؤسسات عامة','Public Sector',1,2),
  ('ownership','OW-MIX','مختلط (حكومي-خاص)','Mixed (Government-Private)',1,3),
  ('ownership','OW-PRV-YE','خاص يمني','Private Yemeni',1,4),
  ('ownership','OW-PRV-FGN','خاص أجنبي','Private Foreign',1,5),
  ('ownership','OW-JV','مشترك يمني-أجنبي','Yemeni-Foreign Joint Venture',1,6),
  ('ownership','OW-NPO','قطاع غير ربحي / مجتمع مدني','Non-Profit / Civil Society',1,7),
  ('ownership','OW-COOP','تعاوني','Cooperative',1,8)
ON CONFLICT (directory_type, code) DO NOTHING;

UPDATE national_directories SET is_active = FALSE
WHERE directory_type = 'ownership' AND code IN ('GOV','MIX','PRV','FGN');

-- ============================================================================
-- 6) أحجام المنشآت — التصنيف الوطني المعتمد (وفق تعريف المنشآت الصغيرة والمتوسطة)
-- ============================================================================
INSERT INTO national_directories (directory_type, code, name_ar, name_en, level, sort_order)
VALUES
  ('establishment','SZ-MICRO','متناهية الصغر (1–4 عامل)','Micro (1–4 Employees)',1,1),
  ('establishment','SZ-SML','صغيرة (5–19 عامل)','Small (5–19 Employees)',1,2),
  ('establishment','SZ-MED','متوسطة (20–49 عامل)','Medium (20–49 Employees)',1,3),
  ('establishment','SZ-LRG','كبيرة (50–249 عامل)','Large (50–249 Employees)',1,4),
  ('establishment','SZ-MEGA','عملاقة (250+ عامل)','Very Large (250+ Employees)',1,5)
ON CONFLICT (directory_type, code) DO NOTHING;

UPDATE national_directories SET is_active = FALSE
WHERE directory_type = 'establishment' AND code IN ('MICRO','SML','MED','LRG');

-- ============================================================================
-- 7) ملخص السجل الرسمي
-- ============================================================================
SELECT directory_type,
       COUNT(*) FILTER (WHERE is_active)::int AS active_entries,
       COUNT(*)::int AS total_entries
FROM national_directories
GROUP BY directory_type
ORDER BY directory_type;