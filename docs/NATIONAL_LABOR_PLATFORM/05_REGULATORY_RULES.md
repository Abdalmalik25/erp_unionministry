# 05 — محرك القواعد التشريعية

regulatory_rules: RuleCode, LegalSourceId, ArticleRef, RuleType, Condition(JSON), Action(JSON), Severity, AppliesTo, EffectiveFrom/To, Priority, Exceptions, Status, Version.
ممنوع if(age<X) مبعثر — كل قاعدة عبر Evaluator.