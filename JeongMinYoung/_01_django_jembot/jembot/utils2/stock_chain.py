import os
import json
import requests
import re
from dotenv import load_dotenv


# LangChain core
from langchain_core.tools import tool
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableSequence, RunnableLambda, RunnableParallel

# LangChain OpenAI
from langchain_openai import ChatOpenAI

# LangChain chains

# Load environment variables
load_dotenv()

def analysis_chain_setting():
    llm = ChatOpenAI(model='gpt-4o', temperature=0)

    hybrid_analysis_prompt = PromptTemplate.from_template("""
    당신은 상장기업의 사업보고서와 재무제표를 기반으로 핵심적인 사업 및 재무 성과를 간결하게 분석하는 전문 애널리스트입니다. 제공된 2024년 자료만을 바탕으로 정제된 분석을 작성해주세요.
    제공되지 않은 정보에 대해서는 임의로 작성하지 말고, 제공된 정보가 2024년의 데이터가 아니면 참고하지 마세요.

    ## 📄 제공 자료
    - 기업명: {company}
    - 사업보고서: {biz}
    - 재무제표: {fin}

    ## ✍️ 작성 지침
    - 형식은 정제된 리서치 보고서 스타일이며, 불필요한 서론 없이 핵심만 전달해주세요.
    - 수치는 '억원' 단위로 표기하고, 연도별 비교나 추이는 간략하게 요약해주세요.
    - 각 항목은 2~4문장 이내로 압축하여 작성해주세요.

    ## 📊 보고서 구성
    1. **핵심 요약**
       - 기업의 현재 사업 상황과 최근 재무 성과를 한 문단으로 요약

    2. **사업 분석**
       - 사업보고서의 핵심 내용을 정리하여 기업의 전략 및 시장 위치 설명

    3. **재무 분석**
       - 매출, 이익, 부채 등 주요 수치와 추이를 간략히 분석

    4. **종합 의견**
       - 경영 상황을 요약하고 유의할 리스크나 주목할 점을 간단히 정리
    """)

    hybrid_analysis_chain = hybrid_analysis_prompt | llm | StrOutputParser()

    return hybrid_analysis_chain