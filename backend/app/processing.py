import re,fitz
from docx import Document as Docx
def extract(path,typ):
    if typ=="pdf":
        d=fitz.open(path)
        return "\n".join(f"\n[PAGE {i}]\n{p.get_text('text')}" for i,p in enumerate(d,1)).strip(),len(d)
    d=Docx(path)
    return "\n".join(p.text for p in d.paragraphs if p.text.strip()),1
def segment(text):
    out=[];cur=[];num="";title="";page=1;start=1
    pat=re.compile(r"^\s*((?:\d+\.)+\d*|\d+\.|\([a-zA-Z0-9]+\))\s+(.+)$")
    for line in text.splitlines():
        mpage=re.match(r"\[PAGE (\d+)\]",line.strip())
        if mpage: page=int(mpage.group(1));continue
        m=pat.match(line)
        if m:
            if cur:out.append(dict(clause_number=num,title=title,page_number=start,text="\n".join(cur).strip()))
            num,title,start=m.group(1),m.group(2)[:180],page;cur=[line.strip()]
        elif line.strip():
            if not cur:num,title,start="","",page
            cur.append(line.strip())
    if cur:out.append(dict(clause_number=num,title=title,page_number=start,text="\n".join(cur).strip()))
    return [x for x in out if x["text"]]
