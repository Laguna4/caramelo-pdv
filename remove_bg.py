from PIL import Image

def remove_white_background(input_path, output_path, threshold=240):
    try:
        print(f"Processing {input_path}...")
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        new_data = []
        for item in datas:
            r, g, b, a = item
            
            # If pixel is white-ish (all RGB values > threshold), make transparent
            if r > threshold and g > threshold and b > threshold:
                new_data.append((255, 255, 255, 0))  # Transparent
            else:
                new_data.append(item)

        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Success! Saved to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

# Run
input_file = 'src/assets/caramelo-logo.png'
output_file = 'src/assets/caramelo-logo.png'
remove_white_background(input_file, output_file, threshold=240)
