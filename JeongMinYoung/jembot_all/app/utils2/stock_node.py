

# 체인 및 기타 함수들

from .stock_chain import analysis_chain_setting
from .normalize_code_search import parse_extracted_text
from .normalize_code_search import find_corporation_code, parse_extracted_text
from .retreiver_setting import faiss_retriever_loading
from .api_get import get_financial_state

# retriever 셋팅 (사업보고서)
_, business_retriever = faiss_retriever_loading()

# chain 셋팅
hybrid_analysis_chain = analysis_chain_setting()

# 고급 하이브리드 분기 함수
def handle_analysis_node(company_name: str, year=2024) -> str:

    # 고정 재무제표 수집 함수 (사업보고서 내의 연결재무제표)
    def try_get_financial_strict(corp_code: str, year: str) -> str:
        rows = get_financial_state(corp_code, year, "11011", "CFS")
        if rows and "[API 오류]" not in rows[0]:
            return f"📅 {year}년 (CFS, 사업보고서):\n" + "\n".join(rows)
        return f"📅 {year}년 재무제표: 유효한 데이터를 찾을 수 없습니다."

    # 1. 회사명 및 연도 추출

    corp_code = find_corporation_code(company_name)
    year = year

    # 2. 재무제표 수집
    financials = try_get_financial_strict(corp_code, year)


    # 3 사업보고서 검색
    comp_biz = f'{company_name}의 {year}년도 사업보고서'
    biz_docs = business_retriever.invoke(comp_biz)
    biz_context = "\n\n".join(doc.page_content for doc in biz_docs) if biz_docs else "관련 사업보고서를 찾을 수 없습니다."

    # 4. Hybrid 체인 실행
    return hybrid_analysis_chain.invoke({
        "company": company_name,
        "biz": biz_context,
        "fin": financials
    })