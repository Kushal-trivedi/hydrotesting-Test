from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SiteBase(BaseModel):
    code: str
    name: str
    city: str
    state: str = "Gujarat"

class SiteCreate(SiteBase):
    pass

class SiteResponse(SiteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    asset_count: int = 0

    model_config = ConfigDict(from_attributes=True)
