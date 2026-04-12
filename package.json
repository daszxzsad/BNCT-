#!/usr/bin/env python3
import sys, json, base64, os
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
 
# 폰트 등록
BASE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(BASE, '..', 'fonts')
FONT_KR  = os.path.join(FONT_DIR, 'NanumGothic.ttf')
FONT_KRB = os.path.join(FONT_DIR, 'NanumGothicBold.ttf')
 
# 시스템 폰트 fallback
if not os.path.exists(FONT_KR):
    FONT_KR  = '/usr/share/fonts/truetype/nanum/NanumGothic.ttf'
    FONT_KRB = '/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf'
 
pdfmetrics.registerFont(TTFont('KR',  FONT_KR))
pdfmetrics.registerFont(TTFont('KRB', FONT_KRB))
 
TW   = 181*mm
NAVY = colors.Color(0, 48/255, 135/255)
LG   = colors.Color(0.82,0.82,0.82)
GR   = colors.Color(0.91,0.91,0.91)
W    = colors.white
BK   = colors.black
 
FS = 7.5
TP, BP = 2, 2
 
def p(t, s=None, bold=False, color=BK, align=0):
    s = s or FS
    return Paragraph(str(t or ''), ParagraphStyle('_',
        fontName='KRB' if bold else 'KR', fontSize=s, textColor=color,
        alignment=align, leading=s*1.3, wordWrap='CJK'))
 
B = [('GRID',(0,0),(-1,-1),0.5,LG),
     ('TOPPADDING',(0,0),(-1,-1),TP),('BOTTOMPADDING',(0,0),(-1,-1),BP),
     ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
     ('VALIGN',(0,0),(-1,-1),'MIDDLE')]
 
def mk(data, cw, ex=None):
    t = Table(data, colWidths=cw)
    t.setStyle(TableStyle(list(B)+(ex or [])))
    return t
 
def sh(text):
    t = Table([[p(text,FS,True,W)]],[TW])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),NAVY),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
        ('LEFTPADDING',(0,0),(-1,-1),5)]))
    return t
 
def one(text):
    return mk([[p(text,FS)]],[TW])
 
def chk(items):
    rows = [[p('□  '+t, FS)] for t in items]
    t = Table(rows,[TW])
    t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.5,LG),
        ('TOPPADDING',(0,0),(-1,-1),1.5),('BOTTOMPADDING',(0,0),(-1,-1),1.5),
        ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4)]))
    return t
 
def sig_row(name='', date='', time='', sig_b64=None):
    """서명행 - 서명 이미지 포함"""
    # 서명 이미지 셀
    if sig_b64:
        try:
            img_data = sig_b64.split(',')[1] if ',' in sig_b64 else sig_b64
            img_bytes = base64.b64decode(img_data)
            img_io = BytesIO(img_bytes)
            sig_cell = Image(img_io, width=52*mm, height=12*mm)
        except:
            sig_cell = p('(서명)',FS)
    else:
        sig_cell = p('',FS)
 
    return Table([[
        p('이름:',FS,True), p(name,FS),
        p('서명:',FS,True), sig_cell,
        p('날짜:',FS,True), p(date,FS),
        p('시간:',FS,True), p(time,FS),
    ]],[13*mm,36*mm,13*mm,54*mm,13*mm,26*mm,13*mm,13*mm],rowHeights=[14*mm],
    style=TableStyle(list(B)+[
        ('BACKGROUND',(0,0),(0,0),GR),('BACKGROUND',(2,0),(2,0),GR),
        ('BACKGROUND',(4,0),(4,0),GR),('BACKGROUND',(6,0),(6,0),GR),
    ]))
 
def sp(h=1.5): return Spacer(1,h*mm)
 
def build_pdf(data, out_path):
    project = data.get('project','')
    company = data.get('company','')
    fields  = data.get('fields',{})
    sec3    = data.get('sec3',{})
    sec4    = data.get('sec4',{})
    extra   = data.get('extra',{})
 
    story = []
    doc = SimpleDocTemplate(out_path, pagesize=A4,
        leftMargin=14*mm, rightMargin=15*mm, topMargin=10*mm, bottomMargin=8*mm)
 
    # ══ PAGE 1: Section 1~4 ═══════════════════════════════
 
    # 헤더
    t = Table([[p('작업허가서',7.5,True,W), p('작업허가서  양식',17,True,NAVY)]],
        colWidths=[22*mm,159*mm])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),NAVY),('LINEBELOW',(0,0),(-1,-1),2,NAVY),
        ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
        ('LEFTPADDING',(0,0),(-1,-1),5),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(t)
 
    # 작업허가 번호
    ni = mk([[p('작업허가 번호:',FS,True), p(extra.get('permitNo',''),FS)]],
        [28*mm,46*mm],[('BACKGROUND',(0,0),(0,0),GR)])
    story.append(mk([[p('')],[ ni]],[TW][:1],
        [('TOPPADDING',(0,0),(-1,-1),1),('BOTTOMPADDING',(0,0),(-1,-1),1),('LEFTPADDING',(0,0),(-1,-1),0),('ALIGN',(0,1),(0,1),'RIGHT')]))
    story.append(mk([[p(''),ni]],[107*mm,74*mm],
        [('TOPPADDING',(0,0),(-1,-1),1),('BOTTOMPADDING',(0,0),(-1,-1),1),('LEFTPADDING',(0,0),(-1,-1),0)]))
 
    story.append(one('본 양식(작업허가서 양식)은 작업 활동 관련하여, 상세 명시된 고위험군 작업에 대한 승인 및 전달 사항 등을 관리하기 위한 것이다.'))
 
    # Section 1
    story.append(sh('Section 1: 일반 사항'))
    story.append(mk([[p('작업명:',FS,True), p(fields.get('s1-work',project),FS)]],[26*mm,TW-26*mm],[('BACKGROUND',(0,0),(0,0),GR)]))
    story.append(mk([[p('작업 장소:',FS,True), p(fields.get('s1-place',''),FS)]],[26*mm,TW-26*mm],[('BACKGROUND',(0,0),(0,0),GR)]))
    story.append(mk([[p('작업 업체:',FS,True), p(fields.get('s1-company',company),FS)]],[26*mm,TW-26*mm],[('BACKGROUND',(0,0),(0,0),GR)]))
    story.append(mk([[p('예상 작업 기간:',FS,True),
        p(fields.get('s1-from','')+'  부터  '+fields.get('s1-to','')+'  까지',FS)]],
        [26*mm,TW-26*mm],[('BACKGROUND',(0,0),(0,0),GR)]))
 
    # 고위험군
    rg = Table([
        [p('□  화기 작업',FS), p('□  토공/굴착 작업',FS)],
        [p('□  밀폐공간출입작업',FS), p('□  설비/장비 격리',FS)],
        [p('□  고소 작업',FS), p('□  기계적 인양 작업',FS)],
        [p('□  고압 스위치 접근 및 시험 작업 허가',FS), p('□  전기 유지보수작업',FS)],
    ],[(TW-28*mm)/2,(TW-28*mm)/2])
    rg.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.4,LG),
        ('TOPPADDING',(0,0),(-1,-1),1.5),('BOTTOMPADDING',(0,0),(-1,-1),1.5),('LEFTPADDING',(0,0),(-1,-1),4)]))
    rr = Table([[p('해당하는 네모 칸에 ✓표시를 하고 관련 양식을 첨부하시오.',7.5)],[rg]],[TW-28*mm])
    rr.setStyle(TableStyle([('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),1),('LEFTPADDING',(0,0),(-1,-1),0)]))
    story.append(mk([[p('본 작업허가서 발급이\n필요한 특정\n고위험군 작업:',FS,True,align=1),rr]],
        [28*mm,TW-28*mm],[('BACKGROUND',(0,0),(0,0),GR)]))
 
    # Section 2
    story.append(sh('Section 2: 승인 요청 (작업 업체 관리 감독자 작성)'))
    story.append(one('본인은 고위험군 작업을 한 허가를 요청하는 사람으로써, 다음 사항을 확인한다.'))
    story.append(chk([
        '본인은 위험성 평가를 비롯하여 본 작업 활동과 관련하여 필요한 관리 양식들을 검토하였다.',
        '본인은, 조치가 적절히 이루어졌는지 확실히 하기 위해 관계자와 협의하였다.',
        '본인은, 첨부된 위험성 평가 및 해당 관리 양식에 따라 본 작업 활동을 조정 및 관리할 능력이 있다.',
        '본인은 작업자 및 작업에 영향을 받는 사람의 건강 및 안전을 확보하기 위해 필요한 모든 조치를 취할것이다.',
        '본인은, 작업 수행자가 위험성 평가 및 각 관리 양식은 물론 아래 Section 5 의 지시사항에 대한 설명을 들었고 해당 내용들을 이해했음을 확인하여야 한다.',
        '본인은, 작업 활동 전체에 걸쳐 위험요소를 관찰하고 관리하여야 한다.',
        '본인은, 당 작업 허가 승인 담당자에게 본 허가서를 검토하고, 등록 및 번호를 부여하도록 요청하는 바이다.',
    ]))
    story.append(sig_row(
        fields.get('s2-name',''), fields.get('s2-date',''), fields.get('s2-time',''),
        fields.get('sig2_img')
    ))
 
    # Section 3
    story.append(sh('Section 3: 작업업체 검토 (업무담당자 작성)'))
    story.append(one('본인은 모든 문서들을 검토하였고, 의견 제시했다.'))
    story.append(chk([
        '본인은, 위험성 평가 및 필요한 관리 양식을 포함하여 관련된 모든 문서들의 내용을 검토하였으며 작업 업체/작업자에게 의견을 제시하였다.',
        '본인은, 작업 업체/작업자를 담당하는 자로서, 작업 방식과 제안된 관리방안들이 시행되는 것을 모니터링하여 BNCT 터미널 안전 기준이 달성될 수 있도록 할 것이다.',
        '본인은, 해당 작업 구역의 관련자에게 작업 시행 구간, 완결해야 할 모든 작업 내역, 작업 관리감독 및 강화를 위해 수립된 절차들에 대한 정보를 알려주었다.',
    ]))
    story.append(sig_row(sec3.get('name',''), sec3.get('date',''), sec3.get('time',''), sec3.get('sig')))
 
    # Section 4
    story.append(sh('Section 4: 승인 (작업허가 승인 담당자가 작성)'))
    story.append(one('작업 활동 계획이 완결되었고, 위험성 평가 및 필요한 관리양식에 따라 해당 작업 착수를 승인한다는 것을 의미한다.'))
    story.append(chk([
        '본인은, 위험성 평가를 비롯하여 필요한 관리 양식을 포함한 모든 관련 문서 내용을 검토하였다.',
        '본인은 당 작업 허가서를 등록하고, 작업 번호를 부여하였으며, 관련된 모든 문서 상에 해당 작업 번호를 기입하였다.',
    ]))
    story.append(sig_row(sec4.get('name','이병문'), sec4.get('date',''), sec4.get('time',''), sec4.get('sig')))
    story.append(mk([[p('제한 사항:',FS,True),
        p('본 작업 승인 사항은 아래 명시된 시점 혹은 일시 까지만 유효하다.',FS)]],
        [22*mm,TW-22*mm],[('BACKGROUND',(0,0),(0,0),GR)]))
    story.append(mk([[p('',FS),p('날짜:',FS,True),p(extra.get('s4_limit_date',''),FS),
        p('시간:',FS,True),p(extra.get('s4_limit_time',''),FS)]],
        [72*mm,14*mm,44*mm,14*mm,37*mm],[('BACKGROUND',(1,0),(1,0),GR),('BACKGROUND',(3,0),(3,0),GR)]))
    story.append(mk([[p('□  작업허가 연장 요청이 있을 경우, Section 7 을 작성하시오.',FS)]],[TW]))
    story.append(mk([[p('Page 1 of 2',7,color=colors.Color(0.5,0.5,0.5),align=2)]],[TW],
        [('TOPPADDING',(0,0),(-1,-1),2)]))
 
    # ══ PAGE 2: Section 5~10 ══════════════════════════════
    story.append(PageBreak())
 
    t2 = Table([[p('작업허가서',7.5,True,W), p('작업허가서  양식 (계속)',14,True,NAVY)]],
        colWidths=[22*mm,159*mm])
    t2.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),NAVY),('LINEBELOW',(0,0),(-1,-1),1.5,NAVY),
        ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
        ('LEFTPADDING',(0,0),(-1,-1),5),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(t2)
    story.append(sp(1))
 
    story.append(sh('Section 5: 작업허가/작업구역 출입관련 지시 사항 (작업자 작성)'))
    story.append(one('Note: 작업자는 반드시 아래 각각의 지시사항을 준수하여야 한다.'))
    story.append(chk([
        '본인의 역할 및 업무, 작업 범위에 대해 숙지하여야 한다.',
        '위험성 평가 및 관리 양식을 읽고, 설명을 들었으며, 이를 이해하고 있어야 한다. 확실하지 않은 사항에 대해서는 질문하도록 한다. 만약 작업 전에 우려사항이 있다면 보고하도록 한다.',
        '각 조 작업을 시작할 때마다 현장 감독자에게 알려야 하며, 작업허가/ 출입 관련 지시 및 허가를 받아 작업을 시작하도록 한다.',
        '교대 근무를 할 경우, 작업 시작 전/종료 후 서명한다. (Section 7 참고)',
        '작업 하는 동안 새로운 위험요소가 발견되었다면, 즉시 해당 작업 업체/작업자들의 현장 감독자와 기타 작업과 연관된 당사자들에게 통보한다.',
    ]))
    story.append(sp(1.5))
 
    story.append(sh('Section 6: 작업업체 관리감독자 (해당할 경우)'))
    s6 = Table([
        [p('작업시작 전 논의사항',FS,True), p(extra.get('s6_discuss',''),FS)],
        [p(''),p('')],
        [p('점검 / 확인 시점 :',FS,True), p(extra.get('s6_check',''),FS)],
        [p('작업 완료 후 최종 점검',FS,True), p(extra.get('s6_date','')+'  '+extra.get('s6_time',''),FS)],
        [p('변화/변경사항 (해당할 경우):',FS,True), p(extra.get('s6_change',''),FS)],
    ],[36*mm,TW-36*mm],rowHeights=[None,15*mm,None,None,13*mm])
    s6.setStyle(TableStyle(list(B)+[('BACKGROUND',(0,0),(0,-1),GR)]))
    story.append(s6)
    story.append(sp(1.5))
 
    story.append(sh('Section 7: 허가 기간 연장 (당초 작업허가 승인자가 작성)'))
    story.append(one('작업계획서 검토 후 위험성 평가 및 관리 양식에 따라 작업 연장을 허가하였다. 본인은 당초 작업허가 승인자 담당자로써 다음 사항을 확인한다:'))
    story.append(chk([
        '본인은, 위험성 평가를 비롯하여 필요한 관리 양식을 포함한 모든 관련 문서 내용을 검토하였다.',
        '본 허가서를 작업 허가 목록에 수정 반영하였다. 작업 연장은 한번만 할 수 있으며, 당초 작업 완료일 기준일로부터 최대 7일까지 가능하다.',
    ]))
    story.append(one('기간 연장 :  '+extra.get('s7_from','')+'  부터  '+extra.get('s7_to','')+'  (최대 7 일)'))
    story.append(sig_row(extra.get('s7_name',''), '', '', extra.get('s7_sig')))
    story.append(sp(1.5))
 
    story.append(sh('Section 8: 작업 철수 (작업 업체 관리 감독자 작성)'))
    story.append(one('해당 작업이 완결되어, 이를 모든 작업자에게 설명하였으며, 작업 현장은 안전하게 정돈되었다. 본 작업 허가서, 위험성 평가 및 관리 양식을 반드시 작업허가 승인 담당자에게 제출해야만 한다.'))
    story.append(sig_row(extra.get('s8_name',''), '', '', extra.get('s8_sig')))
    story.append(sp(1.5))
 
    story.append(sh('Section 9: 작업 종료 관련 (업무 담당자 작성)'))
    story.append(one('본 작업 활동이 완결되어, 모든 작업자에게 설명하였으며, 작업 현장은 안전하게 정돈되었다. 작업 수행에 참여한 작업 업체의 현장 감독자는 반드시 본 작업 허가서, 위험성 평가 및 작업허가 양식을 터미널 담당자에게 반납해야 한다.'))
    story.append(sig_row(extra.get('s9_name',''), '', '', extra.get('s9_sig')))
    story.append(sp(1.5))
 
    story.append(sh('Section 10: 작업 완료 허가 (작업 허가 승인 담당자가 작성)'))
    story.append(one('본 작업허가서와 연관된 모든 작업이 종결되었으며, 해당 문서들을 수령하였다. 본인은 BNCT 작업허가대장에 해당 허가서를 마감 등록하였으며, 기록 보존(스캔, 파일 저장 등)을 위해 관련된 서류를 제출하였다.'))
    story.append(sig_row(extra.get('s10_name',''), '', '', extra.get('s10_sig')))
    story.append(mk([[p('Page 2 of 2',7,color=colors.Color(0.5,0.5,0.5),align=2)]],[TW],
        [('TOPPADDING',(0,0),(-1,-1),3)]))
 
    doc.build(story)
 
if __name__ == '__main__':
    data_file = sys.argv[1]
    out_file  = sys.argv[2]
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    build_pdf(data, out_file)
    print('OK')
