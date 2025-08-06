from django.shortcuts import render, redirect
from django.contrib.auth import login, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
import json
from .forms import CustomUserCreationForm
from allauth.account.forms import LoginForm

User = get_user_model()

def home_view(request):
    """
    로그인 전용 페이지를 보여주는 뷰입니다.
    사용자가 이미 로그인한 상태라면 프로필 페이지로 이동시킵니다.
    로그인 폼 처리는 allauth가 담당합니다.
    """
    if request.user.is_authenticated:
        return redirect('accounts:account_profile')
        
    form = LoginForm()
    return render(request, 'layout/home.html', {'form': form})

def signup_view(request):
    """
    일반 회원가입 페이지를 보여주고, 폼 제출(POST 요청)을 처리하는 뷰입니다.
    회원가입 성공 시, 자동 로그인 후 프로필 페이지로 이동합니다.
    """
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST, request.FILES)
        if form.is_valid():
            user = form.save()
            # 회원가입 후 자동 로그인 처리
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            # 여기도 함께 수정
            return redirect('accounts:account_profile')
    else:
        # GET 요청 시, 빈 회원가입 폼을 생성합니다.
        form = CustomUserCreationForm()
    
    # app/signup.html 템플릿에 폼을 전달하여 렌더링합니다.
    return render(request, 'app/signup.html', {'form': form})


@login_required
def mypage_view(request):
    """
    프로필(마이페이지) 뷰입니다.
    @login_required 데코레이터가 로그인하지 않은 사용자의 접근을 막고
    로그인 페이지로 보냅니다.
    """
    user = request.user
    # 템플릿 파일 이름이 profile.html로 변경된 것을 반영
    return render(request, 'app/profile.html', {'user': user})


@login_required
def update_email(request):
    """
    AJAX 요청을 통한 이메일 업데이트
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_email = data.get('email', '').strip()
            
            if not new_email:
                return JsonResponse({'success': False, 'error': '이메일을 입력해주세요.'})
            
            # 현재 사용자와 같은 이메일인지 확인
            if new_email == request.user.email:
                return JsonResponse({'success': False, 'error': '현재 이메일과 동일합니다.'})
            
            # 이미 존재하는 이메일인지 확인
            if User.objects.filter(email=new_email).exists():
                return JsonResponse({'success': False, 'error': '이미 사용 중인 이메일입니다.'})
            
            # 이메일 업데이트
            request.user.email = new_email
            request.user.save()
            
            return JsonResponse({'success': True, 'message': '이메일이 성공적으로 변경되었습니다.'})
            
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': '서버 오류가 발생했습니다.'})
    
    return JsonResponse({'success': False, 'error': '잘못된 요청 방법입니다.'})


@login_required
def update_password(request):
    """
    AJAX 요청을 통한 비밀번호 업데이트
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_password = data.get('password', '').strip()
            
            if not new_password:
                return JsonResponse({'success': False, 'error': '비밀번호를 입력해주세요.'})
            
            if len(new_password) < 8:
                return JsonResponse({'success': False, 'error': '비밀번호는 8자 이상이어야 합니다.'})
            
            # 비밀번호 업데이트
            request.user.set_password(new_password)
            request.user.save()
            
            # 세션 유지 (비밀번호 변경 후 로그아웃 방지)
            update_session_auth_hash(request, request.user)
            
            return JsonResponse({'success': True, 'message': '비밀번호가 성공적으로 변경되었습니다.'})
            
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': '서버 오류가 발생했습니다.'})
    
    return JsonResponse({'success': False, 'error': '잘못된 요청 방법입니다.'})


@login_required
def update_nickname(request):
    """
    AJAX 요청을 통한 닉네임 업데이트
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_nickname = data.get('nickname', '').strip()
            
            if not new_nickname:
                return JsonResponse({'success': False, 'error': '닉네임을 입력해주세요.'})
            
            if len(new_nickname) < 2:
                return JsonResponse({'success': False, 'error': '닉네임은 2자 이상이어야 합니다.'})
            
            if len(new_nickname) > 20:
                return JsonResponse({'success': False, 'error': '닉네임은 20자 이하여야 합니다.'})
            
            # 현재 사용자와 같은 닉네임인지 확인
            if new_nickname == request.user.nickname:
                return JsonResponse({'success': False, 'error': '현재 닉네임과 동일합니다.'})
            
            # 이미 존재하는 닉네임인지 확인
            if User.objects.filter(nickname=new_nickname).exists():
                return JsonResponse({'success': False, 'error': '이미 사용 중인 닉네임입니다.'})
            
            # 닉네임 업데이트
            request.user.nickname = new_nickname
            request.user.save()
            
            return JsonResponse({'success': True, 'message': '닉네임이 성공적으로 변경되었습니다.'})
            
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': '서버 오류가 발생했습니다.'})
    
    return JsonResponse({'success': False, 'error': '잘못된 요청 방법입니다.'})
