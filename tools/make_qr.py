"""Make the schedule QR code for flyers.

Usage:  pip install qrcode pillow
        python tools/make_qr.py https://YOUR-USERNAME.github.io/tech-club/schedule.html
Writes assets/qr-schedule.png (print quality) and assets/qr-schedule.svg.
"""
import sys, qrcode, qrcode.image.svg

url = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=24, border=2)
qr.add_data(url); qr.make(fit=True)
qr.make_image(fill_color="#1e1e1e", back_color="white").save("assets/qr-schedule.png")
qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=2).save("assets/qr-schedule.svg")
print("QR saved for", url)
