from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from .forms import CustomUserCreationForm
from allauth.account.forms import LoginForm

def home_view(request):
    """
    로그인 전용 페이지를 보여주는 뷰입니다.
    사용자가 이미 로그인한 상태라면 프로필 페이지로 이동시킵니다.
    로그인 폼 처리는 allauth가 담당합니다.
    """
    if request.user.is_authenticated:
        return redirect('accounts:account_profile')
        
    form = LoginForm()
    return render(request, 'home.html', {'form': form})

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
