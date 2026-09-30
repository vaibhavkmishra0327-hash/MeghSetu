from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.api import TrainRequest,PredictRequest
from app.services.pipeline import fit_demo,FEATURES
from app.data.synthetic import REGIMES
import pandas as pd
from threading import Lock
app=FastAPI(title='MeghSetu API',version='1.0.0',description='Synthetic demo of regime-aware monsoon rainfall post-processing'); app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_methods=['*'],allow_headers=['*']); state=None
state_lock=Lock()
def get_state():
 global state
 if state is None:
  with state_lock:
   if state is None: state=fit_demo()
 return state
@app.get('/health')
def health(): return {'status':'ok','demo_mode':True}
@app.get('/metadata')
def metadata():
 s=get_state(); return {'name':'MeghSetu','demo_mode':True,'seed':s['seed'],'samples':len(s['df']),'test_samples':len(s['test']),'features':FEATURES,'regimes':REGIMES,'models':'RandomForest classifier + six RandomForest corrections + calibrated heavy-rain classifier','training_timestamp_utc':pd.Timestamp.now(tz='UTC').isoformat()}
@app.post('/generate-demo-data')
def generate(req:TrainRequest):
 global state
 if req.samples<600 or req.samples>30000: raise HTTPException(422,'samples must be between 600 and 30000')
 with state_lock: state=fit_demo(req.seed,req.samples)
 return {'samples':len(state['df']),'seed':req.seed,'metrics':state['metrics']}
@app.post('/train')
def train(req:TrainRequest): return generate(req)
@app.get('/metrics')
def metrics(): return get_state()['metrics']
@app.get('/regimes')
def regimes():
 s=get_state(); return {'counts':s['test']['predicted_regime'].value_counts().to_dict(),'importance':s['importance'],'accuracy':s['metrics']['classifier_accuracy']}
@app.get('/alerts')
def alerts(threshold:float=64.5,limit:int=25):
 if not 0<=threshold<=1000 or not 1<=limit<=200: raise HTTPException(422,'Invalid threshold or limit')
 d=get_state()['test']; out=d[d.corrected_mm>=threshold].sort_values('heavy_probability',ascending=False).head(limit); return {'threshold_mm':threshold,'items':out[['latitude','longitude','predicted_regime','nwp_mm','corrected_mm','observation_mm','error_mm','heavy_probability']].to_dict('records')}
@app.get('/forecast/{date}')
def forecast(date:str):
 try:
  parsed=pd.Timestamp(date)
  if pd.isna(parsed): raise ValueError('empty date')
 except Exception: raise HTTPException(422,'date must be ISO formatted')
 d=get_state()['test']; cols=['latitude','longitude','predicted_regime','nwp_mm','global_mm','corrected_mm','observation_mm','error_mm','heavy_probability']; return {'date':date,'units':'mm','items':d[cols].head(1600).to_dict('records')}
@app.post('/predict')
def predict(req:PredictRequest):
 s=get_state(); x={k:getattr(req,k) for k in FEATURES if hasattr(req,k)}; x.update(pressure=1005,temperature=25,monsoon_index=.7,lagged_rain_mm=req.nwp_mm*.75); f=pd.DataFrame([x],columns=FEATURES); reg=s['classifier'].predict(f)[0]; corr=float(max(0,req.nwp_mm+s['models'][reg].predict(f)[0])); prob=float(s['heavy'].predict_proba(f)[0,1]); return {'regime':reg,'raw_mm':req.nwp_mm,'corrected_mm':corr,'heavy_probability':prob,'explanation':f'{reg} selected from humidity, CAPE, winds and geography; routed to its specialist correction model.'}
@app.post('/predict/batch')
def batch(items:list[PredictRequest]):
 if len(items)>500: raise HTTPException(422,'Batch maximum is 500')
 return {'predictions':[predict(i) for i in items]}
