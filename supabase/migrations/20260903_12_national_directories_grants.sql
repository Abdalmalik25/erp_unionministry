-- ============================================================================
-- 20260903_12_national_directories_grants.sql
-- منح صلاحيات الأدلة الوطنية والسجلات الأساسية لأدوار التطبيق:
--   authenticated : SELECT/INSERT/UPDATE (بدون DELETE — حذف ناعم حصراً)
--   anonymous     : SELECT فقط (المراجع الوطنية العامة)
-- يطابق اصطلاح Migration 05.
-- ============================================================================

-- ---------- الأدلة المرجعية الوطنية (قراءة عامة + صيانة للمصادق) ----------
GRANT SELECT, INSERT, UPDATE ON governorates              TO authenticated;
GRANT SELECT, INSERT, UPDATE ON directorates              TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ministry_offices          TO authenticated;
GRANT SELECT, INSERT, UPDATE ON national_activities       TO authenticated;
GRANT SELECT, INSERT, UPDATE ON isic4_classifications     TO authenticated;

GRANT SELECT ON governorates            TO anonymous;
GRANT SELECT ON directorates            TO anonymous;
GRANT SELECT ON ministry_offices        TO anonymous;
GRANT SELECT ON national_activities     TO anonymous;
GRANT SELECT ON isic4_classifications   TO anonymous;

-- ---------- السجلات الأساسية التشغيلية (كوادر/عمالة) ----------
GRANT SELECT, INSERT, UPDATE ON persons                TO authenticated;
GRANT SELECT, INSERT, UPDATE ON members                TO authenticated;
GRANT SELECT, INSERT, UPDATE ON inspectors             TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ministry_employees     TO authenticated;
GRANT SELECT, INSERT, UPDATE ON worker_registry        TO authenticated;
GRANT SELECT, INSERT, UPDATE ON irregular_workers      TO authenticated;

-- منع الحذف الدائم عن أدوار التطبيق (يُدار بالحذف الناعم حصراً)
REVOKE DELETE ON directorates          FROM authenticated;
REVOKE DELETE ON ministry_offices      FROM authenticated;
REVOKE DELETE ON national_activities   FROM authenticated;
REVOKE DELETE ON isic4_classifications FROM authenticated;
REVOKE DELETE ON governorates          FROM authenticated;
REVOKE DELETE ON persons               FROM authenticated;
REVOKE DELETE ON members               FROM authenticated;
REVOKE DELETE ON inspectors            FROM authenticated;
REVOKE DELETE ON ministry_employees    FROM authenticated;
REVOKE DELETE ON worker_registry       FROM authenticated;
REVOKE DELETE ON irregular_workers     FROM authenticated;
