from rembg import remove
from PIL import Image

input_path = r"d:\GIT\japaneseproject\frontend\public\assets\mascot_siro_kimono.png"
output_path = r"d:\GIT\japaneseproject\frontend\public\assets\mascot_siro_kimono_nobg.png"

input_image = Image.open(input_path)
output_image = remove(input_image)
output_image.save(output_path)
print("Background removed successfully.")
