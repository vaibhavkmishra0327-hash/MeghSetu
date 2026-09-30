from pydantic import BaseModel,Field
class TrainRequest(BaseModel): seed:int=42; samples:int=4200
class PredictRequest(BaseModel): latitude:float=Field(ge=5,le=38); longitude:float=Field(ge=65,le=100); month:int=Field(default=7,ge=1,le=12); nwp_mm:float=Field(default=45,ge=0,le=1000); humidity:float=Field(default=75,ge=0,le=100); cape:float=Field(default=900,ge=0,le=10000); wind:float=Field(default=12,ge=0,le=150); elevation:float=Field(default=250,ge=0,le=9000)
