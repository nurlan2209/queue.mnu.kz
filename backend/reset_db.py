from app.database import engine, Base
from app.models.queue import QueueEntry
from app.models.user import User

def reset_database():
    print("Удаляем все таблицы...")
    Base.metadata.drop_all(bind=engine)

    print("Создаём все таблицы заново...")
    Base.metadata.create_all(bind=engine)

    print("Готово!")

if __name__ == "__main__":
    reset_database()