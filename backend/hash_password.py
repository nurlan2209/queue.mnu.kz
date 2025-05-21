from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
password = "sanjar955"
hashed_password = pwd_context.hash(password)
print(hashed_password)