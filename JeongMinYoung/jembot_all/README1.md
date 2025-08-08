#  Jembot API 테스트 

## 목차
1. [인증 테스트](#인증-테스트)
2. [주식 정보 API 테스트](#주식-정보-api-테스트)
3. [챗봇 API 테스트](#챗봇-api-테스트)
4. [테스트 체크리스트](#테스트-체크리스트)

---

## �� 인증 테스트

### 1. 로그인 테스트 (django-allauth에서 제공하는 인증)

```markdown
URL: http://localhost:8000/accounts/login/
Method: POST

Headers:
- Content-Type: application/x-www-form-urlencoded
- X-CSRFToken : {csrftoken}
- Cookie : sessionid={session_id}; csrftoken={csrftoken}

Body (x-www-form-urlencoded):
- login: {email}
- password: {password}
- csrfmiddlewaretoken: {csrftoken}
```
### **📷 응답 결과 : 200 OK** 
![img.png](images/img.png)


### 2. 로그아웃 테스트

```markdown
URL: http://localhost:8000/accounts/logout/
Method: POST

Headers:
- Content-Type: application/x-www-form-urlencoded
- X-CSRFToken : {csrftoken}
- Cookie : sessionid={session_id}; csrftoken={csrftoken}

Body (x-www-form-urlencoded):
- login: {email}
- password: {password}
- csrfmiddlewaretoken: {csrftoken}

```
### **📷 응답 결과 : 200 OK** 
![img_1.png](img_1.png)



## �� 주식 정보 API 테스트

### 1. 회사명으로 주식 정보 조회

```markdown
URL: http://localhost:8000/jembot/api/get-stock-info/
Method: POST
Headers:
- Content-Type: application/json
- X-CSRFToken: {{CSRF_TOKEN}}
Body (JSON RAW):
{
"company_name": "삼성전자"
}
```

### **📷 응답 결과 : 200 OK** 
![img_2.png](img_2.png)


### 2. 주식 코드로 정보 조회

```markdown
URL: http://localhost:8000/jembot/api/get-stock-info-by-code/

Method: POST

Headers:
Content-Type: application/json
X-CSRFToken: {{CSRF_TOKEN}}

Body (JSON RAW):
{
"code": "005930", "period":"1m"
}

```

### **📷 응답 결과 : 200 OK** 
![img_3.png](img_3.png)

### 3. 네이버 뉴스 크롤링

```markdown
URL: {{BASE_URL}}/jembot/api/crawl-news/
Method: POST
Headers:
Content-Type: application/json
X-CSRFToken: {{CSRF_TOKEN}}
Body (JSON):
{
"company_name": "삼성전자"
}
```

### **📷 응답 결과 : 200 OK** 
![img_4.png](img_4.png)

---

## �� 챗봇 API 테스트

### 1. 챗봇 대화

```markdown
URL: http://localhost:8000/jembot/api/chat/
Method: POST
Headers:
Content-Type: application/json
X-CSRFToken: {{CSRF_TOKEN}}
Body (JSON RAW):
{
"message": "삼성전자 주식에 대해 알려줘",
"session_id": {session_id},
"level":"basic",
"chat_histroy":"none"
}
```

### **📷 응답 결과 : 200 OK** 
![img_5.png](img_5.png)


### 2. 새 채팅 세션 생성

```markdown
URL: http://localhost:8000/jembot/api/sessions/create/
Method: POST
Headers:
Content-Type: application/json
X-CSRFToken: {{CSRF_TOKEN}}
Body (JSON):
{
"title": {title}
}
```

### **📷 응답 결과 : 200 OK**
![img_6.png](img_6.png)


### 4. 채팅 히스토리 조회

```markdown
URL: http://localhost:8000/jembot/api/sessions/{{session_id}}/history/
Method: GET
```

### **📷 응답 결과 : 200 OK**
![img_7.png](img_7.png)


### 5. 채팅 세션 삭제

```markdown
URL: http://localhost:8000/jembot/api/sessions/{{session_id}}/delete/
Method: POST
Headers:
X-CSRFToken: {{CSRF_TOKEN}}
```

### **📷 응답 결과 : 200 OK**
![img_8.png](img_8.png)

---



---

## 📝 테스트 체크리스트

### ✅ 기능 테스트
- [ ] 모든 API 엔드포인트 정상 동작
- [ ] 응답 데이터 형식 검증
- [ ] 에러 처리 확인
- [ ] 인증/인가 검증

### ✅ 성능 테스트
- [ ] 응답 시간 측정
- [ ] 동시 요청 처리
- [ ] 대용량 데이터 처리

### ✅ 보안 테스트
- [ ] CSRF 토큰 검증
- [ ] 세션 관리 확인
- [ ] 권한 검증

### ✅ 사용성 테스트
- [ ] 사용자 인터페이스 테스트
- [ ] 브라우저 호환성 확인

---
