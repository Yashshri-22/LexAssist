import re,json
from app.ai import generate
def ai_json(prompt):
    s=generate(prompt)
    try:return json.loads(s.removeprefix("```json").removeprefix("```").removesuffix("```").strip())
    except Exception:return None
def risks(clauses):
    p="Review these clauses for potential concerns. Return JSON array with category,severity,explanation,evidence,clause_number,page_number. No legal conclusions.\n"+"\n".join(str(c) for c in clauses)
    a=ai_json(p)
    if isinstance(a,list):return a
    pats=[("Penalty",r"penalty|forfeit|liquidated damages"),("Termination",r"terminat"),("Payment",r"payment|late fee|interest"),("Notice period",r"notice"),("Confidentiality",r"confidential"),("Restriction",r"exclusive|non-compete")]
    out=[]
    for c in clauses:
        for label,pat in pats:
            if re.search(pat,c["text"],re.I):
                out.append({"category":label,"severity":"MEDIUM","explanation":"This clause may deserve careful review. Heuristic flag only, not a legal conclusion.","evidence":c["text"][:500],"clause_number":c["clause_number"] or "Unnumbered","page_number":c["page_number"]});break
    return out
def conflicts(clauses):
    a=ai_json("Identify potential internal contradictions only. Return JSON array with clause_a,clause_b,explanation,evidence_a,evidence_b,severity.\n"+"\n".join(str(c) for c in clauses))
    if isinstance(a,list):return a
    found=[]
    for c in clauses:
        if re.search("notice",c["text"],re.I):
            nums=re.findall(r"\b(\d+)\s*(day|days|month|months)\b",c["text"],re.I)
            if nums:found.append((c,nums))
    out=[]
    for i,(x,nx) in enumerate(found):
        for y,ny in found[i+1:]:
            if nx!=ny:out.append({"clause_a":x["clause_number"] or "Unnumbered","clause_b":y["clause_number"] or "Unnumbered","explanation":"Different notice-period values appear; check whether they apply to different conditions.","evidence_a":x["text"][:400],"evidence_b":y["text"][:400],"severity":"MEDIUM"})
    return out
def summary(text):
    a=ai_json("Return JSON summary with document_type,parties,purpose,key_dates,financial_terms,obligations,conditions,termination,penalties,potential_concerns. Only use supplied content; absent data say Not identified.\n"+text[:20000])
    if isinstance(a,dict):return a
    return {"document_type":"Not automatically determined","purpose":"AI summary unavailable; configure GEMINI_API_KEY.","extractive_overview":" ".join(text.split())[:2000]}
