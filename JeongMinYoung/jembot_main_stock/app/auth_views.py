from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.conf import settings
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from google.oauth2 import id_token
from google.auth.transport import requests
import requests as http_requests
import json
import uuid

from .models import CustomUser, ChatSession

def google_login(request):
    """구글 로그인 페이지"""
    if request.user.is_authenticated:
        return redirect('app:chatbot')
    
    # 구글 OAuth URL 생성
    google_oauth_url = f"https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        'client_id': settings.GOOGLE_OAUTH2_CLIENT_ID,
        'redirect_uri': settings.GOOGLE_OAUTH2_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'state': str(uuid.uuid4())
    }
    
    auth_url = f"{google_oauth_url}?{'&'.join([f'{k}={v}' for k, v in params.items()])}"
    
    return render(request, 'app/login.html', {'google_auth_url': auth_url})

def google_callback(request):
    """구글 OAuth 콜백 처리"""
    try:
        code = request.GET.get('code')
        if not code:
            return JsonResponse({'error': '인증 코드가 없습니다.'}, status=400)
        
        # 액세스 토큰 교환
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'client_id': settings.GOOGLE_OAUTH2_CLIENT_ID,
            'client_secret': settings.GOOGLE_OAUTH2_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.GOOGLE_OAUTH2_REDIRECT_URI,
        }
        
        token_response = http_requests.post(token_url, data=token_data)
        token_info = token_response.json()
        
        if 'error' in token_info:
            return JsonResponse({'error': '토큰 교환 실패'}, status=400)
        
        # ID 토큰 검증 (시간 여유 30초 추가)
        try:
            id_info = id_token.verify_oauth2_token(
                token_info['id_token'], 
                requests.Request(), 
                settings.GOOGLE_OAUTH2_CLIENT_ID,
                clock_skew_in_seconds=30
            )
        except ValueError as e:
            print(f"토큰 검증 오류: {e}")
            if "Token used too early" in str(e):
                return JsonResponse({'error': '시간 동기화 오류입니다. 잠시 후 다시 시도해주세요.'}, status=400)
            else:
                return JsonResponse({'error': f'토큰 검증 실패: {str(e)}'}, status=400)
        
        # 사용자 정보 추출
        google_id = id_info['sub']
        email = id_info['email']
        name = id_info.get('name', '')
        picture = id_info.get('picture', '')
        
        # 사용자 생성 또는 가져오기
        # 닉네임 생성 (이메일의 @ 앞 부분 + 고유 번호)
        base_nickname = email.split('@')[0]
        unique_nickname = base_nickname
        counter = 1
        while CustomUser.objects.filter(nickname=unique_nickname).exists():
            unique_nickname = f"{base_nickname}{counter}"
            counter += 1
        
        user, created = CustomUser.objects.get_or_create(
            google_id=google_id,
            defaults={
                'username': email,
                'email': email,
                'nickname': unique_nickname,
                'name': name if name else email.split('@')[0],
                'first_name': name.split()[0] if name else '',
                'last_name': ' '.join(name.split()[1:]) if name and len(name.split()) > 1 else '',
                'profile_picture': picture,
            }
        )
        
        if not created:
            # 기존 사용자 정보 업데이트
            user.email = email
            user.name = name if name else user.name or email.split('@')[0]
            user.first_name = name.split()[0] if name else ''
            user.last_name = ' '.join(name.split()[1:]) if name and len(name.split()) > 1 else ''
            user.profile_picture = picture
            user.save()
        
        # 로그인
        login(request, user)
        
        return redirect('app:chatbot')
        
    except Exception as e:
        return JsonResponse({'error': f'로그인 처리 중 오류가 발생했습니다: {str(e)}'}, status=500)

@login_required
def logout_view(request):
    """로그아웃"""
    logout(request)
    return redirect('app:chatbot')

@login_required
def user_profile(request):
    """사용자 프로필 페이지"""
    return render(request, 'app/profile.html', {'user': request.user})

@csrf_exempt
@login_required
def chat_sessions(request):
    """사용자의 채팅 세션 목록"""
    sessions = ChatSession.objects.filter(user=request.user, is_active=True).order_by('-updated_at')
    return JsonResponse({
        'sessions': list(sessions.values('id', 'session_id', 'title', 'created_at', 'updated_at'))
    })

@csrf_exempt
@login_required
def create_session(request):
    """새 채팅 세션 생성"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            title = data.get('title', '새로운 대화')
            
            session = ChatSession.objects.create(
                user=request.user,
                session_id=str(uuid.uuid4()),
                title=title
            )
            
            return JsonResponse({
                'success': True,
                'session': {
                    'id': session.id,
                    'session_id': session.session_id,
                    'title': session.title,
                    'created_at': session.created_at.isoformat()
                }
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'POST 요청만 허용됩니다.'}, status=405)