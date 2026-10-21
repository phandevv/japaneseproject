import re
import sys
import pypdf
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ANSWER_PDF = Path(r"C:\Users\bbqdd\Documents\_jsn3\doc\De_thi Jlpt n3\ĐÁP ÁN JLPT N3 (update 15.10.2026).pdf")

def parse_answer_page(text):
    """
    Parses a single page of ĐÁP ÁN JLPT N3.
    Returns: dict with answers for vocab, grammar, reading, listening.
    """
    answers = {'vocab': {}, 'grammar': {}, 'reading': {}, 'listening': {}}
    
    # Example format:
    # 問題１ 1 2 3 4 5 6 7 8 1 4 1 4 1 2 2 3
    # Look for lines with '問題１' or similar
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    
    # In answer PDF, Vocab mondais:
    # 問題１ ...
    # 問題２ ...
    # 問題３ ...
    # 問題４ ... 問題５ ...
    # Let's extract pairs of (question_num, ans) from column or inline format
    # In 読解 & 聴解, lines have:
    # 24 2  28 3  1 1  1 4  1 3
    # which corresponds to columns:
    # [問題４] [問題５] [問題１] [問題３] [問題５]
    return lines

reader = pypdf.PdfReader(str(ANSWER_PDF))
print("Page 2 lines:")
lines = parse_answer_page(reader.pages[1].extract_text() or '')
for l in lines[:25]:
    print("  ", l)
