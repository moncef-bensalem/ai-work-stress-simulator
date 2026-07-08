from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str = "user"

    model_config = {"from_attributes": True}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class GoogleAuthRequest(BaseModel):
    credential: str


class WebAuthnLoginRequest(BaseModel):
    email: EmailStr
    credential_id: str
    authenticator_data: str
    client_data_json: str
    signature: str


class FaceDescriptorRequest(BaseModel):
    descriptor: list[float] = Field(min_length=128, max_length=128)


class FaceLoginRequest(BaseModel):
    email: EmailStr
    descriptor: list[float] = Field(min_length=128, max_length=128)


class FaceStatusResponse(BaseModel):
    registered: bool
