from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import CustomUserCreationForm, CustomUserChangeForm
from allauth.account.forms import LoginForm

def home_view(request):
    """
    로그인 페이지를 보여주고, 로그인 요청(POST)을 직접 처리하는 뷰입니다.
    사용자가 이미 로그인한 상태라면 메인 페이지로 이동시킵니다.
    """
    if request.user.is_authenticated:
        return redirect('app:main')  # _homework 프로젝트의 메인 페이지로 변경

    if request.method == 'POST':
        form = LoginForm(request=request, data=request.POST) # <--- 이렇게 수정
        if form.is_valid():
            # 폼 데이터가 유효하면 사용자를 로그인시킵니다.
            user = form.user
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            return redirect('app:main')  # _homework 프로젝트의 메인 페이지로 변경
    
    else:
        form = LoginForm()
        
    return render(request, 'home.html', {'form': form})

def signup_view(request):
    """
    일반 회원가입 페이지를 보여주고, 폼 제출(POST 요청)을 처리하는 뷰입니다.
    회원가입 성공 시, 자동 로그인 후 메인 페이지로 이동합니다.
    """
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST, request.FILES)
        if form.is_valid():
            user = form.save()
            # 회원가입 후 자동 로그인 처리
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            # 여기도 함께 수정
            return redirect('app:main')  # _homework 프로젝트의 메인 페이지로 변경
    else:
        # GET 요청 시, 빈 회원가입 폼을 생성합니다.
        form = CustomUserCreationForm()
    
    # account/signup.html 템플릿에 폼을 전달하여 렌더링합니다.
    return render(request, 'account/signup.html', {'form': form})


@login_required
def mypage_view(request):
    """
    프로필(마이페이지) 뷰입니다.
    @login_required 데코레이터가 로그인하지 않은 사용자의 접근을 막고
    로그인 페이지로 보냅니다.
    """
    user = request.user
    # 템플릿 파일 이름이 profile.html로 변경된 것을 반영
    return render(request, 'account/profile.html', {'user': user})

@login_required
def profile_edit_view(request):
    """
    프로필 수정 뷰입니다.
    """
    if request.method == 'POST':
        form = CustomUserChangeForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            try:
                # Django의 기본 save 메서드 사용
                form.save()
                # 메시지 표시하지 않음
                return redirect('accounts:account_profile')
            except Exception as e:
                print(f"프로필 수정 중 오류 발생: {e}")
                messages.error(request, '프로필 수정 중 오류가 발생했습니다.')
    else:
        form = CustomUserChangeForm(instance=request.user)
    
    return render(request, 'account/profile_edit.html', {'form': form}) 