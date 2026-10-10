from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base


class UserStation(Base):
    __tablename__ = "user_stations"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    station_id = Column(Integer, ForeignKey("sites.id", ondelete="CASCADE"), primary_key=True)
