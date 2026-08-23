import pypdf
import os

pdf_path = r'D:\26 اعمال\نظام قطاع العمل\دورة العمل المؤسسية المتكاملة _ الإصدار النهائي للمستخدم.pdf'
out_path = r'G:\App25\unionministry1\extracted_operating_model.txt'

reader = pypdf.PdfReader(pdf_path)
print(f"Total Pages in PDF: {len(reader.pages)}")

with open(out_path, 'w', encoding='utf-8') as f:
    for i, page in enumerate(reader.pages):
        f.write(f"\n\n==================== [PAGE {i+1}] ====================\n\n")
        text = page.extract_text()
        if text:
            f.write(text)
        else:
            f.write("[EMPTY / IMAGE PAGE]")

print(f"Successfully extracted all pages to: {out_path}")
