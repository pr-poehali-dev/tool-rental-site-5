"""Генерация PDF-документов (акт приёма-передачи, акт возврата, допсоглашение о продлении)
для конкретной заявки — на основе данных заказа, с возможностью правки администратором."""
import os
import uuid
import boto3
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib import colors
from io import BytesIO
import fonts_data

_FONTS_REGISTERED = False


def _ensure_fonts():
    global _FONTS_REGISTERED
    if _FONTS_REGISTERED:
        return
    regular_buf = BytesIO(fonts_data.get_regular_bytes())
    regular_buf.name = 'DejaVuSans.ttf'
    bold_buf = BytesIO(fonts_data.get_bold_bytes())
    bold_buf.name = 'DejaVuSans-Bold.ttf'
    pdfmetrics.registerFont(TTFont('DejaVu', regular_buf))
    pdfmetrics.registerFont(TTFont('DejaVu-Bold', bold_buf))
    _FONTS_REGISTERED = True


def _styles():
    return {
        'title': ParagraphStyle('title', fontName='DejaVu-Bold', fontSize=14, alignment=TA_CENTER, spaceAfter=14, leading=18),
        'h2': ParagraphStyle('h2', fontName='DejaVu-Bold', fontSize=11, spaceBefore=10, spaceAfter=6, leading=14),
        'body': ParagraphStyle('body', fontName='DejaVu', fontSize=9.5, alignment=TA_JUSTIFY, spaceAfter=6, leading=13),
        'small': ParagraphStyle('small', fontName='DejaVu', fontSize=8.5, alignment=TA_JUSTIFY, spaceAfter=4, leading=12),
        'center': ParagraphStyle('center', fontName='DejaVu', fontSize=9.5, alignment=TA_CENTER, spaceAfter=6),
    }


def _sig_table(client_name):
    t = Table([
        ['Арендодатель:', 'Арендатор:'],
        ['ООО «Строй_Rent»', f'ФИО: {client_name or "______________________"}'],
        ['Телефон: 8 (901) 504-64-44', 'Телефон: ______________________'],
        ['', ''],
        ['Подпись: ___________________', 'Подпись: ___________________'],
    ], colWidths=[80 * mm, 80 * mm])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'DejaVu'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t


def _get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def upload_pdf(key: str, pdf_bytes: bytes) -> str:
    _get_s3().put_object(Bucket='files', Key=key, Body=pdf_bytes, ContentType='application/pdf')
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def default_items_from_cart(cart):
    items = []
    for it in (cart or []):
        try:
            items.append({
                'name': it.get('name', ''),
                'qty': int(it.get('qty', 1) or 1),
                'inventoryNumber': it.get('inventoryNumber', ''),
                'state': 'Исправен, без повреждений',
            })
        except Exception:
            pass
    return items


def deposit_total_from_cart(cart):
    total = 0
    for it in (cart or []):
        try:
            total += int(it.get('deposit', 0) or 0) * int(it.get('qty', 0) or 0)
        except Exception:
            pass
    return total


def render_handover_pdf(order_id: int, data: dict) -> bytes:
    _ensure_fonts()
    styles = _styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=20 * mm, rightMargin=20 * mm)
    story = [Paragraph('АКТ ПРИЁМА-ПЕРЕДАЧИ ИНСТРУМЕНТА', styles['title'])]
    story.append(Paragraph(f'к заявке №{order_id} на аренду инструмента — Строй_Rent', styles['center']))
    story.append(Paragraph(
        f'ООО «Строй_Rent», именуемое в дальнейшем «Арендодатель», в лице представителя '
        f'{data.get("representativeName") or "______________________"}, с одной стороны, и '
        f'гражданин(ка) {data.get("clientFullName") or "______________________"}, паспорт '
        f'{data.get("clientPassport") or "______________________"}, именуемый(ая) в дальнейшем «Арендатор», '
        f'с другой стороны, составили настоящий Акт о том, что Арендодатель передал, а Арендатор принял '
        f'во временное владение и пользование следующий инструмент:', styles['body']))

    items = data.get('items') or []
    rows = [['№', 'Наименование инструмента', 'Инв. номер', 'Кол-во, шт', 'Состояние на момент выдачи']]
    for i, it in enumerate(items, 1):
        rows.append([str(i), it.get('name', ''), it.get('inventoryNumber', '') or '—', str(it.get('qty', 1)), it.get('state', 'Исправен, без повреждений')])
    if len(rows) == 1:
        rows.append(['1', '—', '—', '—', '—'])
    items_table = Table(rows, colWidths=[8 * mm, 60 * mm, 24 * mm, 18 * mm, 60 * mm])
    items_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'DejaVu'),
        ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.93, 0.93, 0.93)),
    ]))
    story.append(Spacer(1, 4))
    story.append(items_table)
    story.append(Spacer(1, 8))

    deposit_total = data.get('depositTotal', 0)
    story.append(Paragraph(f'Итого сумма залога по настоящему Акту составляет: {deposit_total} ₽.', styles['body']))
    story.append(Paragraph(
        'Арендодатель произвёл проверку работоспособности инструмента в присутствии Арендатора. '
        'Претензий к техническому состоянию и внешнему виду инструмента на момент передачи Арендатор не имеет.', styles['body']))
    if data.get('notes'):
        story.append(Paragraph(f'Примечания: {data.get("notes")}', styles['body']))
    story.append(Paragraph(
        'Настоящий Акт составлен в двух экземплярах, по одному для каждой из Сторон, и является '
        'неотъемлемой частью Договора аренды инструмента.', styles['body']))
    story.append(Spacer(1, 6))
    story.append(_sig_table(data.get('clientFullName')))
    doc.build(story)
    return buf.getvalue()


def render_return_pdf(order_id: int, data: dict) -> bytes:
    _ensure_fonts()
    styles = _styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=20 * mm, rightMargin=20 * mm)
    story = [Paragraph('АКТ ПРИЁМА-ПЕРЕДАЧИ ИНСТРУМЕНТА<br/>(возврат)', styles['title'])]
    story.append(Paragraph(f'к заявке №{order_id} на аренду инструмента — Строй_Rent', styles['center']))
    story.append(Paragraph(
        f'ООО «Строй_Rent», именуемое в дальнейшем «Арендодатель», в лице представителя '
        f'{data.get("representativeName") or "______________________"}, с одной стороны, и '
        f'гражданин(ка) {data.get("clientFullName") or "______________________"}, паспорт '
        f'{data.get("clientPassport") or "______________________"}, именуемый(ая) в дальнейшем «Арендатор», '
        f'с другой стороны, составили настоящий Акт о том, что Арендатор возвратил, а Арендодатель принял '
        f'из временного владения и пользования следующий инструмент:', styles['body']))

    items = data.get('items') or []
    rows = [['№', 'Наименование инструмента', 'Инв. номер', 'Кол-во, шт', 'Состояние при возврате']]
    for i, it in enumerate(items, 1):
        rows.append([str(i), it.get('name', ''), it.get('inventoryNumber', '') or '—', str(it.get('qty', 1)), it.get('state', 'Исправен')])
    if len(rows) == 1:
        rows.append(['1', '—', '—', '—', '—'])
    items_table = Table(rows, colWidths=[8 * mm, 60 * mm, 24 * mm, 18 * mm, 60 * mm])
    items_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'DejaVu'),
        ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.93, 0.93, 0.93)),
    ]))
    story.append(Spacer(1, 4))
    story.append(items_table)
    if data.get('damageNotes'):
        story.append(Spacer(1, 6))
        story.append(Paragraph(f'Описание выявленных повреждений/недостатков: {data.get("damageNotes")}', styles['body']))
    story.append(Spacer(1, 8))

    deposit_table = Table([
        ['Сумма внесённого залога, ₽', 'Удержано, ₽', 'Возвращено Арендатору, ₽'],
        [str(data.get('depositTotal', 0)), str(data.get('depositWithheld', 0)), str(data.get('depositReturned', 0))],
    ], colWidths=[55 * mm, 55 * mm, 60 * mm])
    deposit_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'DejaVu'),
        ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.93, 0.93, 0.93)),
    ]))
    story.append(deposit_table)
    story.append(Spacer(1, 8))
    if data.get('notes'):
        story.append(Paragraph(f'Примечания: {data.get("notes")}', styles['body']))
    story.append(Paragraph(
        'Стороны подтверждают, что претензий друг к другу не имеют, за исключением случаев, зафиксированных выше. '
        'Обязательства Сторон по Договору аренды инструмента считаются исполненными в полном объёме с момента '
        'подписания настоящего Акта.', styles['body']))
    story.append(Spacer(1, 6))
    story.append(_sig_table(data.get('clientFullName')))
    doc.build(story)
    return buf.getvalue()


def render_extension_pdf(order_id: int, data: dict) -> bytes:
    _ensure_fonts()
    styles = _styles()
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=20 * mm, rightMargin=20 * mm)
    story = [Paragraph('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ<br/>о продлении срока аренды инструмента', styles['title'])]
    story.append(Paragraph(f'к заявке №{order_id} на аренду инструмента — Строй_Rent', styles['center']))
    story.append(Paragraph(
        f'ООО «Строй_Rent», именуемое в дальнейшем «Арендодатель», в лице представителя '
        f'{data.get("representativeName") or "______________________"}, с одной стороны, и '
        f'гражданин(ка) {data.get("clientFullName") or "______________________"}, паспорт '
        f'{data.get("clientPassport") or "______________________"}, именуемый(ая) в дальнейшем «Арендатор», '
        f'с другой стороны, заключили настоящее Дополнительное соглашение к Договору аренды инструмента '
        f'о продлении срока аренды на {data.get("extraDays", 0)} суток.', styles['body']))

    items = data.get('items') or []
    if items:
        rows = [['Наименование инструмента', 'Кол-во, шт']]
        for it in items:
            rows.append([it.get('name', ''), str(it.get('qty', 1))])
        items_table = Table(rows, colWidths=[130 * mm, 40 * mm])
        items_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'DejaVu'),
            ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.93, 0.93, 0.93)),
        ]))
        story.append(Spacer(1, 4))
        story.append(items_table)
        story.append(Spacer(1, 8))

    story.append(Paragraph(
        f'Общая сумма доплаты за продление срока аренды составляет: {data.get("amount", 0)} ₽.', styles['body']))
    story.append(Paragraph(
        'Оплата производится Арендатором в течение 1 (одного) рабочего дня с момента подписания настоящего '
        'Соглашения способом, согласованным Сторонами.', styles['body']))
    story.append(Paragraph(
        'Сумма ранее внесённого залога, срок его возврата и порядок удержания при повреждении инструмента '
        'остаются без изменений и регулируются условиями Договора.', styles['body']))
    if data.get('notes'):
        story.append(Paragraph(f'Примечания: {data.get("notes")}', styles['body']))
    story.append(Paragraph(
        'Настоящее Соглашение является неотъемлемой частью Договора аренды инструмента и вступает в силу '
        'с момента его подписания обеими Сторонами.', styles['body']))
    story.append(Spacer(1, 6))
    story.append(_sig_table(data.get('clientFullName')))
    doc.build(story)
    return buf.getvalue()


def generate_and_upload(kind: str, order_id: int, data: dict) -> str:
    """kind: 'handover' | 'return' | 'extension'"""
    if kind == 'handover':
        pdf_bytes = render_handover_pdf(order_id, data)
    elif kind == 'return':
        pdf_bytes = render_return_pdf(order_id, data)
    else:
        pdf_bytes = render_extension_pdf(order_id, data)
    key = f"order-acts/{order_id}-{kind}-{uuid.uuid4().hex}.pdf"
    return upload_pdf(key, pdf_bytes)