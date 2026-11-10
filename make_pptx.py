import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

PRIMARY = RGBColor(0x10, 0x23, 0x3f)
PRIMARY_DARK = RGBColor(0x0a, 0x17, 0x2b)
ACCENT = RGBColor(0xc9, 0xa2, 0x27)
WHITE = RGBColor(0xff, 0xff, 0xff)
MUTED = RGBColor(0x5d, 0x5a, 0x51)
CREAM = RGBColor(0xf7, 0xf5, 0xef)
LOGO = r'C:\Users\a4763\OneDrive\Documents\Default Project\images\logo.png'

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

BLANK = prs.slide_layouts[6]

def add_bg(slide, color_top=(0x0a,0x17,0x2b), color_bot=(0x1b,0x3f,0x7a)):
    # gradient-ish via two rectangles
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(*color_top)
    shape.line.fill.background()
    # accent bar
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, Inches(0.12))
    bar.fill.solid(); bar.fill.fore_color.rgb = ACCENT; bar.line.fill.background()

def title_text(slide, text, size=44, color=WHITE, top=1.5, align=PP_ALIGN.CENTER):
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(top), Inches(11.7), Inches(1.2))
    p = tb.text_frame.paragraphs[0]
    p.alignment = align
    r = p.add_run()
    r.text = text
    r.font.size = Pt(size)
    r.font.bold = True
    r.font.color.rgb = color
    r.font.name = 'Amiri'
    return tb

def subtitle(slide, text, size=22, color=WHITE, top=2.8):
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(top), Inches(11.7), Inches(1))
    p = tb.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = text
    r.font.size = Pt(size)
    r.font.color.rgb = color
    r.font.name = 'Tajawal'
    return tb

def bullet_list(slide, items, top=3.2, size=20):
    tb = slide.shapes.add_textbox(Inches(1.2), Inches(top), Inches(10.9), Inches(3.5))
    tf = tb.text_frame
    tf.word_wrap = True
    for i, it in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(8)
        r = p.add_run()
        r.text = '✦  ' + it
        r.font.size = Pt(size)
        r.font.color.rgb = WHITE
        r.font.name = 'Tajawal'
    return tb

def card(slide, x, y, w, h, icon, title, desc):
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.fill.solid(); sh.fill.fore_color.rgb = CREAM
    sh.line.color.rgb = RGBColor(0xdd,0xd8,0xcb)
    tf = sh.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = icon; r.font.size = Pt(32)
    p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.CENTER
    r2 = p2.add_run(); r2.text = title; r2.font.size = Pt(16); r2.font.bold = True; r2.font.color.rgb = PRIMARY
    p3 = tf.add_paragraph(); p3.alignment = PP_ALIGN.CENTER
    r3 = p3.add_run(); r3.text = desc; r3.font.size = Pt(12); r3.font.color.rgb = MUTED

def add_logo(slide, x=12.35, y=0.3, size=0.55):
    slide.shapes.add_picture(LOGO, Inches(x), Inches(y), width=Inches(size), height=Inches(size))

# Slide 1: Title
s = prs.slides.add_slide(BLANK)
add_bg(s)
s.shapes.add_picture(LOGO, Inches(5.866), Inches(0.55), width=Inches(1.6), height=Inches(1.6))
title_text(s, 'مدرسة الالفي الثانوية المشتركة', size=40, top=2.6)
subtitle(s, 'إدارة منيا القمح التعليمية — بيت للعلم والتميز', size=22, top=3.7)
# stats
stats = [('1200+', 'طالب وطالبة'), ('85', 'معلم ومعلمة'), ('25', 'عاماً من التميز'), ('98%', 'نسبة النجاح')]
x = 1.5
for num, lbl in stats:
    sh = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(5.0), Inches(2.4), Inches(1.4))
    sh.fill.solid(); sh.fill.fore_color.rgb = CREAM
    sh.line.fill.background()
    tf = sh.text_frame; tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    r = tf.paragraphs[0].add_run(); r.text = num; r.font.size = Pt(30); r.font.bold = True; r.font.color.rgb = ACCENT
    p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.CENTER
    r2 = p2.add_run(); r2.text = lbl; r2.font.size = Pt(12); r2.font.color.rgb = PRIMARY_DARK
    x += 2.6

# Slide 2: About
s = prs.slides.add_slide(BLANK)
add_bg(s)
add_logo(s)
title_text(s, 'من نحن', size=44, top=0.6)
subtitle(s, 'أقدم وأعرق مدرسة ثانوية عامة بمنيا القمح', size=18, top=1.6)
bullet_list(s, [
    'تخرج منها العديد من القيادات في كل المجالات',
    '4 مسارات بكالوريا: طب، هندسة، أعمال، آداب',
    'إشراف: أ. أحمد صابر، أ. داليا طلعت',
    'مدير عام: د. وفاء طلبة',
], top=2.6)
# vision mission values
card(s, 1.0, 5.0, 3.6, 1.8, '🌟', 'الرؤية', 'أن نكون المدرسة الرائدة')
card(s, 4.8, 5.0, 3.6, 1.8, '🎯', 'الرسالة', 'بيئة آمنة ومحفزة')
card(s, 8.6, 5.0, 3.6, 1.8, '💎', 'القيم', 'احترام، نزاهة، تميز')

# Slide 3: Programs
s = prs.slides.add_slide(BLANK)
add_bg(s)
add_logo(s)
title_text(s, 'البرامج التعليمية', size=44, top=0.6)
subtitle(s, 'البكالوريا المصرية — من الصف الأول الثانوي حتى التخرج', size=18, top=1.6)
programs = [('📘', 'الصف الأول', 'تمهيدي'), ('🧬', 'طب وعلوم', 'Leben'), ('💻', 'هندسة', 'علوم حاسب'), ('📊', 'أعمال وآداب', '4 مسارات')]
x = 0.9
for icon, title, desc in programs:
    card(s, x, 3.0, 2.7, 2.2, icon, title, desc)
    x += 3.0
# activities
subtitle(s, '4 مسارات: طب وعلوم Leben • هندسة وعلوم حاسب • أعمال • آداب وفنون', size=16, top=5.6)

# Slide 4: Admissions
s = prs.slides.add_slide(BLANK)
add_bg(s)
add_logo(s)
title_text(s, 'التسجيل والالتحاق', size=44, top=0.6)
subtitle(s, 'التسجيل عبر نظام الوزارة (EMIS) — للاستفسار تواصل مع الإدارة', size=18, top=1.6)
bullet_list(s, ['التسجيل والالتحاق عبر منصة الوزارة', 'التحويلات حسب ضوابط الإدارة', 'للاستفسار: 011-234-5678', 'info@alalfi-school.edu.eg'], top=2.6, size=20)

# Slide 5: News
s = prs.slides.add_slide(BLANK)
add_bg(s)
add_logo(s)
title_text(s, 'آخر الأخبار', size=44, top=0.6)
news = [('🏆', 'فوز أزهار عصام', 'المركز الأول غناء'), ('🛡️', 'وطن بلا تنمر', 'مبادرة أسرة الفلسفة'), ('🇫🇷', 'زيارة فرنسية', 'موجهة اللغة الفرنسية')]
x = 1.5
for icon, title, desc in news:
    card(s, x, 2.8, 3.2, 2.6, icon, title, desc)
    x += 3.6

# Slide 6: Contact
s = prs.slides.add_slide(BLANK)
add_bg(s)
add_logo(s)
title_text(s, 'اتصل بنا', size=44, top=0.6)
bullet_list(s, [
    '📍 منيا القمح، جمهورية مصر العربية',
    '📞 011-234-5678',
    '✉️ info@alalfi-school.edu.eg',
    '🕐 الأحد - الخميس: 7:00 ص - 4:00 م',
], top=2.4, size=24)
subtitle(s, 'انضم إلى عائلة الالفي!', size=30, top=5.6)

out = r'C:\Users\a4763\Downloads\AyuGram Desktop\school-website\presentation.pptx'
prs.save(out)
print('saved', out)
# also save to source project
out2 = r'C:\Users\a4763\OneDrive\Documents\Default Project\presentation.pptx'
prs.save(out2)
print('saved', out2)

