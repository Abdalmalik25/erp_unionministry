import re
import zlib
import os

pdf_path = r'D:\26 اعمال\نظام قطاع العمل\دورة العمل المؤسسية المتكاملة _ الإصدار النهائي للمستخدم.pdf'
out_path = r'G:\App25\unionministry1\extracted_operating_model.txt'

def extract_text_from_pdf(pdf_path):
    with open(pdf_path, 'rb') as f:
        data = f.read()

    # Find all streams in the PDF
    stream_pattern = re.compile(b'stream\r?\n(.*?)endstream', re.DOTALL)
    streams = stream_pattern.findall(data)
    
    full_text = []
    
    for i, stream in enumerate(streams):
        decompressed = None
        try:
            decompressed = zlib.decompress(stream)
        except Exception:
            try:
                decompressed = zlib.decompress(stream, -15)
            except Exception:
                decompressed = stream

        if decompressed:
            # Look for text strings in PDF content stream: (Text) Tj or [(T) (e) (x) (t)] TJ
            # Also extract raw text
            text_chunks = re.findall(b'\((.*?)\)\s*Tj', decompressed)
            if text_chunks:
                for chunk in text_chunks:
                    try:
                        # Try UTF-8 or Windows-1256 (Arabic) or latin1
                        decoded = chunk.decode('utf-8')
                        full_text.append(decoded)
                    except Exception:
                        try:
                            decoded = chunk.decode('cp1256')
                            full_text.append(decoded)
                        except Exception:
                            try:
                                decoded = chunk.decode('latin1')
                                full_text.append(decoded)
                            except Exception:
                                pass
            else:
                # Check for hexadecimal strings <06270644...>
                hex_chunks = re.findall(b'<([0-9a-fA-F]+)>\s*Tj', decompressed)
                for h in hex_chunks:
                    try:
                        raw_bytes = bytes.fromhex(h.decode('ascii'))
                        full_text.append(raw_bytes.decode('utf-16be', errors='ignore'))
                    except Exception:
                        pass

    result_text = '\n'.join(full_text)
    return result_text

text = extract_text_from_pdf(pdf_path)
print(f"Extracted {len(text)} characters of text.")
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Saved to {out_path}")
