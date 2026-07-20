import os
import shutil
from rembg import remove
from PIL import Image

artifacts_dir = r"C:\Users\DELL\.gemini\antigravity-ide\brain\764e0c10-0cac-4bdb-888f-a723e66ed4d7"
assets_dir = r"d:\GIT_LAB\japaneseproject\frontend\public\assets"

files = [
    ("mascot_siro_detective_1784530966723.png", "mascot_siro_detective_nobg.png"),
    ("mascot_siro_ninja_1784531002855.png", "mascot_siro_ninja_nobg.png"),
    ("mascot_siro_reading_1784530993645.png", "mascot_siro_reading_nobg.png"),
    ("mascot_siro_sensei_1784530976027.png", "mascot_siro_sensei_nobg.png")
]

for src_name, dst_name in files:
    src_path = os.path.join(artifacts_dir, src_name)
    dst_path = os.path.join(assets_dir, dst_name)
    
    print(f"Processing {src_name}...")
    try:
        input_image = Image.open(src_path)
        output_image = remove(input_image)
        output_image.save(dst_path)
        print(f"Saved to {dst_path}")
    except Exception as e:
        print(f"Error processing {src_name}: {e}")
