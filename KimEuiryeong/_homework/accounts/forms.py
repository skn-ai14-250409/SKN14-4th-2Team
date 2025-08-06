from django import forms
from .models import CustomUser

class CustomUserCreationForm(forms.ModelForm):
    """
    일반 회원가입 시 입력한 정보가 정확한지 검증하기 위함
    """
    password = forms.CharField(label='비밀번호', widget=forms.PasswordInput)
    password2 = forms.CharField(label='비밀번호 확인', widget=forms.PasswordInput)

    class Meta:
        model = CustomUser
        fields = ('username','name', 'email', 'nickname', 'profile_picture')
        # 각 필드가 화면에 표시될 이름을 지정합니다.
        labels = {
            'username': '아이디',
            'name': '이름',
            'email': '이메일',
            'nickname': '닉네임',
            'profile_picture': '프로필 사진 (선택)',
        }

    def clean_password2(self):
        cd = self.cleaned_data
        if cd['password'] != cd['password2']:
            raise forms.ValidationError('비밀번호가 일치하지 않습니다.')
        return cd['password2']

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user
